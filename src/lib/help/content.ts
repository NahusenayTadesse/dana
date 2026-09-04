/**
 * The dashboard manual.
 *
 * One source for both surfaces: the searchable Help page and the printable
 * manual are built from this list, so a instruction can never be right in one
 * and stale in the other.
 *
 * Written for whoever actually runs the business, not for a developer. Every
 * topic answers "what do I click, and what happens when I do".
 */

export type HelpTopic = {
	id: string;
	title: string;
	/** The one-line answer. Shown under the title, and in search results. */
	summary: string;
	/** Where in the dashboard this lives. */
	where?: string;
	/** Numbered instructions. */
	steps?: string[];
	/** Things that are easy to get wrong, or worth knowing before you start. */
	notes?: string[];
	/** Extra words someone might search for that are not in the text above. */
	keywords?: string[];
};

export type HelpSection = {
	id: string;
	title: string;
	blurb: string;
	topics: HelpTopic[];
};

export const HELP_SECTIONS: HelpSection[] = [
	{
		id: 'start',
		title: 'Getting started',
		blurb: 'What the dashboard is, how it is laid out, and the few habits that make everything else easier.',
		topics: [
			{
				id: 'what-is-this',
				title: 'What this dashboard is for',
				summary:
					'It is the private side of your website. Everything customers see, and everything they send you, is managed from here.',
				notes: [
					'The public website and this dashboard are the same system. A change you save here is live for customers straight away — there is no separate "publish" step and nothing to send to a developer.',
					'Only people you have given an Admin account can open it. Everyone else who tries lands on a "not found" page.'
				],
				keywords: ['admin', 'backend', 'control panel', 'cms']
			},
			{
				id: 'layout',
				title: 'Finding your way around',
				summary: 'The menu down the left is grouped by the kind of work you are doing.',
				steps: [
					'**Operations** — the day-to-day: quote requests, orders, products, customer messages and promo codes.',
					'**Content** — what the website says and shows: company details, page text, the FAQ, pictures, testimonials, partner logos and blog posts.',
					'**Operations & stock** — the factory side: staff, warehouses, stock counts, raw materials, production batches, purchase orders and payment links.',
					'**Analytics** — reports, user accounts and roles, payment methods, and business settings.'
				],
				notes: [
					'On a phone the menu is behind the button in the top-left corner.',
					'A number badge next to a menu item means something is waiting for you — new orders, or unread messages.'
				],
				keywords: ['menu', 'sidebar', 'navigation', 'where is']
			},
			{
				id: 'tables',
				title: 'Using the tables',
				summary: 'Almost every screen is a table. They all behave the same way.',
				steps: [
					'Type in the **search box** above a table to narrow it down. It looks at every column at once.',
					'Click a **column heading** with arrows on it to sort by that column. Click again to reverse it.',
					'Click the **name in the first column** — or the **Edit** button at the end of the row — to open that row for editing.',
					'Use the **export button** above the table to save what you are looking at as a spreadsheet, or to print it.'
				],
				notes: [
					'Searching and sorting only change what you are looking at. They never change your data.'
				],
				keywords: ['search', 'sort', 'filter', 'export', 'csv', 'columns']
			},
			{
				id: 'saving',
				title: 'Saving changes',
				summary: 'Nothing is saved until you press the save button, and you always get a message telling you what happened.',
				steps: [
					'Fill in the form.',
					'Press **Save changes** (or **Add**, on a new record).',
					'A small message appears in the corner. Green means it saved. Red means something needs fixing — the field with the problem is marked in red with an explanation under it.'
				],
				notes: [
					'If you close a panel without saving, your typing is discarded. Nothing half-finished is ever kept.',
					'Red messages are not failures on your part. They are the system stopping something that would have caused a problem — a duplicate code, a date in the wrong order, a price above 100%.'
				],
				keywords: ['save', 'error', 'red', 'validation', 'discard']
			},
			{
				id: 'restore',
				title: 'The "Restore originals" button',
				summary:
					'On the content screens, this puts everything back exactly as the website was originally built. It is always safe to press.',
				notes: [
					'Your website ships with a full set of words, pictures and settings built in. When you change one, your version takes over. When you restore, your version is thrown away and the built-in one comes back.',
					'It only affects the screen you are on. Restoring Page Text does not touch your phone numbers, and vice versa.',
					'Use it when a change has gone wrong and you would rather start again than guess what the original said.'
				],
				keywords: ['reset', 'undo', 'default', 'original', 'revert']
			}
		]
	},

	{
		id: 'catalogue',
		title: 'Products and prices',
		blurb: 'The catalogue customers browse, and the specifications and prices behind it.',
		topics: [
			{
				id: 'products-vs-variants',
				title: 'Products and their variants — the important idea',
				summary:
					'A product is the thing you sell. A variant is one exact specification of it, with its own price and stock.',
				where: 'Products → click a product',
				notes: [
					'"PPGI Colour-Coated Sheet" is a product. "PPGI Colour-Coated Sheet, red, 0.4mm, 914mm, 3m" is a variant.',
					'Prices and stock live on the variant, never on the product. That is why a customer picks a colour and a size before they see a price.',
					'A variant with no price is treated as quote-only. It shows "Contact for price" on the website and cannot be added to an order directly.'
				],
				keywords: ['variant', 'sku', 'specification', 'spec', 'price', 'quote only']
			},
			{
				id: 'add-product',
				title: 'Adding a product',
				summary: 'Create the product first, then add a variant for each specification you actually sell.',
				where: 'Products → Add Product',
				steps: [
					'Go to **Products → Add Product** and fill in the name, category and description.',
					'Save it. You land on the product\'s own page.',
					'On that page, add a **variant** for each combination you sell — colour, width, thickness, length.',
					'Give each variant its price and how much you have in stock.'
				],
				notes: [
					'The colours, widths, thicknesses and lengths you can choose from come from their own lists in the Products menu. If the one you need is missing, add it there first.'
				],
				keywords: ['new product', 'create', 'catalogue', 'add']
			},
			{
				id: 'spec-lists',
				title: 'Colours, widths, thicknesses and lengths',
				summary: 'These are the option lists every product is built from. Change one and it changes everywhere.',
				where: 'Products → Colors / Widths / Thickness / Lengths',
				notes: [
					'Colours carry a name, a code and the actual paint colour, so the website can show a real swatch rather than the word "red".',
					'Adding a length here does not add it to any product. It only makes it available to choose when you build a variant.',
					'Do not delete an option that products already use. Mark it inactive instead — that hides it from new work and leaves old orders readable.'
				],
				keywords: ['colour', 'color', 'swatch', 'width', 'thickness', 'gauge', 'length', 'options']
			},
			{
				id: 'price-includes-vat',
				title: 'Prices with and without VAT',
				summary:
					'Each price says whether it already includes VAT. Get this right and every total on the site is right.',
				notes: [
					'If a price **includes VAT**, the system works backwards to find the amount before tax.',
					'If it **excludes VAT**, the system adds tax on top.',
					'You can mix the two across your catalogue. Every total on the website handles both correctly.',
					'The VAT percentage itself is set once, in Business Settings.'
				],
				keywords: ['vat', 'tax', 'inclusive', 'exclusive', 'price']
			},
			{
				id: 'discounts',
				title: 'Putting several products on discount',
				summary: 'Select the products you want, then apply one discount to all of them at once.',
				where: 'Products → tick the rows → Add Discount for Selected Products',
				keywords: ['discount', 'sale', 'reduce', 'offer']
			},
			{
				id: 'suppliers',
				title: 'Suppliers',
				summary: 'Who you buy from. Used by raw materials and purchase orders.',
				where: 'Products → Suppliers',
				keywords: ['supplier', 'vendor']
			}
		]
	},

	{
		id: 'selling',
		title: 'Quotes, orders and getting paid',
		blurb: 'The path a customer takes from asking a question to paying for steel.',
		topics: [
			{
				id: 'quote-flow',
				title: 'How an enquiry becomes a paid order',
				summary: 'Quote request → you price it → customer accepts → payment link → paid.',
				steps: [
					'A customer sends a **quote request** from the website, or builds an order on the Build Your Order page.',
					'It appears under **Quotes**. Open it.',
					'Add the lines they want, with your prices. The totals, VAT and any discount are worked out for you.',
					'Send the offer. The customer gets it by email.',
					'When they accept, send a **payment link**. They pay online and the order moves on.'
				],
				notes: [
					'You can revise an offer as many times as you need. Each revision is kept, so you can see what was offered and when.'
				],
				keywords: ['quote', 'enquiry', 'offer', 'rfq', 'price offer', 'negotiation']
			},
			{
				id: 'orders',
				title: 'The orders screen',
				summary: 'Every confirmed order, in the order it needs to be produced.',
				where: 'Operations → Orders',
				notes: [
					'Marking an order **delivered** sends the customer a notification. Only do it once it has actually gone out.',
					'Adjustments let you change an order after it was agreed — a short delivery, a returned bundle — without rewriting the original.'
				],
				keywords: ['order', 'production queue', 'delivered', 'adjustment', 'status']
			},
			{
				id: 'payment-links',
				title: 'Payment links',
				summary: 'A private link that lets one customer pay for one order. This screen lists every one you have sent.',
				where: 'Operations & stock → Payment Links',
				steps: [
					'The list shows which order each link belongs to, when it was sent, when it expires, and whether it has been paid.',
					'**Live** means it still works. **Paid** means the money came through. **Dead** means it has expired.',
					'Press the red **revoke** button to kill a live link immediately — use it if one went to the wrong address.'
				],
				notes: [
					'The link itself is never shown here, and cannot be. Only a scrambled fingerprint of it is stored, which is what stops anyone digging it out of the system. If a customer has lost their link, send a new one.',
					'A link that has already been paid cannot be revoked. That record is final.'
				],
				keywords: ['pay', 'payment', 'link', 'revoke', 'expired', 'chapa']
			},
			{
				id: 'promo-codes',
				title: 'Promo codes',
				summary: 'Discount codes your sales desk can apply when replying to a quote.',
				where: 'Operations → Promo Codes',
				steps: [
					'Press **Add Promo Code**.',
					'Give it a code, a discount percentage, and a reason so you remember what it was for.',
					'Optionally set a start date, an end date and a maximum number of uses.',
					'Save. It is now available on the quotes screen.'
				],
				notes: [
					'Codes are stored in capitals, so a customer typing "newyear" still matches NEWYEAR.',
					'An end date covers the whole of that day — a code ending 31 December works all day on the 31st.',
					'The status column tells you exactly why a code is or is not usable: **Active**, **Scheduled** (start date not reached), **Expired**, **Used up** (hit its limit) or **Off** (you unticked it).',
					'Raising the usage limit does not reset the count. Codes already given out stay counted.'
				],
				keywords: ['promo', 'coupon', 'voucher', 'discount code', 'expiry']
			}
		]
	},

	{
		id: 'customers',
		title: 'Customers and messages',
		blurb: 'The people who buy from you, and what they have sent you.',
		topics: [
			{
				id: 'customers',
				title: 'Customer records',
				summary: 'Everyone who has ordered or asked for a quote, with their full history.',
				where: 'Customers',
				steps: [
					'Open a customer to see their details.',
					'Open their **history** to see every order they have placed.'
				],
				keywords: ['customer', 'client', 'history', 'contact']
			},
			{
				id: 'messages',
				title: 'Contact form messages',
				summary: 'Everything sent through the Contact Us page on the website.',
				where: 'Operations → Messages',
				notes: [
					'The badge next to Messages counts the ones you have not read yet.',
					'Where a message goes by email is set in Business Settings.'
				],
				keywords: ['message', 'contact form', 'enquiry', 'inbox', 'unread']
			}
		]
	},

	{
		id: 'website',
		title: 'What your website says and shows',
		blurb:
			'Your phone numbers, addresses, opening hours, page wording, pictures and the FAQ — all editable without a developer.',
		topics: [
			{
				id: 'company-details',
				title: 'Company details',
				summary:
					'Two phone numbers, two email addresses, both premises, both maps, your opening hours and five social links — in one place.',
				where: 'Content → Company Details',
				notes: [
					'One save here updates the website header, the footer, the contact page, the maps and the automatic replies your website assistant gives. You never have to change a phone number twice.',
					'Clearing an optional field removes it from the site rather than leaving something blank. Clear TikTok and the TikTok button disappears; clear the second phone line and only the first is shown.',
					'Write phone numbers however you want customers to read them. The tap-to-call link is worked out from what you type.',
					'Addresses and opening hours have an English box and an Amharic box, so editing one language never wipes out the other. Leave the Amharic blank and Amharic visitors see the English.',
					'The holiday notice is blank until you write something. Write in it and a line appears under your opening hours — use it for Genna, Fasika, or any day you are shut.'
				],
				keywords: [
					'phone', 'telephone', 'email', 'address', 'map', 'google maps', 'opening hours',
					'whatsapp', 'telegram', 'facebook', 'instagram', 'tiktok', 'social', 'holiday', 'closed'
				]
			},
			{
				id: 'maps',
				title: 'Changing a map',
				summary: 'Copy the embed link out of Google Maps and paste it in.',
				where: 'Content → Company Details → Addresses & maps',
				steps: [
					'Open Google Maps and find the place.',
					'Press **Share**, then the **Embed a map** tab.',
					'Press **Copy HTML**. You now have a long piece of text.',
					'From that text, copy just the part inside `src="..."` — it starts with https://www.google.com/maps.',
					'Paste it into the map box and save.'
				],
				notes: [
					'If you paste the wrong thing the save is refused with an explanation, rather than leaving a broken map on your contact page.'
				],
				keywords: ['map', 'google maps', 'embed', 'directions', 'pin', 'location']
			},
			{
				id: 'page-text',
				title: 'Page text and headline figures',
				summary:
					'The big numbers on the About and Factory pages, the trust line on the homepage, the closing call-to-action band, the RAL colour swatches and the factory tour video.',
				where: 'Content → Page Text & Figures',
				notes: [
					'The figures are the numbers themselves — "4 core product lines", "2023", "100%". The wording beside each one is not editable here.',
					'The RAL band has four slots. Clear a slot\'s code and that swatch disappears, so the band can show three or two.',
					'Anything written in two languages has an English box and an Amharic box.'
				],
				keywords: ['about page', 'factory page', 'statistics', 'numbers', 'ral', 'colour band', 'call to action', 'cta', 'hero']
			},
			{
				id: 'video',
				title: 'Changing the factory tour video',
				summary: 'Paste any YouTube link and the homepage player follows it.',
				where: 'Content → Page Text & Figures → Homepage video',
				steps: [
					'Open the video on YouTube.',
					'Copy the link — from the address bar, or from the **Share** button. Either works.',
					'Paste it in and save.'
				],
				notes: [
					'Short links, links with a timestamp, Shorts and phone links all work.',
					'Anything that is not a video link — a channel page, a search result — is refused, so the homepage can never end up with an empty player.',
					'The still picture behind the play button is separate. Change it under Site Images when you change the video.'
				],
				keywords: ['video', 'youtube', 'tour', 'player', 'embed']
			},
			{
				id: 'faq',
				title: 'The FAQ',
				summary: 'Add, reword, reorder, hide or delete the questions on the About page.',
				where: 'Content → FAQ',
				steps: [
					'Press **Add Question** for a new one, or click a question to edit it.',
					'Write the question and answer in English, and in Amharic if you can.',
					'Pick an icon that suits the subject.',
					'Use the up and down arrows in the list to change the order they appear in.'
				],
				notes: [
					'Until you make your first change, the list shows the questions your site was built with. The moment you edit, add, reorder or delete anything, all of them become yours to manage.',
					'Leave the Amharic blank and Amharic visitors see the English for that question only.',
					'Untick "Shown on the site" to take a question down temporarily without losing what you wrote.'
				],
				keywords: ['faq', 'question', 'answer', 'reorder', 'hide']
			},
			{
				id: 'site-images',
				title: 'Pictures',
				summary: 'Every photograph on the public website, in one list.',
				where: 'Content → Site Images',
				steps: [
					'Find the picture you want to change in the list — each row says where it appears.',
					'Click **Manage** and upload the new file.',
					'Some rows are galleries and take several pictures. Drag to reorder them.'
				],
				notes: [
					'Rows marked **Default** are still showing the picture the site was built with. Rows marked **Customised** are showing yours.',
					'"Restore default" on a row brings the original picture back.',
					'The logo and the browser tab icon are in this list too, at the top.'
				],
				keywords: ['image', 'picture', 'photo', 'logo', 'favicon', 'gallery', 'upload', 'hero', 'slideshow']
			},
			{
				id: 'testimonials-logos',
				title: 'Testimonials and partner logos',
				summary: 'Customer quotes, and the scrolling strip of client logos.',
				where: 'Content → Testimonials, Content → Partner Logos',
				notes: [
					'A testimonial only appears on the website once it is approved.'
				],
				keywords: ['testimonial', 'review', 'quote', 'partner', 'logo', 'clients']
			},
			{
				id: 'blog',
				title: 'Blog posts',
				summary: 'Write articles for the website, sorted into categories.',
				where: 'Content → Blogs',
				keywords: ['blog', 'article', 'news', 'post', 'category']
			}
		]
	},

	{
		id: 'stock',
		title: 'Stock, production and buying',
		blurb: 'What you hold, what you make, and what you have on order from suppliers.',
		topics: [
			{
				id: 'warehouses',
				title: 'Warehouses',
				summary: 'The places you store finished stock.',
				where: 'Operations & stock → Inventory → Warehouses',
				notes: [
					'One warehouse is marked **default** — that is where a production batch lands unless you choose another. Marking a second one as default automatically un-marks the first, so there is never any doubt.',
					'Untick "In use" to retire a warehouse. Its stock history stays readable.'
				],
				keywords: ['warehouse', 'store', 'location', 'yard', 'default']
			},
			{
				id: 'stock-levels',
				title: 'Stock by warehouse',
				summary: 'How much of each exact specification is sitting in each place.',
				where: 'Operations & stock → Inventory → Stock by Warehouse',
				steps: [
					'Press **Record Stock**.',
					'Choose the product specification, choose the warehouse, and type the count.',
					'Save.'
				],
				notes: [
					'There is only ever one count per specification per warehouse. If you record one that already exists, it updates the existing count instead of creating a second — and tells you it did.',
					'This is separate from the single stock number on the product itself. That one is what the website shows; this one is where it physically is.'
				],
				keywords: ['stock', 'inventory', 'count', 'quantity', 'warehouse', 'stocktake']
			},
			{
				id: 'raw-materials',
				title: 'Raw materials',
				summary: 'The coil, zinc and paint that go into production.',
				where: 'Operations & stock → Production → Raw Materials',
				notes: [
					'Set a **reorder level** and the material is flagged in red once it drops to it. Leave it blank and it is never flagged.',
					'Choose the unit you actually count in — tonnes, kilograms, metres or coils. Everything else on the screen follows that unit.'
				],
				keywords: ['raw material', 'coil', 'zinc', 'paint', 'reorder', 'low stock', 'consumables']
			},
			{
				id: 'production',
				title: 'Production batches',
				summary: 'A record of each run: what went in, what came out, and how much was wasted.',
				where: 'Operations & stock → Production → Batches',
				steps: [
					'Press **Record Batch**.',
					'Give it a batch number, choose what was made, and set the date.',
					'Enter how many pieces came out.',
					'Optionally record which raw material was used and how much, how much scrap there was, who ran it, and which warehouse it went to.'
				],
				notes: [
					'Batch numbers must be unique — they are what a mill certificate is traced by, so the system refuses a repeat.',
					'Scrap is shown as a percentage of the material consumed, not of the pieces made. Those are different units, and comparing them would give a meaningless number.'
				],
				keywords: ['production', 'batch', 'run', 'scrap', 'waste', 'traceability', 'mill certificate']
			},
			{
				id: 'purchase-orders',
				title: 'Purchase orders',
				summary: 'What you have on order from suppliers, and what it will cost.',
				where: 'Operations & stock → Purchase Orders',
				steps: [
					'Press **New Purchase Order**, choose the supplier and save. The order is created empty.',
					'Click the **PO number** to open it.',
					'Press **Add Line** for each thing you are buying.',
					'Update the status as it moves along: draft → ordered → in transit → received.'
				],
				notes: [
					'A line buys either a raw material or a finished product, never both at once — a line naming both would have nothing to receive against, so it is refused.',
					'Leave the unit cost blank until the price is agreed. Unpriced lines simply do not count towards the order value.',
					'The list totals up everything not yet received or cancelled, so you can see at a glance what is committed.'
				],
				keywords: ['purchase order', 'po', 'buying', 'procurement', 'supplier', 'on order', 'receiving']
			}
		]
	},

	{
		id: 'people',
		title: 'Staff and who can log in',
		blurb: 'Two different lists, for two different things.',
		topics: [
			{
				id: 'staff-vs-users',
				title: 'Staff and users are not the same thing',
				summary:
					'Staff are the people you name on factory records. Users are the people who can log into this dashboard.',
				notes: [
					'A machine operator you record against a production batch does not need a login. Put them in **Staff**.',
					'Someone who needs to open this dashboard needs a **User** account, under Admin Panel.',
					'The same person can be in both lists. They are kept separate so you can record who made something without giving them access to your prices.'
				],
				keywords: ['staff', 'user', 'account', 'login', 'employee', 'difference']
			},
			{
				id: 'staff',
				title: 'Staff',
				summary: 'The people named on production batches, purchase orders and damage reports.',
				where: 'Operations & stock → Staff',
				notes: [
					'When someone leaves, untick "Still here" rather than deleting them. Deleting would strip their name off every record they are on; unticking just takes them out of future dropdowns.'
				],
				keywords: ['staff', 'operator', 'employee', 'leaver', 'deactivate']
			},
			{
				id: 'users-roles',
				title: 'User accounts and roles',
				summary: 'Who can log in, and what each of them is allowed to open.',
				where: 'Analytics → Admin Panel → Users / Roles',
				notes: [
					'A role is a named set of permissions. Give someone a role rather than setting their permissions one by one.',
					'Changing someone\'s account signs them out everywhere they are logged in. That is deliberate — it is how you cut off access immediately.'
				],
				keywords: ['user', 'role', 'permission', 'access', 'login', 'password', 'admin']
			}
		]
	},

	{
		id: 'settings',
		title: 'Business settings',
		blurb: 'The two numbers that affect money and who gets told about an order.',
		topics: [
			{
				id: 'vat',
				title: 'The VAT rate',
				summary: 'One field. It changes every total on the website the moment you save.',
				where: 'Analytics → Business Settings → Tax & pricing',
				notes: [
					'This reaches the shopping cart, the Build Your Order summary, checkout, order sheets, receipts, every emailed total and the answers your website assistant gives. There is nowhere left quoting an old rate.',
					'Orders that were already priced keep the rate they were quoted at. Changing this does not rewrite history.',
					'Only change it when the law changes.'
				],
				keywords: ['vat', 'tax', 'rate', '15%', 'percentage']
			},
			{
				id: 'alerts',
				title: 'Where order alerts are sent',
				summary: 'The address that hears about new orders and new quote requests.',
				where: 'Analytics → Business Settings → Alerts',
				notes: [
					'Leave it blank and alerts go to the mailbox the website sends from, which is what happened before this setting existed.',
					'Fill it in to point them at a sales inbox instead. Customers are unaffected — they always get their own confirmations.'
				],
				keywords: ['alert', 'notification', 'email', 'sales inbox', 'who gets']
			},
			{
				id: 'payment-methods',
				title: 'Payment methods',
				summary: 'Which ways to pay appear at checkout.',
				where: 'Analytics → Admin Panel → Payment Methods',
				keywords: ['payment', 'bank', 'checkout', 'method']
			}
		]
	},

	{
		id: 'reports',
		title: 'Reports',
		blurb: 'What has been happening, over a period you choose.',
		topics: [
			{
				id: 'reports',
				title: 'Reading the reports',
				summary: 'Pick a date range and the figures redraw for it.',
				where: 'Analytics → Reports',
				notes: [
					'Use the export button to take any table out as a spreadsheet.'
				],
				keywords: ['report', 'sales', 'figures', 'analytics', 'date range', 'export']
			}
		]
	},

	{
		id: 'questions',
		title: 'Common questions',
		blurb: 'The things people ask in the first week.',
		topics: [
			{
				id: 'q-live',
				title: 'I changed something — why does the website still look the same?',
				summary: 'Refresh the page. If it is still wrong, check you pressed save and saw a green message.',
				notes: [
					'Changes are live immediately; there is no delay and no publishing step.',
					'Your browser sometimes holds on to an old copy of a picture. A hard refresh (Ctrl+Shift+R, or Cmd+Shift+R on a Mac) clears it.',
					'If you were editing Amharic, check you are viewing the site in Amharic — the language switcher is in the website header.'
				],
				keywords: ['not showing', 'not updating', 'cache', 'refresh', 'stale']
			},
			{
				id: 'q-mistake',
				title: 'I have made a mess of a screen. How do I start again?',
				summary: 'Press "Restore originals" on that screen.',
				notes: [
					'It only affects the screen you are on, and it puts back exactly what the website was built with.',
					'There is no equivalent for products, orders or customers — that is your own business data, and it is never overwritten automatically.'
				],
				keywords: ['undo', 'mistake', 'reset', 'start over', 'revert']
			},
			{
				id: 'q-delete',
				title: 'Should I delete things?',
				summary: 'Usually not. Most screens have an "in use" or "shown on the site" tick instead.',
				notes: [
					'Unticking hides something from customers and from future dropdowns, while leaving old records readable.',
					'Deleting is right for something created by mistake that nothing else refers to — a duplicate stock line, a purchase-order line typed twice.'
				],
				keywords: ['delete', 'remove', 'hide', 'deactivate', 'safe']
			},
			{
				id: 'q-language',
				title: 'Which boxes need Amharic?',
				summary: 'Any box labelled "(Amharic)". Leave it blank and Amharic visitors see the English.',
				notes: [
					'Addresses, opening hours, the holiday notice, the homepage call-to-action, the trust line, the factory city and every FAQ question have an Amharic box.',
					'Product names, prices and the rest of the catalogue are shown as you type them, in both languages.'
				],
				keywords: ['amharic', 'language', 'translation', 'english', 'bilingual']
			},
			{
				id: 'q-help',
				title: 'Something here is wrong or missing',
				summary: 'The parts of the website not covered by this manual still need a developer.',
				notes: [
					'Most page wording, the transactional emails, the website assistant\'s knowledge and the page titles Google shows are still set in code.',
					'If you find yourself wanting to change one of those often, say so — the same approach used for the screens in this manual can be extended to them.'
				],
				keywords: ['developer', 'cannot change', 'missing', 'support', 'contact']
			}
		]
	}
];

/** Flat list of every topic with its section, for searching. */
export const ALL_TOPICS = HELP_SECTIONS.flatMap((section) =>
	section.topics.map((topic) => ({ ...topic, sectionId: section.id, sectionTitle: section.title }))
);

export const TOPIC_COUNT = ALL_TOPICS.length;

/**
 * Everything a topic could reasonably be searched by, lowercased once so the
 * filter is a plain substring test rather than a scan of nested arrays on
 * every keystroke.
 */
export function searchIndex(topic: (typeof ALL_TOPICS)[number]): string {
	return [
		topic.title,
		topic.summary,
		topic.where ?? '',
		topic.sectionTitle,
		...(topic.steps ?? []),
		...(topic.notes ?? []),
		...(topic.keywords ?? [])
	]
		.join(' ')
		.toLowerCase();
}
