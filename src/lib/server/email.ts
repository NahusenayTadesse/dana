import nodemailer from 'nodemailer';

import { SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_PORT } from '$env/static/private';

const transporter = nodemailer.createTransport({
	host: SMTP_HOST,
	port: SMTP_PORT,
	secure: true,
	auth: {
		user: SMTP_USER,
		pass: SMTP_PASSWORD
	}
});

export const sendEmail = async (to: string, subject: string, html: string) => {
	await transporter.sendMail({
		from: `"Support Team" <${SMTP_USER}>`,
		to,
		subject,
		html
	});
};

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
                <tr style="background-color: #2596be; color: white;">
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

export const customerCheckoutTemplate = (orderId, items, total) => ({
	subject: `Order Confirmed - dana Electronics (#${orderId})`,
	html: `
        <div style="max-width: 600px; margin: auto; font-family: sans-serif; border: 1px solid #eee;">
            <div style="background-color: #2596be; padding: 20px; text-align: center;">
                <img src="https://danaelectronics.com/logo192.png" alt="dana Electronics Logo" width="80" style="display: block; margin: 0 auto 10px;">
                <h1 style="color: white; margin: 0; font-size: 20px;">Order Confirmed!</h1>
            </div>
            <div style="padding: 20px; color: #333;">
                <p>We've received your order <strong>#${orderId}</strong>. Our team is now processing your technology products with care.</p>
                ${generateOrderTable(items)}
                <div style="text-align: right; margin-top: 15px; font-weight: bold; font-size: 1.2em;">
                    Total: ${total} ETB
                </div>
            </div>
            <div style="background: #f9f9f9; padding: 15px; text-align: center; color: #777; font-size: 12px;">
                dana Electronics | Technology you can trust.
            </div>
        </div>
    `
});

export const adminCheckoutTemplate = (orderId, items, total) => ({
	subject: `New Order Alert: #${orderId}`,
	html: `
        <div style="font-family: sans-serif; color: #333;">
            <h2 style="color: #2596be;">New Order Received</h2>
            <p>A new order has been placed on the website. <strong>Order ID: #${orderId}</strong></p>
            ${generateOrderTable(items)}
            <p style="font-size: 18px;"><strong>Total Revenue: ${total} ETB</strong></p>
            <a href="https://danaelectronics.com/dashboard/orders"
               style="background: #2596be; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
               View in Dashboard
            </a>
        </div>
    `
});

export const customerWelcomeTemplate = (name: string) => ({
	subject: `Welcome to dana Electronics, ${name}! 🎉`,
	html: `
        <div style="max-width: 600px; margin: auto; font-family: sans-serif; border: 1px solid #eee;">

            <!-- Header -->
            <div style="background-color: #2596be; padding: 20px; text-align: center;">
                <img src="https://danaelectronics.com/logo192.png"
                     alt="dana Electronics Logo"
                     width="80"
                     style="display: block; margin: 0 auto 10px;">
                <h1 style="color: white; margin: 0; font-size: 20px;">
                    Welcome to dana Electronics!
                </h1>
            </div>

            <!-- Body -->
            <div style="padding: 20px; color: #333;">
                <p>Hi <strong>${name}</strong>,</p>

                <p>
                    We're excited to have you join <strong>dana Electronics</strong> 🔌.
                    You're now part of a community that values reliable, innovative, and high-quality technology products.
                </p>

                <p>
                    You can now explore mobile accessories, power solutions, storage devices, audio products, and smart electronics designed for everyday performance.
                </p>

                <div style="text-align: center; margin: 25px 0;">
                    <a href="https://danaelectronics.com"
                       style="background: #2596be; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                        Start Shopping
                    </a>
                </div>

                <p>
                    If you have any questions, feel free to reply to this email — our team is ready to assist before and after purchase.
                </p>

                <p style="margin-top: 20px;">
                    Warm regards,<br/>
                    <strong>dana Electronics Team</strong>
                </p>
            </div>

            <!-- Footer -->
            <div style="background: #f9f9f9; padding: 15px; text-align: center; color: #777; font-size: 12px;">
                dana Electronics | Technology you can trust.
            </div>
        </div>
    `
});

export const customerDeliveredTemplate = (orderId, items, total) => ({
	subject: `Your Order Has Been Delivered! (#${orderId})`,
	html: `
        <div style="max-width: 600px; margin: auto; font-family: sans-serif; border: 1px solid #eee;">

            <!-- Header -->
            <div style="background-color: #2596be; padding: 20px; text-align: center;">
                <img src="https://danaelectronics.com/logo192.png"
                     alt="dana Electronics Logo"
                     width="80"
                     style="display: block; margin: 0 auto 10px;">
                <h1 style="color: white; margin: 0; font-size: 20px;">
                    Order Delivered 🎉
                </h1>
            </div>

            <!-- Body -->
            <div style="padding: 20px; color: #333;">
                <p>Your order <strong>#${orderId}</strong> has been successfully delivered.</p>

                <p>We hope your new technology products keep you connected, productive, and powered wherever you go! 😊</p>

                ${generateOrderTable(items)}

                <div style="text-align: right; margin-top: 15px; font-weight: bold; font-size: 1.2em;">
                    Total: ${total} ETB
                </div>

                <p style="margin-top: 20px;">
                    Thank you for choosing <strong>dana Electronics</strong>. We look forward to serving you again!
                </p>
            </div>

            <!-- Footer -->
            <div style="background: #f9f9f9; padding: 15px; text-align: center; color: #777; font-size: 12px;">
                dana Electronics | Technology you can trust.
            </div>
        </div>
    `
});

export const adminDeliveredTemplate = (orderId, items, total) => ({
	subject: `Order Delivered: #${orderId}`,
	html: `
        <div style="font-family: sans-serif; color: #333;">
            <h2 style="color: #2596be;">Order Marked as Delivered</h2>

            <p>
                The following order has been successfully delivered.
                <strong>Order ID: #${orderId}</strong>
            </p>

            ${generateOrderTable(items)}

            <p style="font-size: 18px;">
                <strong>Total Value: ${total} ETB</strong>
            </p>

            <a href="https://danaelectronics.com/dashboard/orders"
               style="background: #2596be; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
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
            <div style="background-color: #2596be; padding: 20px; text-align: center;">
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
                       style="background: #2596be; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                        Reply to Customer
                    </a>
                </div>
            </div>

            <!-- Footer -->
            <div style="background: #f9f9f9; padding: 10px; text-align: center; font-size: 12px; color: #777;">
                dana Electronics - Contact Form Notification
            </div>
        </div>
    `
});

export const customerContactTemplate = (name: string, subject: string) => ({
	subject: `We received your message - dana Electronics`,
	html: `
        <div style="max-width: 600px; margin: auto; font-family: sans-serif; border: 1px solid #eee;">

            <!-- Header -->
            <div style="background-color: #2596be; padding: 20px; text-align: center;">
                <img src="https://danaelectronics.com/logo192.png"
                     alt="dana Electronics Logo"
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
                    Thank you for reaching out to <strong>dana Electronics</strong>.
                    We've received your message regarding:
                </p>

                <p style="font-weight: bold; margin: 10px 0;">
                    "${subject}"
                </p>

                <p>
                    Our team will review your message and get back to you as soon as possible.
                </p>

                <p style="margin-top: 20px;">
                    If your request is urgent, feel free to contact us directly at <strong>+251 933 111 111</strong> or <strong>info@danaelectronics.com</strong>.
                </p>

                <p style="margin-top: 20px;">
                    Best regards,<br/>
                    <strong>dana Electronics Team</strong>
                </p>
            </div>

            <!-- Footer -->
            <div style="background: #f9f9f9; padding: 15px; text-align: center; color: #777; font-size: 12px;">
                dana Electronics | Technology you can trust.
            </div>
        </div>
    `
});

export async function sendResetPasswordEmail(toEmail: string, newPassword: string) {
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

	return { success: true, message: 'Reset email sent successfully' };
}

export const customerResetPasswordTemplate = (url: string) => ({
	subject: `Reset Your Password - dana Electronics`,
	html: `
        <div style="max-width: 600px; margin: auto; font-family: sans-serif; border: 1px solid #eee;">
            <!-- Header -->
            <div style="background-color: #2596be; padding: 20px; text-align: center;">
                <img src="https://danaelectronics.com/logo192.png"
                     alt="dana Electronics Logo"
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
                    <strong>dana Electronics</strong> account.
                </p>

                <p>
                    Click the button below to create a new password.
                </p>

                <div style="text-align: center; margin: 25px 0;">
                    <a href="${url}"
                       style="background: #2596be; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                        Reset Password
                    </a>
                </div>

                <p>
                    If the button does not work, copy and paste this link into your browser:
                </p>

                <p style="word-break: break-all; color: #2596be;">
                    ${url}
                </p>

                <p>
                    If you did not request a password reset, you can safely ignore this email.
                    Your password will remain unchanged.
                </p>

                <p style="margin-top: 20px;">
                    Best regards,<br/>
                    <strong>dana Electronics Team</strong>
                </p>
            </div>

            <!-- Footer -->
            <div style="background: #f9f9f9; padding: 15px; text-align: center; color: #777; font-size: 12px;">
                dana Electronics | Technology You Can Trust.
            </div>
        </div>
    `
});
