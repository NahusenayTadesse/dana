import { superValidate, message, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { sendEmail, customerCheckoutTemplate, adminCheckoutTemplate } from '$lib/server/email';

import { SECRET_KEY, USER } from '$env/static/private';
import { Chapa } from 'chapa-nodejs';

import { redirect } from '@sveltejs/kit';

const chapa = new Chapa({
	secretKey: SECRET_KEY
});

import { addUser, loginSchema } from '$lib/ZodSchema';
import { add } from './schema';
import { db } from '$lib/server/db';
import { orders, orderItems, products, customers, transactions } from '$lib/server/db/schema';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(add));
	const signupForm = await superValidate(zod4(addUser));
	const loginForm = await superValidate(zod4(loginSchema));

	return {
		form,
		signupForm,
		loginForm
	};
};

export const actions: Actions = {
	add: async ({ request, locals, url }) => {
		const form = await superValidate(request, zod4(add));
		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for Errors' },
				{ status: 400 }
			);
		}

		const { name, email, phone, selectedProducts, payWithChapa } = form.data;
		let checkoutUrl: string | null = null;

		let transactionId;
		let txnRef;
		let productNames;
		let customerInfo;

		let newOrderId;

		const total = selectedProducts.reduce((acc, p) => acc + p.price * p.quantity, 0);

		try {
			await db.transaction(async (tx) => {
				if (locals?.user) {
					const customer = await tx
						.select({
							value: customers.id,
							email: customers.email,
							name: customers.name,
							phone: customers.phone
						})
						.from(customers)
						.where(eq(customers.userId, locals?.user?.id))
						.limit(1)
						.then((rows) => rows[0]);

					customerInfo = customer;
				} else {
					const doesCustomerExist = await tx
						.select({
							value: customers.id,
							email: customers.email,
							name: customers.name,
							phone: customers.phone
						})
						.from(customers)
						.where(eq(customers.email, email))
						.limit(1)
						.then((rows) => rows[0]);

					if (doesCustomerExist) {
						customerInfo = doesCustomerExist;
					} else {
						const newCustomer = await tx
							.insert(customers)
							.values({ name, email, phone })
							.$returningId();
						customerInfo = newCustomer[0];
					}
				}

				const getProducts = await tx
					.select({
						productId: products.id,
						name: products.name
					})
					.from(products)
					.where(
						eq(
							products.id,
							inArray(
								products.id,
								selectedProducts.map((product) => product.product)
							)
						)
					);

				productNames = getProducts;

				console.log('CUSTOMER INFO', customerInfo);

				const [transaction] = await tx
					.insert(transactions)
					.values({ amount: String(total), paymentStatus: 'pending' })
					.$returningId();
				transactionId = transaction.id;

				const [orderId] = await tx
					.insert(orders)
					.values({ customerId: customerInfo?.value, status: 'pending', transactionId })
					.$returningId();
				newOrderId = orderId.id;

				if (selectedProducts.length) {
					await tx.insert(orderItems).values(
						selectedProducts.map((product) => ({
							orderId: orderId.id,
							productId: Number(product.product),
							amount: product.amount,
							quantity: Number(product.quantity),
							price: Number(product.price)
						}))
					);
				}
			});

			if (payWithChapa) {
				// Generate transaction reference using our utility method or provide your own
				const tx_ref = await chapa.genTxRef();

				txnRef = tx_ref;

				const siteOrigin = url.origin;

				const rawPayload = `${txnRef}||${newOrderId}`;

				// 2. Convert to Base64 and make it URL-safe (replace +, /, and =)
				const obfuscatedToken = btoa(rawPayload)
					.replace(/\+/g, '-')
					.replace(/\//g, '_')
					.replace(/=+$/, '');

				const res = await fetch('https://api.chapa.co/v1/transaction/initialize', {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${SECRET_KEY}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						amount: String(total),
						currency: 'ETB',
						email: customerInfo?.email,
						first_name: customerInfo?.name.split(' ')[0],
						last_name: customerInfo?.name.split(' ')[1],
						tx_ref,
						callback_url: `${siteOrigin}/checkout/${obfuscatedToken}`,
						return_url: `${siteOrigin}/checkout/${obfuscatedToken}`,
						customization: {
							title: 'dana Electronics',
							description: `Payment for ${total} ETB for ${selectedProducts.length} ${productNames?.map((p) => p.name).join(', ')}`
						}
					})
				});

				const data = await res.json();

				if (!res.ok || !data?.data?.checkout_url) {
					console.error('Chapa API Error:', data);
					return message(
						form,
						{ type: 'error', text: data?.message || 'Payment initialization failed.' },
						{ status: 400 }
					);
				}

				// 2. If we reach here, data.checkout_url definitely exists
				checkoutUrl = data.data.checkout_url;
			}
		} catch (err) {
			console.error('FULL ERROR', err);

			return message(
				form,
				{
					type: 'error',
					text: 'Error Adding Orders: ' + err?.message
				},
				{ status: 500 }
			);
		}

		sendEmail(
			customerInfo?.email,
			customerCheckoutTemplate(newOrderId, selectedProducts, total).subject,
			customerCheckoutTemplate(newOrderId, selectedProducts, total).html
		).catch((err) => console.error('Email Error (Customer):', err));

		// Send to Admin
		sendEmail(
			USER,
			adminCheckoutTemplate(newOrderId, selectedProducts, total).subject,
			adminCheckoutTemplate(newOrderId, selectedProducts, total).html
		).catch((err) => console.error('Email Error (Admin):', err));
		if (checkoutUrl) {
			redirect(303, checkoutUrl);
		}

		return message(form, { type: 'success', text: 'Order Successfully Added' });
	}
};

function getPrice(list: Array<{ value: number; price: string }>, value: number): number {
	const item = list.find((i) => i.value === value);
	return item ? Number(item.price) : 0;
}

function normalizeEthiopianPhone(phone) {
	if (!phone) return phone;

	const cleaned = String(phone).trim();

	// Leave numbers that already start with 09 or 07 unchanged
	if (cleaned.startsWith('09') || cleaned.startsWith('07')) {
		return cleaned;
	}

	// Convert +251xxxxxxxxx to 0xxxxxxxxx
	if (cleaned.startsWith('+251')) {
		return '0' + cleaned.slice(4);
	}

	return cleaned;
}
