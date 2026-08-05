// src/routes/api/chat/+server.ts

import { json, type RequestHandler } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { createHmac, timingSafeEqual } from 'node:crypto';

import { PROMPT, searchProductsForAi } from '$lib/server/prompt';
import { GEMINI_KEY, CHAT_LIMIT_SECRET } from '$env/static/private';

// Import Google Gen AI SDK
import { GoogleGenAI, Type, type Content, type FunctionResponse } from '@google/genai';

const CHAT_LIMIT_COOKIE = 'tmx_chat_limit';

const MAX_AI_PROMPTS = 10;
const LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const COOKIE_MAX_AGE_SECONDS = 24 * 60 * 60;

// Initialize the Google Gen AI Client
const ai = new GoogleGenAI({
	apiKey: GEMINI_KEY
});

// Using a standard high-efficiency Gemini model
const MODEL = 'gemini-2.5-flash';

type ChatMessage = {
	role: 'user' | 'assistant' | 'system';
	content: string;
};

type ChatLimitPayload = {
	count: number;
	resetAt: number;
};

function base64url(value: string) {
	return Buffer.from(value).toString('base64url');
}

function fromBase64url(value: string) {
	return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(value: string) {
	return createHmac('sha256', CHAT_LIMIT_SECRET).update(value).digest('base64url');
}

function makeSignedCookie(payload: ChatLimitPayload) {
	const encodedPayload = base64url(JSON.stringify(payload));
	const signature = sign(encodedPayload);

	return `${encodedPayload}.${signature}`;
}

function readSignedCookie(cookieValue: string | undefined): ChatLimitPayload | null {
	if (!cookieValue) return null;

	const [encodedPayload, signature] = cookieValue.split('.');

	if (!encodedPayload || !signature) return null;

	const expectedSignature = sign(encodedPayload);

	const signatureBuffer = Buffer.from(signature);
	const expectedBuffer = Buffer.from(expectedSignature);

	if (
		signatureBuffer.length !== expectedBuffer.length ||
		!timingSafeEqual(signatureBuffer, expectedBuffer)
	) {
		return null;
	}

	try {
		return JSON.parse(fromBase64url(encodedPayload)) as ChatLimitPayload;
	} catch {
		return null;
	}
}

function checkAndUpdateChatLimit(cookies: import('@sveltejs/kit').Cookies) {
	const now = Date.now();

	const existing = readSignedCookie(cookies.get(CHAT_LIMIT_COOKIE));

	let payload: ChatLimitPayload;

	if (!existing || existing.resetAt <= now) {
		payload = {
			count: 1,
			resetAt: now + LIMIT_WINDOW_MS
		};
	} else {
		if (existing.count >= MAX_AI_PROMPTS) {
			return {
				allowed: false,
				remaining: 0,
				resetAt: existing.resetAt
			};
		}

		payload = {
			count: existing.count + 1,
			resetAt: existing.resetAt
		};
	}

	cookies.set(CHAT_LIMIT_COOKIE, makeSignedCookie(payload), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: COOKIE_MAX_AGE_SECONDS
	});

	return {
		allowed: true,
		remaining: MAX_AI_PROMPTS - payload.count,
		resetAt: payload.resetAt
	};
}

// Map tools to Gemini's Function Declarations schema
const tools = [
	{
		functionDeclarations: [
			{
				name: 'searchProductsForAi',
				description:
					'Search the public Dana Steel Factory product catalog (PPGI/GI sheets, roofing tiles, ridge caps, flashings, gutters). Use only for Dana Steel product-related questions such as availability, prices, specs, categories, and recommendations.',
				parameters: {
					type: Type.OBJECT,
					properties: {
						query: {
							type: Type.STRING,
							description:
								'The product search query, for example "PPGI", "roofing tile", "gutter", "RAL 3000".'
						},
						categoryName: {
							type: Type.STRING,
							description:
								'Optional product category name, for example "PPGI sheets", "GI sheets", "Roofing tiles", "Flashings", "Gutters".'
						},
						thickness: {
							type: Type.STRING,
							description: 'Optional thickness text to filter by, for example "0.4mm" or "0.5".'
						},
						inStockOnly: {
							type: Type.BOOLEAN,
							description: 'Whether to return only products that appear to be in stock.'
						},
						limit: {
							type: Type.INTEGER,
							description: 'Maximum number of products to return. Must be between 1 and 8.'
						}
					}
				}
			}
		]
	}
];

function cleanToolArgs(args: any) {
	if (!args || typeof args !== 'object') {
		return {};
	}

	return {
		query: typeof args.query === 'string' ? args.query : undefined,
		categoryName: typeof args.categoryName === 'string' ? args.categoryName : undefined,
		thickness: typeof args.thickness === 'string' ? args.thickness : undefined,
		inStockOnly: typeof args.inStockOnly === 'boolean' ? args.inStockOnly : undefined,
		limit:
			typeof args.limit === 'number' ? Math.max(1, Math.min(8, Math.floor(args.limit))) : undefined
	};
}

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { messages } = (await request.json()) as {
			messages: ChatMessage[];
		};

		if (!Array.isArray(messages)) {
			return json({ error: 'Invalid messages format.' }, { status: 400 });
		}

		const limit = checkAndUpdateChatLimit(cookies);

		if (!limit.allowed) {
			return json(
				{
					error: 'You have reached the chat limit for this device. Please try again later.',
					resetAt: new Date(limit.resetAt).toISOString()
				},
				{ status: 429 }
			);
		}

		// Keep last 10 messages and transform OpenAI format to Gemini 'Content' format
		const safeMessages = messages
			.filter((message) => message.role === 'user' || message.role === 'assistant')
			.slice(-10);

		const contents: Content[] = safeMessages.map((message) => ({
			role: message.role === 'assistant' ? 'model' : 'user',
			parts: [{ text: message.content }]
		}));

		/**
		 * First request:
		 * Send history and configurations to Gemini.
		 */
		const firstResponse = await ai.models.generateContent({
			model: MODEL,
			contents: contents,
			config: {
				systemInstruction: PROMPT,
				tools: tools
			}
		});

		const functionCalls = firstResponse.functionCalls;

		/**
		 * If Gemini did not call a function, return the final text response.
		 */
		if (!functionCalls || functionCalls.length === 0) {
			return json({
				reply: firstResponse.text || 'Sorry, I could not answer that right now.'
			});
		}

		/**
		 * To chain a multi-turn conversation back to Gemini with function tool execution,
		 * we append both the model's structure generation output and our function call output.
		 */
		const followUpContents = [...contents];

		// 1. Append the model's turnaround containing the function call requests
		if (firstResponse.candidates?.[0]?.content) {
			followUpContents.push(firstResponse.candidates[0].content);
		}

		const functionResponses: FunctionResponse[] = [];

		for (const call of functionCalls) {
			if (call.name !== 'searchProductsForAi') {
				functionResponses.push({
					name: call.name,
					response: { error: 'Unknown function call.' }
				});
				continue;
			}

			try {
				const args = cleanToolArgs(call.args);
				const result = await searchProductsForAi(args);

				functionResponses.push({
					name: call.name,
					response: { result: result }
				});
			} catch (error) {
				console.error('searchProductsForAi failed:', error);
				functionResponses.push({
					name: call.name,
					response: {
						error:
							'Product search failed. Tell the user to visit the Shop page or contact Dana Steel Factory support.'
					}
				});
			}
		}

		// 2. Append the execution output to the conversation history under the 'function' role
		followUpContents.push({
			role: 'function',
			parts: functionResponses.map((res) => ({ functionResponse: res }))
		});

		/**
		 * Second request:
		 * Provide the tool outputs so Gemini can form its final string.
		 */
		const finalResponse = await ai.models.generateContent({
			model: MODEL,
			contents: followUpContents,
			config: {
				systemInstruction: PROMPT,
				tools: tools
			}
		});

		return json({
			reply: finalResponse.text || 'Sorry, I could not answer that right now.'
		});
	} catch (error) {
		console.error(error);

		return json(
			{
				error: 'Something went wrong while sending your message.'
			},
			{ status: 500 }
		);
	}
};
