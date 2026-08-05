import nodemailer from 'nodemailer';

import { SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_PORT, SMS_KEY } from '$env/static/private';

const transporter = nodemailer.createTransport({
	host: SMTP_HOST,
	port: SMTP_PORT,
	secure: true,
	auth: {
		user: SMTP_USER,
		pass: SMTP_PASSWORD
	}
});

// --- SMS (GeezSMS) ---
const SMS_API_URL = 'https://api.geezsms.com/api/v1/sms/send';

/**
 * Strips HTML down to plain text for SMS readers (which don't render markup):
 * - drops script/style blocks entirely (incl. their content)
 * - turns block-level tags into line breaks so text doesn't run together
 * - removes remaining tags
 * - decodes the handful of HTML entities used in these templates
 * - collapses whitespace and trims to GeezSMS's 335-char limit
 */
const stripHtml = (html: string) => {
	const text = html
		.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
		.replace(/<\/(p|div|tr|table|h[1-6]|li)>/gi, '\n')
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<[^>]+>/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/[ \t]+/g, ' ')
		.replace(/\n\s*\n+/g, '\n')
		.trim();

	return text.length > 335 ? text.slice(0, 335) : text;
};

/**
 * Sends an SMS via GeezSMS.
 * - phone must start with 2519 (per GeezSMS requirements)
 * - msg must be < 335 characters
 * Failures are logged but never thrown, so SMS issues never break email flows.
 */



interface PhoneValidationResult {
    isValid: boolean;
    formattedPhone: string | null;
    error?: string;
}

/**
 * Normalizes Ethiopian phone numbers into '251...' format and validates length/prefix.
 *
 * Handles inputs like:
 * - '0912345678'  -> '251912345678'
 * - '0712345678'  -> '251712345678'
 * - '+251912345678' -> '251912345678'
 * - '251912345678'  -> '251912345678'
 * - '912345678'   -> '251912345678'
 */
export const formatAndValidateEthPhone = (phone: string): PhoneValidationResult => {
    if (!phone) {
        return { isValid: false, formattedPhone: null, error: 'Phone number is empty' };
    }

    // Remove all non-numeric characters (spaces, +, -, etc.)
    let cleaned = phone.replace(/\D/g, '');

    // Convert local prefix (09... or 07...) -> 2519... or 2517...
    if (cleaned.startsWith('0')) {
        cleaned = '251' + cleaned.slice(1);
    }
    // Convert 9-digit local input missing leading zero (e.g., 912345678)
    else if (cleaned.length === 9 && (cleaned.startsWith('9') || cleaned.startsWith('7'))) {
        cleaned = '251' + cleaned;
    }

    // Ethiopian mobile numbers must be 12 digits long in international format (251 + 9 digits)
    // and must start with either 2519 (Ethio Telecom) or 2517 (Safaricom)
    const ethMobileRegex = /^251(9|7)\d{8}$/;

    if (!ethMobileRegex.test(cleaned)) {
        return {
            isValid: false,
            formattedPhone: null,
            error: 'Invalid Ethiopian mobile number (must start with 2519 or 2517 and be 12 digits total)'
        };
    }

    return {
        isValid: true,
        formattedPhone: cleaned
    };
};
export const sendSms = async (phone: string, msg: string) => {
	try {
		if (!phone) return { success: false, message: 'No phone number provided' };

		const body = new URLSearchParams();
		body.append('token', SMS_KEY);
		body.append('phone', phone);
		body.append('msg', msg);

		const res = await fetch(SMS_API_URL, {
			method: 'POST',
			body
		});

		const data = await res.json();

		if (data.message_status !== 'success') {
			console.error('SMS send failed:', data);
			return { success: false, message: data };
		} 

        console.log(data)

		return { success: true, message: data };
	} catch (err) {
		console.error('SMS send error:', err);
		return { success: false, message: err };
	}
};

// `smsText` lets callers pass a purpose-built, concise message (e.g. just
// unit price/total/VAT + a link) for emails whose full HTML — a detailed
// item table with VAT/withholding breakdowns — would be unreadable once
// blindly stripped down to plain text. Falls back to auto-stripping the html
// when no dedicated SMS copy is given (simple notifications only).
export const sendEmail = async (to: string, subject: string, html: string, phone?: string, smsText?: string) => {
	await transporter.sendMail({
		from: `"Support Team" <${SMTP_USER}>`,
		to,
		subject,
		html
	});

	if (phone) {
		const newPhone = formatAndValidateEthPhone(phone);
		if (newPhone.isValid) await sendSms(String(newPhone?.formattedPhone), smsText ?? stripHtml(html));
	}
};

// --- Brand constants ---
const BRAND_NAME = 'Dana Steel';
const BRAND_URL = 'http://dsfet.com/';
const BRAND_LOGO = 'http://dsfet.com/logo192.png';
const BRAND_PRIMARY = '#3C74FF';
const BRAND_PRIMARY_DARK = '#1B3A8C';
const BRAND_HEADER_BG = `linear-gradient(135deg, ${BRAND_PRIMARY} 0%, ${BRAND_PRIMARY_DARK} 100%)`;

const generateOrderTable = (items) => {
	const rows = items
		.map((item) => {
			let variation = '';
			let price = 0;

			// Case 1: price exists explicitly
			if (typeof item.price === 'number') {
				price = item.price;
				variation = item.amount;
			}
			// Case 2: amount = "price variation"
			else if (typeof item.amount === 'string') {
				const parts = item.amount.split(' ');
				price = Number(parts[0]) || 0;
				variation = parts.slice(1).join(' ') || '';
			}

			return `
                 <tr style="border-bottom: 1px solid #eee;">
                     <td style="padding: 10px; text-align: left;">
                         Product #${item.product} ${variation ? `(${variation})` : ''}
                     </td>
                     <td style="padding: 10px; text-align: center;">
                         ${item.quantity}
                     </td>
                     <td style="padding: 10px; text-align: right;">
                         ${price} ETB
                     </td>
                 </tr>
             `;
		})
		.join('');
	return `
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-family: sans-serif;">
            <thead>
                <tr style="background: ${BRAND_HEADER_BG}; color: white;">
                    <th style="padding: 10px; text-align: left;">Item</th>
                    <th style="padding: 10px; text-align: center;">Qty</th>
                    <th style="padding: 10px; text-align: right;">Price</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
};

// Quote items don't carry a confirmed price the way order items do, so this
// table is deliberately labeled "Est. Price" and never sums to a hard total.
const generateQuoteTable = (items) => {
	const rows = items
		.map((item) => {
			let variation = '';
			let price = 0;

			if (typeof item.price === 'number') {
				price = item.price;
				variation = item.amount;
			} else if (typeof item.amount === 'string') {
				const parts = item.amount.split(' ');
				price = Number(parts[0]) || 0;
				variation = parts.slice(1).join(' ') || '';
			}

			return `
                 <tr style="border-bottom: 1px solid #eee;">
                     <td style="padding: 10px; text-align: left;">
                         Product #${item.product} ${variation ? `(${variation})` : ''}
                     </td>
                     <td style="padding: 10px; text-align: center;">
                         ${item.quantity}
                     </td>
                     <td style="padding: 10px; text-align: right;">
                         ${price ? `${price} ETB` : '—'}
                     </td>
                 </tr>
             `;
		})
		.join('');
	return `
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-family: sans-serif;">
            <thead>
                <tr style="background: ${BRAND_HEADER_BG}; color: white;">
                    <th style="padding: 10px; text-align: left;">Item</th>
                    <th style="padding: 10px; text-align: center;">Qty</th>
                    <th style="padding: 10px; text-align: right;">Est. Price</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
};

export const customerCheckoutTemplate = (orderId, items, total) => ({
	subject: `Order Confirmed - ${BRAND_NAME} (#${orderId})`,
	html: `
        <div style="max-width: 600px; margin: auto; font-family: sans-serif; border: 1px solid #eee;">
            <div style="background: ${BRAND_HEADER_BG}; padding: 20px; text-align: center;">
                <img src="${BRAND_LOGO}" alt="${BRAND_NAME} Logo" width="80" style="display: block; margin: 0 auto 10px;">
                <h1 style="color: white; margin: 0; font-size: 20px;">Order Confirmed!</h1>
            </div>
            <div style="padding: 20px; color: #333;">
                <p>We've received your order <strong>#${orderId}</strong>. Our team is now processing your order with care.</p>
                ${generateOrderTable(items)}
                <div style="text-align: right; margin-top: 15px; font-weight: bold; font-size: 1.2em;">
                    Total: ${total} ETB
                </div>
            </div>
            <div style="background: #f9f9f9; padding: 15px; text-align: center; color: #777; font-size: 12px;">
                ${BRAND_NAME} | <a href="${BRAND_URL}" style="color: ${BRAND_PRIMARY}; text-decoration: none;">${BRAND_URL}</a>
            </div>
        </div>
    `
});

export const adminCheckoutTemplate = (orderId, items, total) => ({
	subject: `New Order Alert: #${orderId}`,
	html: `
        <div style="font-family: sans-serif; color: #333;">
            <h2 style="color: ${BRAND_PRIMARY_DARK};">New Order Received</h2>
            <p>A new order has been placed on the website. <strong>Order ID: #${orderId}</strong></p>
            ${generateOrderTable(items)}
            <p style="font-size: 18px;"><strong>Total Revenue: ${total} ETB</strong></p>
            <a href="${BRAND_URL}dashboard/orders"
               style="background: ${BRAND_HEADER_BG}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
               View in Dashboard
            </a>
        </div>
    `
});

// --- Quote request templates ---

export const customerQuoteTemplate = (quoteIds: number[], items) => {
	const idLabel = quoteIds.length > 1 ? quoteIds.map((id) => `#${id}`).join(', ') : `#${quoteIds[0]}`;
	return {
		subject: `Quote Request Received - ${BRAND_NAME} (${idLabel})`,
		html: `
        <div style="max-width: 600px; margin: auto; font-family: sans-serif; border: 1px solid #eee;">
            <div style="background: ${BRAND_HEADER_BG}; padding: 20px; text-align: center;">
                <img src="${BRAND_LOGO}" alt="${BRAND_NAME} Logo" width="80" style="display: block; margin: 0 auto 10px;">
                <h1 style="color: white; margin: 0; font-size: 20px;">Quote Request Received</h1>
            </div>
            <div style="padding: 20px; color: #333;">
                <p>Thanks for reaching out to <strong>${BRAND_NAME}</strong>. We've received your quote request <strong>${idLabel}</strong> for the items below.</p>
                ${generateQuoteTable(items)}
                <p style="margin-top: 20px;">
                    Our sales team will review your request and follow up shortly with confirmed pricing and availability.
                </p>
                <p style="margin-top: 20px;">
                    Best regards,<br/>
                    <strong>${BRAND_NAME} Team</strong>
                </p>
            </div>
            <div style="background: #f9f9f9; padding: 15px; text-align: center; color: #777; font-size: 12px;">
                ${BRAND_NAME} | <a href="${BRAND_URL}" style="color: ${BRAND_PRIMARY}; text-decoration: none;">${BRAND_URL}</a>
            </div>
        </div>
    `
	};
};

export const adminQuoteTemplate = (quoteIds: number[], items) => {
	const idLabel = quoteIds.length > 1 ? quoteIds.map((id) => `#${id}`).join(', ') : `#${quoteIds[0]}`;
	return {
		subject: `New Quote Request: ${idLabel}`,
		html: `
        <div style="font-family: sans-serif; color: #333;">
            <h2 style="color: ${BRAND_PRIMARY_DARK};">New Quote Request Received</h2>
            <p>A new quote request has been submitted on the website. <strong>Request ID(s): ${idLabel}</strong></p>
            ${generateQuoteTable(items)}
            <a href="${BRAND_URL}dashboard/quotes"
               style="background: ${BRAND_HEADER_BG}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px;">
               View in Dashboard
            </a>
        </div>
    `
	};
};

export const customerWelcomeTemplate = (name: string) => ({
	subject: `Welcome to ${BRAND_NAME}, ${name}! 🎉`,
	html: `
        <div style="max-width: 600px; margin: auto; font-family: sans-serif; border: 1px solid #eee;">

            <!-- Header -->
            <div style="background: ${BRAND_HEADER_BG}; padding: 20px; text-align: center;">
                <img src="${BRAND_LOGO}"
                     alt="${BRAND_NAME} Logo"
                     width="80"
                     style="display: block; margin: 0 auto 10px;">
                <h1 style="color: white; margin: 0; font-size: 20px;">
                    Welcome to ${BRAND_NAME}!
                </h1>
            </div>

            <!-- Body -->
            <div style="padding: 20px; color: #333;">
                <p>Hi <strong>${name}</strong>,</p>

                <p>
                    We're excited to have you join <strong>${BRAND_NAME}</strong>.
                    You're now part of a community that values reliable, high-quality steel products.
                </p>

                <p>
                    You can now explore our full range of products designed for performance and durability.
                </p>

                <div style="text-align: center; margin: 25px 0;">
                    <a href="${BRAND_URL}"
                       style="background: ${BRAND_HEADER_BG}; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                        Start Shopping
                    </a>
                </div>

                <p>
                    If you have any questions, feel free to reply to this email — our team is ready to assist before and after purchase.
                </p>

                <p style="margin-top: 20px;">
                    Warm regards,<br/>
                    <strong>${BRAND_NAME} Team</strong>
                </p>
            </div>

            <!-- Footer -->
            <div style="background: #f9f9f9; padding: 15px; text-align: center; color: #777; font-size: 12px;">
                ${BRAND_NAME} | <a href="${BRAND_URL}" style="color: ${BRAND_PRIMARY}; text-decoration: none;">${BRAND_URL}</a>
            </div>
        </div>
    `
});

export const customerDeliveredTemplate = (orderId, items, total) => ({
	subject: `Your Order Has Been Delivered! (#${orderId})`,
	html: `
        <div style="max-width: 600px; margin: auto; font-family: sans-serif; border: 1px solid #eee;">

            <!-- Header -->
            <div style="background: ${BRAND_HEADER_BG}; padding: 20px; text-align: center;">
                <img src="${BRAND_LOGO}"
                     alt="${BRAND_NAME} Logo"
                     width="80"
                     style="display: block; margin: 0 auto 10px;">
                <h1 style="color: white; margin: 0; font-size: 20px;">
                    Order Delivered 🎉
                </h1>
            </div>

            <!-- Body -->
            <div style="padding: 20px; color: #333;">
                <p>Your order <strong>#${orderId}</strong> has been successfully delivered.</p>

                <p>We hope your new products serve you well! 😊</p>

                ${generateOrderTable(items)}

                <div style="text-align: right; margin-top: 15px; font-weight: bold; font-size: 1.2em;">
                    Total: ${total} ETB
                </div>

                <p style="margin-top: 20px;">
                    Thank you for choosing <strong>${BRAND_NAME}</strong>. We look forward to serving you again!
                </p>
            </div>

            <!-- Footer -->
            <div style="background: #f9f9f9; padding: 15px; text-align: center; color: #777; font-size: 12px;">
                ${BRAND_NAME} | <a href="${BRAND_URL}" style="color: ${BRAND_PRIMARY}; text-decoration: none;">${BRAND_URL}</a>
            </div>
        </div>
    `
});

export const adminDeliveredTemplate = (orderId, items, total) => ({
	subject: `Order Delivered: #${orderId}`,
	html: `
        <div style="font-family: sans-serif; color: #333;">
            <h2 style="color: ${BRAND_PRIMARY_DARK};">Order Marked as Delivered</h2>

            <p>
                The following order has been successfully delivered.
                <strong>Order ID: #${orderId}</strong>
            </p>

            ${generateOrderTable(items)}

            <p style="font-size: 18px;">
                <strong>Total Value: ${total} ETB</strong>
            </p>

            <a href="${BRAND_URL}dashboard/orders"
               style="background: ${BRAND_HEADER_BG}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
               View in Dashboard
            </a>
        </div>
    `
});

export const adminContactTemplate = (data: {
	name: string;
	email: string;
	phoneNumber: string;
	subject: string;
	contactMessage?: string;
}) => ({
	subject: `📩 New Contact Message: ${data.subject}`,
	html: `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee;">

            <!-- Header -->
            <div style="background: ${BRAND_HEADER_BG}; padding: 20px; text-align: center;">
                <h2 style="color: white; margin: 0;">New Contact Message</h2>
            </div>

            <!-- Body -->
            <div style="padding: 20px;">
                <p><strong>Name:</strong> ${data.name}</p>
                <p><strong>Email:</strong> ${data.email}</p>
                <p><strong>Phone:</strong> ${data.phoneNumber}</p>
                <p><strong>Subject:</strong> ${data.subject}</p>

                <div style="margin-top: 15px;">
                    <strong>Message:</strong>
                    <div style="background: #f9f9f9; padding: 15px; margin-top: 5px; border-radius: 5px;">
                        ${data.contactMessage || '<i>No message provided</i>'}
                    </div>
                </div>

                <div style="margin-top: 20px;">
                    <a href="mailto:${data.email}"
                       style="background: ${BRAND_HEADER_BG}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                        Reply to Customer
                    </a>
                </div>
            </div>

            <!-- Footer -->
            <div style="background: #f9f9f9; padding: 10px; text-align: center; font-size: 12px; color: #777;">
                ${BRAND_NAME} - Contact Form Notification
            </div>
        </div>
    `
});

export const customerContactTemplate = (name: string, subject: string) => ({
	subject: `We received your message - ${BRAND_NAME}`,
	html: `
        <div style="max-width: 600px; margin: auto; font-family: sans-serif; border: 1px solid #eee;">

            <!-- Header -->
            <div style="background: ${BRAND_HEADER_BG}; padding: 20px; text-align: center;">
                <img src="${BRAND_LOGO}"
                     alt="${BRAND_NAME} Logo"
                     width="80"
                     style="display: block; margin: 0 auto 10px;">
                <h1 style="color: white; margin: 0; font-size: 20px;">
                    Message Received ✅
                </h1>
            </div>

            <!-- Body -->
            <div style="padding: 20px; color: #333;">
                <p>Hi <strong>${name}</strong>,</p>

                <p>
                    Thank you for reaching out to <strong>${BRAND_NAME}</strong>.
                    We've received your message regarding:
                </p>

                <p style="font-weight: bold; margin: 10px 0;">
                    "${subject}"
                </p>

                <p>
                    Our team will review your message and get back to you as soon as possible.
                </p>

                <p style="margin-top: 20px;">
                    Best regards,<br/>
                    <strong>${BRAND_NAME} Team</strong>
                </p>
            </div>

            <!-- Footer -->
            <div style="background: #f9f9f9; padding: 15px; text-align: center; color: #777; font-size: 12px;">
                ${BRAND_NAME} | <a href="${BRAND_URL}" style="color: ${BRAND_PRIMARY}; text-decoration: none;">${BRAND_URL}</a>
            </div>
        </div>
    `
});

export async function sendResetPasswordEmail(toEmail: string, newPassword: string, phone?: string) {
	// Create transporter
	const transporter = nodemailer.createTransport({
		host: SMTP_HOST, // e.g smtp.gmail.com
		port: SMTP_PORT, // e.g 465 or 587
		secure: true, // true for 465, false for 587
		auth: {
			user: SMTP_USER, // sender email
			pass: SMTP_PASSWORD // sender email password / app password
		},
		authMethod: 'PLAIN'
	});

	const mailOptions = {
		from: `"Support Team" <${SMTP_USER}>`,
		to: toEmail,
		subject: 'Password Reset',
		text: `Your password has been reset. Your new password is: ${newPassword}`,
		html: `
    <h3>Password Reset</h3>
    <p>Your password has been reset successfully.</p>
    <p><strong>New Password:</strong> ${newPassword}</p>
    <p>Please log in and change it immediately for security reasons.</p>
  `,
		envelope: {
			from: `"Support Team" <${SMTP_USER}>`, // <-- important
			to: toEmail
		}
	};

	await transporter.sendMail(mailOptions);

	// Optionally also send an SMS if a phone number was provided.
	if (phone) {
		await sendSms(phone, stripHtml(mailOptions.html));
	}

	return { success: true, message: 'Reset email sent successfully' };
}

export const customerResetPasswordTemplate = (url: string) => ({
	subject: `Reset Your Password - ${BRAND_NAME}`,
	html: `
        <div style="max-width: 600px; margin: auto; font-family: sans-serif; border: 1px solid #eee;">
            <!-- Header -->
            <div style="background: ${BRAND_HEADER_BG}; padding: 20px; text-align: center;">
                <img src="${BRAND_LOGO}"
                     alt="${BRAND_NAME} Logo"
                     width="80"
                     style="display: block; margin: 0 auto 10px;">
                <h1 style="color: white; margin: 0; font-size: 20px;">
                    Reset Your Password
                </h1>
            </div>

            <!-- Body -->
            <div style="padding: 20px; color: #333;">
                <p>Hello,</p>

                <p>
                    We received a request to reset the password for your
                    <strong>${BRAND_NAME}</strong> account.
                </p>

                <p>
                    Click the button below to create a new password.
                </p>

                <div style="text-align: center; margin: 25px 0;">
                    <a href="${url}"
                       style="background: ${BRAND_HEADER_BG}; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                        Reset Password
                    </a>
                </div>

                <p>
                    If the button does not work, copy and paste this link into your browser:
                </p>

                <p style="word-break: break-all; color: ${BRAND_PRIMARY};">
                    ${url}
                </p>

                <p>
                    If you did not request a password reset, you can safely ignore this email.
                    Your password will remain unchanged.
                </p>

                <p style="margin-top: 20px;">
                    Best regards,<br/>
                    <strong>${BRAND_NAME} Team</strong>
                </p>
            </div>

            <!-- Footer -->
            <div style="background: #f9f9f9; padding: 15px; text-align: center; color: #777; font-size: 12px;">
                ${BRAND_NAME} | <a href="${BRAND_URL}" style="color: ${BRAND_PRIMARY}; text-decoration: none;">${BRAND_URL}</a>
            </div>
        </div>
    `
});



// Variant-aware item table: renders each item's actual color/width/thickness/
// length spec straight off orderItems (the customer's real requested spec,
// not necessarily a catalog variant) instead of the old free-text "amount"
// field. Used for confirmed-price emails (quote payment link, payment
// confirmation) — NOT for quote requests still awaiting a price, which should
// keep using generateQuoteTable.
const generateVariantOrderTable = (items) => {
	const specLabel = (item) => {
		const parts = [];
		if (item.colorName) parts.push(item.colorName);
		if (item.width != null) parts.push(`${item.width}${item.widthUnit ?? ''}`);
		if (item.thickness != null)
			parts.push(`${item.thickness}${item.thicknessUnit === 'gauge' ? 'ga' : (item.thicknessUnit ?? '')}`);
		if (item.length != null) parts.push(`${item.length}${item.lengthUnit ?? ''}`);
		return parts.join(' · ');
	};

	const rows = items
		.map((item) => {
			const spec = specLabel(item);
			const unitPrice = Number(item.price ?? 0);
			const lineTotal = unitPrice * item.quantity;
			return `
                 <tr style="border-bottom: 1px solid #eee;">
                     <td style="padding: 10px; text-align: left;">
                         ${item.productName}${spec ? `<br/><span style="color:#888; font-size: 12px;">${spec}</span>` : ''}
                     </td>
                     <td style="padding: 10px; text-align: center;">
                         ${item.quantity}
                     </td>
                     <td style="padding: 10px; text-align: right;">
                         ${unitPrice.toLocaleString()} ETB${item.priceIncludesVat ? '<br/><span style="color:#888; font-size: 11px;">(incl. VAT)</span>' : ''}
                     </td>
                     <td style="padding: 10px; text-align: right;">
                         ${lineTotal.toLocaleString()} ETB
                     </td>
                 </tr>
             `;
		})
		.join('');

	return `
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-family: sans-serif;">
            <thead>
                <tr style="background: ${BRAND_HEADER_BG}; color: white;">
                    <th style="padding: 10px; text-align: left;">Item</th>
                    <th style="padding: 10px; text-align: center;">Qty</th>
                    <th style="padding: 10px; text-align: right;">Unit Price</th>
                    <th style="padding: 10px; text-align: right;">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
};

// Renders a price offer's VAT/withholding/total breakdown — the same figures
// computed by calculateOrderPricing() in the dashboard's quote builder.
// `payAmount`/`isAdvance` are optional: when a customer is paying just the
// advance percentage, this shows both the full total and what's due now.
type OfferTotals = {
	subtotal: string | number;
	discountAmount?: string | number | null;
	priceExcludingVat: string | number;
	vatRate: string | number;
	vatAmount: string | number;
	priceIncludingVat: string | number;
	withholdingRate?: string | number | null;
	withholdingAmount?: string | number | null;
	total: string | number;
	advancePaymentPercentage?: string | number | null;
};
const generateTotalsBlock = (offer: OfferTotals, opts: { payAmount?: number; isAdvance?: boolean } = {}) => {
	const fmt = (n: string | number | null | undefined) => Number(n ?? 0).toLocaleString();
	const discount = Number(offer.discountAmount ?? 0);

	const row = (label: string, value: string, bold = false) => `
        <tr>
            <td style="padding: 4px 10px; text-align: left; ${bold ? 'font-weight:bold;' : 'color:#555;'}">${label}</td>
            <td style="padding: 4px 10px; text-align: right; ${bold ? 'font-weight:bold;' : ''}">${value}</td>
        </tr>
    `;

	return `
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-family: sans-serif; font-size: 13px;">
            <tbody>
                ${row('Subtotal', `${fmt(offer.subtotal)} ETB`)}
                ${discount > 0 ? row('Discount', `-${fmt(discount)} ETB`) : ''}
                ${row('Price (excl. VAT)', `${fmt(offer.priceExcludingVat)} ETB`)}
                ${row(`VAT (${fmt(offer.vatRate)}%)`, `${fmt(offer.vatAmount)} ETB`)}
                ${row('Price (incl. VAT)', `${fmt(offer.priceIncludingVat)} ETB`)}
                ${
									offer.withholdingAmount != null && Number(offer.withholdingAmount) > 0
										? row(`Withholding (${fmt(offer.withholdingRate)}%)`, `-${fmt(offer.withholdingAmount)} ETB`)
										: ''
								}
                ${row('Total', `${fmt(offer.total)} ETB`, true)}
                ${
									opts.isAdvance && opts.payAmount != null
										? row(
												`Advance Due Now (${fmt(offer.advancePaymentPercentage)}%)`,
												`${opts.payAmount.toLocaleString()} ETB`,
												true
											)
										: ''
								}
            </tbody>
        </table>
    `;
};

// --- Quote → payment link (the "quote reply" email/SMS) ---

export const quotePaymentLinkTemplate = (orderId, items, offer: OfferTotals, payUrl) => ({
	subject: `Your Quote is Ready — ${BRAND_NAME} (#${orderId})`,
	html: `
        <div style="max-width: 600px; margin: auto; font-family: sans-serif; border: 1px solid #eee;">
            <div style="background: ${BRAND_HEADER_BG}; padding: 20px; text-align: center;">
                <img src="${BRAND_LOGO}" alt="${BRAND_NAME} Logo" width="80" style="display: block; margin: 0 auto 10px;">
                <h1 style="color: white; margin: 0; font-size: 20px;">Your Quote is Ready</h1>
            </div>
            <div style="padding: 20px; color: #333;">
                <p>Good news — we've priced your request <strong>#${orderId}</strong>. Review the details below and pay securely to confirm your order.</p>
                ${generateVariantOrderTable(items)}
                ${generateTotalsBlock(offer)}
                ${
									offer.advancePaymentPercentage != null && Number(offer.advancePaymentPercentage) < 100
										? `<p style="font-size: 13px; color: #555; margin-top: 10px;">A ${Number(offer.advancePaymentPercentage)}% advance payment is accepted for this order — you'll be able to choose advance or full payment on the payment page.</p>`
										: ''
								}
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${payUrl}"
                       style="background: ${BRAND_HEADER_BG}; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
                        Pay Now
                    </a>
                </div>
                <p style="font-size: 12px; color: #888;">
                    This link is unique to your order and expires in 14 days. If the button doesn't work, copy this link into your browser:<br/>
                    <span style="word-break: break-all; color: ${BRAND_PRIMARY};">${payUrl}</span>
                </p>
                <p style="margin-top: 20px;">No account or sign-in needed — just click and pay.</p>
                <p style="margin-top: 20px;">
                    Best regards,<br/>
                    <strong>${BRAND_NAME} Team</strong>
                </p>
            </div>
            <div style="background: #f9f9f9; padding: 15px; text-align: center; color: #777; font-size: 12px;">
                ${BRAND_NAME} | <a href="${BRAND_URL}" style="color: ${BRAND_PRIMARY}; text-decoration: none;">${BRAND_URL}</a>
            </div>
        </div>
    `
});

// Deliberately short and link-first — see note above on why this isn't derived
// from the HTML. Keeps to unit total + VAT + the link, not the full item table.
export const quotePaymentLinkSms = (orderId, offer: OfferTotals, payUrl) => {
	const msg = `${BRAND_NAME}: Quote #${orderId} ready. Total ${Number(offer.total).toLocaleString()} ETB (incl. VAT ${Number(offer.vatAmount).toLocaleString()} ETB). Pay: ${payUrl}`;
	return msg.length > 335 ? msg.slice(0, 335) : msg;
};

// Sent to staff whenever a priced offer goes out — lets the team see what
// was quoted without waiting for the customer to open the email.
export const adminQuotePaymentLinkTemplate = (orderId, items, offer: OfferTotals) => ({
	subject: `Quote Sent: Order #${orderId} — ${Number(offer.total).toLocaleString()} ETB`,
	html: `
        <div style="font-family: sans-serif; color: #333;">
            <h2 style="color: ${BRAND_PRIMARY_DARK};">Priced Quote Sent to Customer</h2>
            <p>A payment link was just sent for <strong>Order #${orderId}</strong>.</p>
            ${generateVariantOrderTable(items)}
            ${generateTotalsBlock(offer)}
            <a href="${BRAND_URL}dashboard/quotes"
               style="background: ${BRAND_HEADER_BG}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px;">
               View in Dashboard
            </a>
        </div>
    `
});

// --- Remaining-balance reminder (staff can request this at any time from the
// Orders page — e.g. an advance was paid earlier, or a fresh reminder after
// delivery) — a fresh payment link scoped to just what's still owed. ---

export const balancePaymentLinkTemplate = (
	orderId,
	offer: OfferTotals,
	amountPaid: number,
	remainingBalance: number,
	payUrl: string
) => ({
	subject: `Balance Due — ${BRAND_NAME} (#${orderId})`,
	html: `
        <div style="max-width: 600px; margin: auto; font-family: sans-serif; border: 1px solid #eee;">
            <div style="background: ${BRAND_HEADER_BG}; padding: 20px; text-align: center;">
                <img src="${BRAND_LOGO}" alt="${BRAND_NAME} Logo" width="80" style="display: block; margin: 0 auto 10px;">
                <h1 style="color: white; margin: 0; font-size: 20px;">Remaining Balance Due</h1>
            </div>
            <div style="padding: 20px; color: #333;">
                <p>This is a reminder about the remaining balance on your order <strong>#${orderId}</strong>.</p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-family: sans-serif; font-size: 13px;">
                    <tbody>
                        <tr><td style="padding: 4px 10px; color:#555;">Order Total</td><td style="padding: 4px 10px; text-align: right;">${Number(offer.total).toLocaleString()} ETB</td></tr>
                        <tr><td style="padding: 4px 10px; color:#555;">Already Paid</td><td style="padding: 4px 10px; text-align: right;">${amountPaid.toLocaleString()} ETB</td></tr>
                        <tr><td style="padding: 4px 10px; font-weight:bold;">Balance Due</td><td style="padding: 4px 10px; text-align: right; font-weight:bold;">${remainingBalance.toLocaleString()} ETB</td></tr>
                    </tbody>
                </table>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${payUrl}"
                       style="background: ${BRAND_HEADER_BG}; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
                        Pay Balance
                    </a>
                </div>
                <p style="font-size: 12px; color: #888;">
                    This link is unique to your order and expires in 14 days. If the button doesn't work, copy this link into your browser:<br/>
                    <span style="word-break: break-all; color: ${BRAND_PRIMARY};">${payUrl}</span>
                </p>
                <p style="margin-top: 20px;">
                    Best regards,<br/>
                    <strong>${BRAND_NAME} Team</strong>
                </p>
            </div>
            <div style="background: #f9f9f9; padding: 15px; text-align: center; color: #777; font-size: 12px;">
                ${BRAND_NAME} | <a href="${BRAND_URL}" style="color: ${BRAND_PRIMARY}; text-decoration: none;">${BRAND_URL}</a>
            </div>
        </div>
    `
});

export const balancePaymentLinkSms = (orderId, remainingBalance: number, payUrl: string) => {
	const msg = `${BRAND_NAME}: Balance due on order #${orderId} is ${remainingBalance.toLocaleString()} ETB. Pay: ${payUrl}`;
	return msg.length > 335 ? msg.slice(0, 335) : msg;
};

export const adminBalancePaymentLinkTemplate = (orderId, amountPaid: number, remainingBalance: number) => ({
	subject: `Balance Reminder Sent: Order #${orderId}`,
	html: `
        <div style="font-family: sans-serif; color: #333;">
            <h2 style="color: ${BRAND_PRIMARY_DARK};">Balance Payment Link Sent</h2>
            <p>A balance-due payment link was sent to the customer for <strong>Order #${orderId}</strong>.</p>
            <p>Already paid: <strong>${amountPaid.toLocaleString()} ETB</strong> — Balance due: <strong>${remainingBalance.toLocaleString()} ETB</strong></p>
            <a href="${BRAND_URL}dashboard/orders"
               style="background: ${BRAND_HEADER_BG}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
               View in Dashboard
            </a>
        </div>
    `
});

// --- Order adjustments (post-dispatch corrections) ---

// A deduction (or an addition too small/handled outside the payment flow) —
// informational, no payment link. Additions that need collecting reuse the
// balance-payment link email instead (see sendBalancePaymentLink).
export const orderAdjustmentAppliedTemplate = (
	orderId,
	adjustment: { type: 'addition' | 'deduction'; amount: number; reason: string },
	newTotal: number
) => ({
	subject: `Order #${orderId} Adjusted`,
	html: `
        <div style="max-width: 600px; margin: auto; font-family: sans-serif; border: 1px solid #eee;">
            <div style="background: ${BRAND_HEADER_BG}; padding: 20px; text-align: center;">
                <img src="${BRAND_LOGO}" alt="${BRAND_NAME} Logo" width="80" style="display: block; margin: 0 auto 10px;">
                <h1 style="color: white; margin: 0; font-size: 20px;">Order Adjustment</h1>
            </div>
            <div style="padding: 20px; color: #333;">
                <p>An adjustment was made to your order <strong>#${orderId}</strong>.</p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-family: sans-serif; font-size: 13px;">
                    <tbody>
                        <tr><td style="padding: 4px 10px; color:#555;">Reason</td><td style="padding: 4px 10px; text-align: right;">${escapeHtml(adjustment.reason)}</td></tr>
                        <tr><td style="padding: 4px 10px; color:#555;">${adjustment.type === 'addition' ? 'Amount Added' : 'Amount Credited'}</td><td style="padding: 4px 10px; text-align: right;">${adjustment.amount.toLocaleString()} ETB</td></tr>
                        <tr><td style="padding: 4px 10px; font-weight:bold;">New Order Total</td><td style="padding: 4px 10px; text-align: right; font-weight:bold;">${newTotal.toLocaleString()} ETB</td></tr>
                    </tbody>
                </table>
                ${
									adjustment.type === 'deduction'
										? `<p style="margin-top: 15px; font-size: 13px; color: #555;">If you've already paid more than the new total, our team will be in touch to arrange your refund.</p>`
										: `<p style="margin-top: 15px; font-size: 13px; color: #555;">A separate payment link for the additional amount will follow if anything remains due.</p>`
								}
                <p style="margin-top: 20px;">
                    Best regards,<br/>
                    <strong>${BRAND_NAME} Team</strong>
                </p>
            </div>
            <div style="background: #f9f9f9; padding: 15px; text-align: center; color: #777; font-size: 12px;">
                ${BRAND_NAME} | <a href="${BRAND_URL}" style="color: ${BRAND_PRIMARY}; text-decoration: none;">${BRAND_URL}</a>
            </div>
        </div>
    `
});

export const adminOrderAdjustmentTemplate = (
	orderId,
	adjustment: { type: 'addition' | 'deduction'; amount: number; reason: string; causedBy: string },
	newTotal: number
) => ({
	subject: `Order #${orderId} Adjusted (${adjustment.type})`,
	html: `
        <div style="font-family: sans-serif; color: #333;">
            <h2 style="color: ${BRAND_PRIMARY_DARK};">Order Adjustment Applied</h2>
            <p><strong>Order #${orderId}</strong> — ${adjustment.type} of ${adjustment.amount.toLocaleString()} ETB (caused by ${adjustment.causedBy}).</p>
            <p>Reason: ${escapeHtml(adjustment.reason)}</p>
            <p style="font-size: 16px;"><strong>New Total: ${newTotal.toLocaleString()} ETB</strong></p>
            <a href="${BRAND_URL}dashboard/orders"
               style="background: ${BRAND_HEADER_BG}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
               View in Dashboard
            </a>
        </div>
    `
});

// Customer requested an adjustment — staff needs to review it.
export const adjustmentRequestedTemplate = (orderId, customerName: string, reason: string, requestedAmount: number) => ({
	subject: `Adjustment Requested: Order #${orderId}`,
	html: `
        <div style="font-family: sans-serif; color: #333;">
            <h2 style="color: ${BRAND_PRIMARY_DARK};">Customer Requested an Adjustment</h2>
            <p><strong>${escapeHtml(customerName)}</strong> requested an adjustment on <strong>Order #${orderId}</strong>.</p>
            <p>Requested credit: <strong>${requestedAmount.toLocaleString()} ETB</strong></p>
            <p>Reason: ${escapeHtml(reason)}</p>
            <a href="${BRAND_URL}dashboard/orders"
               style="background: ${BRAND_HEADER_BG}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
               Review in Dashboard
            </a>
        </div>
    `
});

// Staff approved or rejected a customer's adjustment request.
export const adjustmentDecisionTemplate = (orderId, approved: boolean, reason?: string | null) => ({
	subject: approved ? `Adjustment Approved: Order #${orderId}` : `Adjustment Request Declined: Order #${orderId}`,
	html: `
        <div style="max-width: 600px; margin: auto; font-family: sans-serif; border: 1px solid #eee;">
            <div style="background: ${BRAND_HEADER_BG}; padding: 20px; text-align: center;">
                <img src="${BRAND_LOGO}" alt="${BRAND_NAME} Logo" width="80" style="display: block; margin: 0 auto 10px;">
                <h1 style="color: white; margin: 0; font-size: 20px;">${approved ? 'Adjustment Approved' : 'Adjustment Request Declined'}</h1>
            </div>
            <div style="padding: 20px; color: #333;">
                <p>Your requested adjustment on order <strong>#${orderId}</strong> has been ${approved ? 'approved' : 'declined'}.</p>
                ${reason ? `<p style="color:#555; font-size: 13px;">Note: ${escapeHtml(reason)}</p>` : ''}
                <p style="margin-top: 20px;">
                    Best regards,<br/>
                    <strong>${BRAND_NAME} Team</strong>
                </p>
            </div>
            <div style="background: #f9f9f9; padding: 15px; text-align: center; color: #777; font-size: 12px;">
                ${BRAND_NAME} | <a href="${BRAND_URL}" style="color: ${BRAND_PRIMARY}; text-decoration: none;">${BRAND_URL}</a>
            </div>
        </div>
    `
});

// --- Customer offer rejection / order cancellation (from the magic-link page) ---

export const adminOfferRejectedTemplate = (orderId, reason?: string | null) => ({
	subject: `Offer Rejected: Order #${orderId}`,
	html: `
        <div style="font-family: sans-serif; color: #333;">
            <h2 style="color: ${BRAND_PRIMARY_DARK};">Customer Rejected the Price Offer</h2>
            <p>The customer rejected the current price offer on <strong>Order #${orderId}</strong> and is asking for a new one.</p>
            ${reason ? `<p>Note from customer: ${escapeHtml(reason)}</p>` : ''}
            <a href="${BRAND_URL}dashboard/quotes"
               style="background: ${BRAND_HEADER_BG}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
               Review in Dashboard
            </a>
        </div>
    `
});

export const adminOrderCancelledTemplate = (orderId, reason?: string | null) => ({
	subject: `Order Cancelled: Order #${orderId}`,
	html: `
        <div style="font-family: sans-serif; color: #333;">
            <h2 style="color: ${BRAND_PRIMARY_DARK};">Customer Cancelled Their Order</h2>
            <p>The customer cancelled <strong>Order #${orderId}</strong> from the payment page.</p>
            ${reason ? `<p>Note from customer: ${escapeHtml(reason)}</p>` : ''}
            <a href="${BRAND_URL}dashboard/orders"
               style="background: ${BRAND_HEADER_BG}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
               View in Dashboard
            </a>
        </div>
    `
});

// --- Payment confirmation ---

export const paymentConfirmedTemplate = (
	orderId,
	items,
	offer: OfferTotals,
	payAmount: number,
	isAdvance: boolean
) => ({
	subject: isAdvance
		? `Advance Payment Received - ${BRAND_NAME} (#${orderId})`
		: `Payment Confirmed - ${BRAND_NAME} (#${orderId})`,
	html: `
        <div style="max-width: 600px; margin: auto; font-family: sans-serif; border: 1px solid #eee;">
            <div style="background: ${BRAND_HEADER_BG}; padding: 20px; text-align: center;">
                <img src="${BRAND_LOGO}" alt="${BRAND_NAME} Logo" width="80" style="display: block; margin: 0 auto 10px;">
                <h1 style="color: white; margin: 0; font-size: 20px;">${isAdvance ? 'Advance Payment Received ✅' : 'Payment Confirmed ✅'}</h1>
            </div>
            <div style="padding: 20px; color: #333;">
                <p>We've received your ${isAdvance ? 'advance payment' : 'payment'} for order <strong>#${orderId}</strong>. Thank you! Our team is now preparing your order.</p>
                ${generateVariantOrderTable(items)}
                ${generateTotalsBlock(offer, { payAmount, isAdvance })}
                ${
									isAdvance
										? `<p style="margin-top: 10px; font-size: 13px; color: #555;">Remaining balance: <strong>${(Number(offer.total) - payAmount).toLocaleString()} ETB</strong>, due before delivery.</p>`
										: ''
								}
                <p style="margin-top: 20px;">We'll be in touch with delivery/pickup details shortly.</p>
                <p style="margin-top: 20px;">
                    Best regards,<br/>
                    <strong>${BRAND_NAME} Team</strong>
                </p>
            </div>
            <div style="background: #f9f9f9; padding: 15px; text-align: center; color: #777; font-size: 12px;">
                ${BRAND_NAME} | <a href="${BRAND_URL}" style="color: ${BRAND_PRIMARY}; text-decoration: none;">${BRAND_URL}</a>
            </div>
        </div>
    `
});

export const adminPaymentConfirmedTemplate = (
	orderId,
	items,
	offer: OfferTotals,
	payAmount: number,
	isAdvance: boolean
) => ({
	subject: `${isAdvance ? 'Advance Payment' : 'Payment'} Received: Order #${orderId}`,
	html: `
        <div style="font-family: sans-serif; color: #333;">
            <h2 style="color: ${BRAND_PRIMARY_DARK};">${isAdvance ? 'Advance Payment' : 'Payment'} Confirmed</h2>
            <p>${isAdvance ? 'An advance payment' : 'Payment'} has been confirmed via Chapa for <strong>Order #${orderId}</strong>.</p>
            ${generateVariantOrderTable(items)}
            ${generateTotalsBlock(offer, { payAmount, isAdvance })}
            ${
							isAdvance
								? `<p style="font-size: 13px; color: #555;">Remaining balance: <strong>${(Number(offer.total) - payAmount).toLocaleString()} ETB</strong></p>`
								: ''
						}
            <a href="${BRAND_URL}dashboard/orders"
               style="background: ${BRAND_HEADER_BG}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px;">
               View in Dashboard
            </a>
        </div>
    `
});

export const paymentConfirmedSms = (orderId, offer: OfferTotals, payAmount: number, isAdvance: boolean) => {
	const msg = isAdvance
		? `${BRAND_NAME}: Advance of ${payAmount.toLocaleString()} ETB confirmed for order #${orderId} (total ${Number(offer.total).toLocaleString()} ETB, VAT ${Number(offer.vatAmount).toLocaleString()} ETB). Balance due before delivery: ${(Number(offer.total) - payAmount).toLocaleString()} ETB.`
		: `${BRAND_NAME}: Payment of ${payAmount.toLocaleString()} ETB confirmed for order #${orderId} (incl. VAT ${Number(offer.vatAmount).toLocaleString()} ETB). Thank you!`;
	return msg.length > 335 ? msg.slice(0, 335) : msg;
};

export const quoteReplyTemplate = (name: string, message: string) => ({
	html: `
        <div style="max-width: 600px; margin: auto; font-family: sans-serif; border: 1px solid #eee;">
            <div style="background: ${BRAND_HEADER_BG}; padding: 20px; text-align: center;">
                <img src="${BRAND_LOGO}" alt="${BRAND_NAME} Logo" width="80" style="display: block; margin: 0 auto 10px;">
                <h1 style="color: white; margin: 0; font-size: 20px;">Message from ${BRAND_NAME}</h1>
            </div>
            <div style="padding: 20px; color: #333;">
                <p>Hi ${name},</p>
                <div>${message}</div>
                <p style="margin-top: 20px;">
                    Best regards,<br/>
                    <strong>${BRAND_NAME} Team</strong>
                </p>
            </div>
            <div style="background: #f9f9f9; padding: 15px; text-align: center; color: #777; font-size: 12px;">
                ${BRAND_NAME} | <a href="${BRAND_URL}" style="color: ${BRAND_PRIMARY}; text-decoration: none;">${BRAND_URL}</a>
            </div>
        </div>
    `
});

const escapeHtml = (str: string | null | undefined) =>
	(str ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');

// Builds a "Product Name · Color · Width · Thickness (cut to order)" style label
// from a joined product+variant row. Duplicated in a couple of places now
// (client components, generateVariantOrderTable) — worth extracting to a shared
// util if it grows again, but kept local here to avoid a cross-cutting refactor.
const buildQuoteItemLabel = (details: {
	productName?: string | null;
	categoryName?: string | null;
	colorName?: string | null;
	widthValue?: string | number | null;
	widthUnit?: string | null;
	widthLabel?: string | null;
	thicknessValue?: string | number | null;
	thicknessUnit?: string | null;
	lengthValue?: string | number | null;
	lengthUnit?: string | null;
	lengthLabel?: string | null;
	isCustomLength?: boolean | null;
}) => {
	if (!details.productName) {
		return details.categoryName ? `General inquiry — ${escapeHtml(details.categoryName)} category` : 'General inquiry';
	}

	const specParts: string[] = [];
	if (details.colorName) specParts.push(escapeHtml(details.colorName));

	const widthPart =
		details.widthLabel || (details.widthValue ? `${details.widthValue}${details.widthUnit ?? ''}` : null);
	if (widthPart) specParts.push(escapeHtml(widthPart));

	const thicknessPart = details.thicknessValue
		? `${details.thicknessValue}${details.thicknessUnit ?? ''}`
		: null;
	if (thicknessPart) specParts.push(escapeHtml(thicknessPart));

	const lengthPart =
		details.lengthLabel || (details.lengthValue ? `${details.lengthValue}${details.lengthUnit ?? ''}` : null);
	if (lengthPart) specParts.push(escapeHtml(details.isCustomLength ? `${lengthPart} (cut to order)` : lengthPart));

	const spec = specParts.join(' · ');
	return `${escapeHtml(details.productName)}${spec ? ` (${spec})` : ''}`;
};

export const quoteRequestReceivedTemplate = (quoteId: number, details: {
	name: string;
	companyName?: string | null;
	quantityEstimate?: string | null;
	message?: string | null;
	itemLabel: string;
}) => ({
	subject: `Quote Request Received - ${BRAND_NAME} (#${quoteId})`,
	html: `
        <div style="max-width: 600px; margin: auto; font-family: sans-serif; border: 1px solid #eee;">
            <div style="background: ${BRAND_HEADER_BG}; padding: 20px; text-align: center;">
                <img src="${BRAND_LOGO}" alt="${BRAND_NAME} Logo" width="80" style="display: block; margin: 0 auto 10px;">
                <h1 style="color: white; margin: 0; font-size: 20px;">Quote Request Received</h1>
            </div>
            <div style="padding: 20px; color: #333;">
                <p>Hi ${escapeHtml(details.name)},</p>
                <p>Thanks for reaching out to <strong>${BRAND_NAME}</strong>. We've received your quote request <strong>#${quoteId}</strong>:</p>
                <div style="background: #f9f9f9; border-radius: 6px; padding: 15px; margin: 15px 0;">
                    <p style="margin: 0 0 8px 0;"><strong>Item:</strong> ${details.itemLabel}</p>
                    ${details.quantityEstimate ? `<p style="margin: 0 0 8px 0;"><strong>Estimated quantity:</strong> ${escapeHtml(details.quantityEstimate)}</p>` : ''}
                    ${details.companyName ? `<p style="margin: 0 0 8px 0;"><strong>Company:</strong> ${escapeHtml(details.companyName)}</p>` : ''}
                    ${details.message ? `<p style="margin: 0;"><strong>Your message:</strong> ${escapeHtml(details.message)}</p>` : ''}
                </div>
                <p>Our sales team will review your request and follow up shortly with confirmed pricing and availability.</p>
                <p style="margin-top: 20px;">
                    Best regards,<br/>
                    <strong>${BRAND_NAME} Team</strong>
                </p>
            </div>
            <div style="background: #f9f9f9; padding: 15px; text-align: center; color: #777; font-size: 12px;">
                ${BRAND_NAME} | <a href="${BRAND_URL}" style="color: ${BRAND_PRIMARY}; text-decoration: none;">${BRAND_URL}</a>
            </div>
        </div>
    `
});

export const adminNewQuoteRequestTemplate = (quoteId: number, details: {
	name: string;
	email?: string | null;
	phone: string;
	whatsapp?: string | null;
	companyName?: string | null;
	quantityEstimate?: string | null;
	message?: string | null;
	itemLabel: string;
}) => ({
	subject: `New Quote Request: #${quoteId}`,
	html: `
        <div style="font-family: sans-serif; color: #333;">
            <h2 style="color: ${BRAND_PRIMARY_DARK};">New Quote Request Received</h2>
            <p><strong>Request ID:</strong> #${quoteId}</p>
            <div style="background: #f9f9f9; border-radius: 6px; padding: 15px; margin: 15px 0;">
                <p style="margin: 0 0 8px 0;"><strong>Item:</strong> ${details.itemLabel}</p>
                ${details.quantityEstimate ? `<p style="margin: 0 0 8px 0;"><strong>Estimated quantity:</strong> ${escapeHtml(details.quantityEstimate)}</p>` : ''}
                <p style="margin: 0 0 8px 0;"><strong>Name:</strong> ${escapeHtml(details.name)}</p>
                ${details.companyName ? `<p style="margin: 0 0 8px 0;"><strong>Company:</strong> ${escapeHtml(details.companyName)}</p>` : ''}
                <p style="margin: 0 0 8px 0;"><strong>Phone:</strong> ${escapeHtml(details.phone)}</p>
                ${details.whatsapp ? `<p style="margin: 0 0 8px 0;"><strong>WhatsApp:</strong> ${escapeHtml(details.whatsapp)}</p>` : ''}
                ${details.email ? `<p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${escapeHtml(details.email)}</p>` : ''}
                ${details.message ? `<p style="margin: 0;"><strong>Message:</strong> ${escapeHtml(details.message)}</p>` : ''}
            </div>
            <a href="${BRAND_URL}dashboard/quotes"
               style="background: ${BRAND_HEADER_BG}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
               View in Dashboard
            </a>
        </div>
    `
});