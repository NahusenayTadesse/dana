# Dashboard Bug Audit — Dana

Audit date: **2026-09-14** · Branch `main` @ `9ecabdb` · Scope: every page under `src/routes/dashboard/**` plus the server modules they call.

Method: static review of every dashboard route, server action and component, cross-checked against the DB schema, and against superforms 2.30.1 and drizzle-orm 0.45.2 source in `node_modules`. Findings marked **✔** were re-checked by hand against the code after review. The rest come from reading the code paths closely, but weren't independently re-traced. Nothing here was run against a live server.

Tooling baseline: `svelte-check` reports **530 errors / 197 warnings** project-wide (395 of the errors are in dashboard + `lib/server`, 318 of those are implicit-`any` noise). The type errors that point at real bugs are called out below.

> The previous audit (2026-08-10) is kept at the bottom of this file. Findings below that re-open or overlap it say so.

## ✅ Fix status — updated 2026-09-14

**Everything below is fixed except D0-1 and D0-2** (deferred by request) and the few partial items listed here.

| Still open | Why |
|---|---|
| **D0-1**, **D0-2** | Deferred — admin-panel role/permission bugs, to be tackled separately. |
| D3-1 (public blog `{@html}`) | Needs a sanitizer dependency (none installed). Dashboard error page part is fixed. |
| D2-3 (users) | `user` has no `is_active` column, so a referenced user is refused with a clear message instead of being deactivated. |
| D2-3 (blog categories) | `blog_categories` has no `is_active`; an in-use category is refused with "used by N posts". |

**Verification:** `vite build` passes. `svelte-check`: 530 → 444 errors, 197 → 70 warnings (remainder is pre-existing typing noise outside these fixes). Runtime smoke test against a throwaway copy of the dev DB with migration 0012 applied: all 48 dashboard pages render with no console/server errors, bad ids return 404, zero duplicate superForm ids on 23 table pages, and these flows were exercised end-to-end — customer detail shows the right customer, delivering deducts warehouse stock and syncs variant/product totals, cancelling restores it, a stock shortfall refuses the save, delivery records `amountPaid`, quote-order lines aren't overwritten, multi-product discounts save, duplicate names give friendly errors, stock remove works, mark-as-read targets the right message.

### Deploy steps
1. **Apply `drizzle/0012_yielding_james_howlett.sql` before deploying the code** (`npm run db:migrate`). It adds `orders.stock_deducted_at`, `purchase_orders.stock_received_at`, a unique index on `stock_levels(variant_id, warehouse_id)`, drops the unique on `discounts.name`, cascades `blog_gallery` deletes, creates a default "Main Warehouse" if none exists and moves existing `product_variants.quantity` into it. `faq_items` / `site_images` / `site_settings` are `CREATE TABLE IF NOT EXISTS` (they were `db:push`ed before).
2. Existing testimonials are still `is_approved = false` — tick "Approved" on the ones to show.

### Behaviour changes to know
- **Stock** lives in `stock_levels` (per warehouse); `src/lib/server/stock.ts` is the only writer. Delivery deducts (default warehouse first), leaving delivered restores, production batches consume raw material and add output, POs add stock once when received. Variant quantity is read-only in the product page — manage it on /dashboard/stock.
- **Discounts** are percentages, applied at checkout and shown as "-X%".
- **Delivered** records the remaining balance as collected (payment method required) and burns open payment links; blocked while a Chapa attempt from the last hour is unconfirmed.
- **Deletes** of referenced products/variants/customers/suppliers archive (`isActive=false`) instead.
- **POs** only move forward; received/cancelled POs are locked. Raw material on-hand is changed via an "Adjust by ±" field. The default warehouse can't be unset without choosing another.
- **Quotes**: an offer can't be sent if lines changed since it was saved; only the latest revision can be sent; lines lock once the order is approved/paid; promo usage counts once, on approval; VAT comes from Business Settings.
- **Orders** created on the dashboard are priced from the price book (quote-only variants must go through a quote). Orders with a price offer can only change items in the quote builder.
- **Tables**: name cells are no longer clickable on catalog/inventory tables — use the Edit column.

New shared modules: `src/lib/server/stock.ts`, `dbErrors.ts`, `params.ts`, `src/lib/slug.ts`, `src/lib/uploadTypes.ts`.

## Counts

| Severity | Meaning | Count |
|---|---|---|
| 🔴 P0 | Security, money, or silent data corruption | 7 |
| 🟠 P1 | Broken or wrong on a common path | 24 |
| 🟡 P2 | Edge-case failures, wrong behaviour | 27 |
| ⚪ P3 | Minor, cosmetic, robustness | 20 |

## Fix these first

1. **D0-1** — every user created in Admin Panel becomes an Admin.
2. **D0-2** — demoted admins keep better-auth admin API access (they can reset a real admin's password).
3. **D0-3** — `/dashboard/customers/[id]` always shows (and saves over) the wrong customer.
4. **D0-4** — quote replies / deletes can hit the wrong customer (shared superForm ids).
5. **D0-5 / D0-6 / D0-7** — order edit + "Delivered" + balance links produce wrong money.

---

# 🔴 P0 — Critical

### D0-1 — Every user created in the admin panel gets the Admin role ✔
`src/routes/dashboard/admin-panel/users/add-users/+page.server.ts:55-60`

The action sets better-auth's `role` from the picked role, then unconditionally writes `roleId: 1`. Role id 1 is `Admin`, so an account added as "Customer" gets the full dashboard — users, roles, orders, payments.

- The same file also `console.log(form)` on line 28, which prints the **plaintext password** of every created user to the server log (old P3-3, still open — should be P1).
- `password` is only `z.string()` (`add-users/schema.ts:6`). better-auth's `createUser` doesn't enforce min length, so a 1-char password is accepted, and an empty one (direct POST) creates a user with no credential account who can never log in.
- `auth.api.createUser` runs outside the `tx`, so the "transaction" doesn't roll anything back if the follow-up update fails.
- Invalid forms return status 500 instead of 400.

**Fix:** `roleId: role` (after checking the id exists in `roles`), remove the `console.log`, `z.string().min(8).max(128)`.

### D0-2 — Demoting an Admin doesn't remove better-auth admin rights ✔
`src/routes/dashboard/admin-panel/users/[id]/+page.server.ts:103-110`, `src/lib/server/auth.ts:41`

The better-auth `admin()` plugin is enabled and trusts the text column `user.role` (`'admin'`). `add-users` sets it; `editUser` only changes `roleId`. A demoted user keeps `role='admin'`, signs back in (edit only clears existing sessions), and can call `/api/auth/admin/set-user-password` on a real Admin, then log in as them. `remove-user`, `update-user`, `list-users` work too. The `/dashboard` POST gate in `hooks.server.ts` doesn't cover `/api/auth/*`.

**Fix:** remove `admin()` from `auth.ts` if nothing uses it (nothing in `src` does). Otherwise keep `user.role` in sync with `roleId` on every create and edit.

### D0-3 — Customer detail page shows the first customer, not the one in the URL ✔
`src/routes/dashboard/customers/[id]/+page.server.ts:21-39`

The customer query has **no `.where()`**, so `rows[0]` is whatever row MySQL returns first. `/dashboard/customers/5` shows customer 1's name, phone, email, TIN and documents (the order counts below are customer 5's). A nonexistent id also shows customer 1 instead of 404.

The edit form is pre-filled from that wrong row (`+page.svelte:70-74`) and the `edit` action writes it into id 5:
- email unchanged → unique-index violation → generic "Something went wrong";
- email "corrected" → customer 5's name/phone/address silently replaced with customer 1's, and the linked `user.email` updated too.

**Fix:** `.where(eq(customers.id, customerId))`, `Number.isInteger` check, `error(404)` when empty.

### D0-4 — Quote reply / read / delete forms can act on the wrong row ✔
`src/routes/dashboard/quotes/reply.svelte:37`, `read.svelte:12`, `delete.svelte:24`, and `src/routes/dashboard/messages/read.svelte:20`, `delete.svelte:24`

None of these per-row forms passes a superForm `id`, so they all share the schema-derived id (and `markRead`/`delete` schemas are identical, so Read and Delete share one id too). After an action, superforms writes the result into the **first mounted instance with that id** (`superForm.js:976-988` — it marks the form in `initialForms` so later instances skip it), not the one submitted.

- Reply to row 3 → row 1's Reply form now holds row 3's `quoteRequestId`. Open row 1's dialog (still showing row 1's history), send → email goes to **row 3's customer**, logged under row 3.
- "Mark as read" row 3 → row 1's Delete form now targets row 3. Delete row 1 → **row 3's quote and its replies are deleted**.

See [D-SYS-1](#d-sys-1--shared-superform-ids-on-per-row-forms) for the other pages with the same bug.

**Fix:** `superForm(data, { id: \`reply-${id}\` })` etc. per row.

### D0-5 — Editing an approved quote order wipes its quoted line items
`src/routes/dashboard/orders/+page.server.ts:442-443` (with `resolveLines` at `:280-292`), `OrderForm.svelte:72-78`

Quote orders appear on the orders page. Their `orderItems` carry length/width/thickness/colour, `priceBasis`, `priceIncludesVat` and a staff-set price. `edit` deletes every line and re-inserts only productId/variantId/quantity with the **catalog** price — a quote-only variant (null price) becomes `'0'`. Spec-only lines (null variant/quantity) load as `0` and can't be saved until a variant is picked, which then destroys the spec. The price offer the customer pays against isn't recomputed, so lines and offer disagree.

**Fix:** block item edits when a `priceOffers` row exists, or route edits through the quote builder.

### D0-6 — Marking an order "Delivered" marks it paid without recording the money ✔
`src/routes/dashboard/orders/+page.server.ts:404-433`

On `status === 'delivered'`, unless a gateway already fully settled it, the action writes `paymentStatus: 'paid'` and `amount = resolved.total` (catalog price × qty — no VAT, no discount, no adjustments). `amountPaid` isn't touched and payment links aren't burned.

- Customer paid a 40% advance (`partially_paid`) → marked "paid", but `/pay/[token]` still sees `amountPaid < total` and charges the balance again. If cash was collected at delivery, they can pay twice.
- Never-paid order → pay page shows the Pay button, but the action refuses "already paid".
- A Chapa attempt in flight: overwriting `amount` changes `expected` in `paymentSettlement.ts:127`, so the real payment fails as "amount short" and is never recorded (and the webhook's 202 stops retries — see D2-5).
- Even the `gatewaySettled` branch overwrites `amount`.
- `gatewayPaid` comes from the client (`schema.ts:34-36`) and isn't re-verified — a POST with `gatewayPaid:true` marks paid with a null method.

**Fix:** never touch `amount` here; record manual collection in `amountPaid`; burn links; refuse while an unsettled `txnRef` exists; derive `gatewayPaid` server-side.

### D0-7 — Balance-link email/SMS quotes the wrong amount (old P0-2/P1-4 fix missed a site) ✔
`src/lib/server/notifications.ts:158-161`

`sendBalancePaymentLink` treats `transaction.amount` (the **in-flight attempt**) as "already paid" and uses `Math.round`. Advance of 40,000 settled; customer starts and abandons the 60,000 balance checkout → "Request Balance" now emails "Already paid 60,000, due 40,000" while the pay page charges 60,000. After D0-6's manual "paid", the email shows a made-up remainder. A sub-1 ETB remainder rounds to 0 and throws "no remaining balance".

**Fix:** `amountPaid = Number(transaction.amountPaid)`, `remaining = round2(total - amountPaid)`.

---

# 🟠 P1 — High

## Systemic

### D-SYS-1 — Shared superForm ids on per-row forms
Same mechanism as D0-4: rows render `superForm(data.xxxForm)` without a unique `id`, so the action result lands in the first mounted instance.

| Where | Effect |
|---|---|
| `orders/OrderForm.svelte:61`, `orders/+page.svelte:141-151` | After editing order #57, another row's edit dialog is filled with #57's id/customer/items — saving it **overwrites #57**. Validation errors land in a hidden dialog. |
| `products/categories/edit.svelte:30`, `colors/edit.svelte:34`, `lengths/edit.svelte:34`, `thickness/edit.svelte:34`, `widths/edit.svelte:34`, `tags/edit.svelte:29` | Edit row C, open row A's sheet → it shows C's data; saving overwrites C. |
| `blog/category/edit.svelte:29` + `delete.svelte:24` | Same; delete can target the wrong category. |
| `testimonials/edit.svelte:33` + `delete.svelte:24` | Same; delete can target the wrong testimonial. |

Lower impact (P3) — the same row renders the edit component twice (name cell + icon cell) with one id, so errors go to the closed instance: `stock/+page.svelte:43,56`, `warehouses`, `raw-materials`, `production`, `staff`, `purchase-orders`, `promo-codes/+page.svelte:52,77`, `faq/+page.svelte:55,76`, `site-images/+page.svelte:43,82`.

**Fix:** always pass `id: \`<kind>-${row.id}\`` (as `faq/row-actions.svelte` and `EditVariant.svelte` already do), and render one dialog per row.

### D-SYS-2 — `dataType: 'json'` forms drop their hidden id, so the action never works ✔
With `dataType: 'json'`, superforms posts `$form` and discards plain inputs. These forms only set the id in a hidden `<input>`, so the server receives `id: 0` and rejects it.

| Where | Effect |
|---|---|
| `stock/remove.svelte:12,28` | "Remove" always says "Nothing to remove". |
| `purchase-orders/[id]/remove-line.svelte:12,25` | "Remove line" never removes. |
| `payment-links/revoke.svelte:11-12,27` | "Revoke" never revokes — a leaked payment link **can't be killed** from the dashboard. Also `+page.server.ts:59-64` reports success when 0 rows changed. |

**Fix:** `untrack(() => { $form.id = row.id })`, as `faq/row-actions.svelte` does.

### D-SYS-3 — Add forms reset their parent id after the first save
With `resetForm: true` (the default), superforms resets to the data the form was **created** with. The parent id is assigned after creation, so it resets to 0 and the second submit fails validation with no visible field error.

- `purchase-orders/[id]/+page.svelte:27-28,42` — second "Add line" on a PO fails.
- `quotes/[id]/LineForm.svelte:90,93` — second "Add line" in the quote builder fails ("Please check the line.").
- `quotes/[id]/+page.svelte:46` — `$offerForm.orderId` is only set at mount if an order already exists. After "Start Order" it stays 0, so "Save Offer" says "Add at least one line" (`saveOffer.orderId` also accepts 0 via `z.coerce.number()`).

**Fix:** put the parent id into the initial `superValidate` data (or read it from `params` on the server), and `.positive()` on the schema.

### D-SYS-4 — `transactions.amount` still read as "money paid" outside checkout
Old P0-2 split `amount` (in-flight attempt) from `amountPaid`, but these still read `amount`:
- `dashboard/+page.server.ts:50-65` — "Payments Collected" also joins `transactions` through `orderItems`, so each order's amount is summed **once per line item** (3 lines × 1,000 ETB = 3,000). ✔
- `reports/[range]/+page.server.ts:25` — "Total Paid" (repeated on each line). ✔
- `lib/server/customerOrderHistory.ts:109`.
- `notifications.ts:158` (D0-7).

In addition, `reports/[range]/+page.server.ts:24` shows `orderItems.amount` as "Line Total" — that column holds a label/SKU (`variant-12`, `qty-3`, or the price basis), not money, and the FilterMenu charts group by it. ✔

**Fix:** sum `amountPaid` in a per-order subquery; compute line totals with `priceLine()`.

## Orders & payments

### D1-1 — Cancelled orders and rejected offers stay payable
`src/routes/pay/[token]/+page.server.ts:17-129, 131-211`

Neither `load` nor `pay` checks `orders.status === 'cancelled'` or offer `status === 'rejected'`, and neither dashboard cancel (`orders/+page.server.ts:437-440`) nor the pay page's `cancelOrder`/`rejectOffer` expires links. `addAdjustment` / `requestBalance` (`:462-533`) also email new links for cancelled orders.

**Fix:** reject cancelled/rejected in `load` and `pay`; expire links on cancel.

### D1-2 — A `bal` payment always closes the order, even if the total grew mid-checkout ✔
`src/lib/server/paymentSettlement.ts:187-188`

`fullySettled = mode === 'bal' || …`. Customer is paying a 60,000 balance on Chapa; staff adds a +5,000 adjustment (new link emailed); the 60,000 settles → status `paid`, **all links burned** including the new one. The extra 5,750 can't be collected.

**Fix:** drop the `mode === 'bal' ||` shortcut; always compare collected vs `adjusted.total`.

### D1-3 — Adjustments on staff-created orders do nothing but report success
`src/routes/dashboard/orders/+page.server.ts:491-527`

Staff-created orders have no `priceOffers` row, so `getAdjustedOrderTotals` returns null. Deduction: `sendOrderAdjustmentNotice` logs and returns (`notifications.ts:198-201`) → UI says "Adjustment applied", no total changes, customer not told. Addition: row inserted, then balance link throws — amount can never be collected. No check that the order exists, is approved, or isn't cancelled.

**Fix:** load order + offer first; refuse when no offer or cancelled.

## Quotes

### D1-4 — A sent offer can be stale relative to its lines
`src/routes/dashboard/quotes/[id]/+page.server.ts:377-451`

Editing a line doesn't invalidate saved offers and `sendOffer` doesn't check. Save revision 1, change a quantity, press Send → email shows the **new** items with the **old** totals, and `/pay/[token]` charges the old total. Also each revision's Send button sends the **latest** revision's email/pay page while setting the transaction amount from the clicked one (`+page.svelte:251`).

**Fix:** refuse to send when any line's `updatedAt` > offer `createdAt`; show Send only on the latest revision.

### D1-5 — Quote builder ignores the Business Settings VAT rate
`src/routes/dashboard/quotes/[id]/+page.server.ts:312`

`calculateOrderPricing` is called without `vatRate`, so it always uses 15%. Emails use `vatRateOf(getSiteSettings())`. Set VAT to 10% → offers still taxed 15% (and the pay page charges it) while the email line table uses 10% and doesn't add up.

**Fix:** pass `vatRate: vatRateOf(await getSiteSettings())`.

### D1-6 — Promo usage counted per saved revision, not per order
`src/routes/dashboard/quotes/[id]/+page.server.ts:305, 360-365`

`timesUsed` increments on every saved revision, before sending/acceptance, and the limit check counts this order's own earlier revisions. A limit-1 code on revision 1 blocks revision 2 ("reached its usage limit"); abandoned drafts use up limits.

**Fix:** count the use once per order, on acceptance or payment.

## Products & catalog

### D1-7 — Adding a discount to 2+ products always fails ✔
`src/routes/dashboard/products/+page.server.ts:159-168`, `src/lib/server/db/schema.ts:277`

`discounts.name` is `UNIQUE`, but the action inserts one row per selected product with the same name → `ER_DUP_ENTRY`, rollback, raw SQL error in a 500 toast. Reusing any existing discount name fails the same way.

Related (P2): the value is labelled "Discount Percentage" but `account/+page.svelte:233` shows it as "-ETB{amount}", and checkout (`orderLines.ts`) never applies it — customers see "-ETB10" and pay full price.

**Fix:** drop the unique on `name` (or a discount + join table); decide whether discounts are applied and label them correctly.

### D1-8 — "View Prices" crashes for products with more than one priced variant ✔
`src/routes/dashboard/products/priceList.svelte:30`, `+page.server.ts:112-118`

`{#each priceList as price (price.amount)}` keys on the basis label ("Per piece"). Rates from all variants are merged, so two variants with a `quantity` rate give duplicate keys → Svelte throws `each_key_duplicate` (also in production) and the popover breaks.

**Fix:** key by variant id + basis (or index); label each rate with its variant.

### D1-9 — Add and edit write product categories to different places ✔
`add-products/+page.server.ts:98,139` vs `products/single/[id]/+page.server.ts:184-194`

Add sets only `products.categoryId`; edit rewrites only the `categoriesProducts` join table. The admin list/detail reads `categoriesProducts` (`products/+page.server.ts:79-86`) → every new product shows "No Categories". The shop filter and related products read `products.categoryId` (`shop/+layout.server.ts:121`, `shop/single/[slug]/+layout.server.ts:115`) → dashboard category edits never reach the storefront.

**Fix:** pick one source of truth and write it in both actions.

### D1-10 — Deleting a product either errors with raw SQL or wipes its history
`src/routes/dashboard/products/single/[id]/+page.server.ts:280` (and variant delete `:505`)

Hard `DELETE`. `order_items.product_id/variant_id` are `no action` → any product ever ordered can't be deleted and the flash shows "Cannot delete or update a parent row…". Same for variants in `production_batches`/`purchase_order_items`. A never-ordered product cascades away `product_adjustments`, `damaged_products`, variants, `variant_prices`, `stock_levels`, discounts — and its image files stay on disk. Deleting a variant silently deletes its `stock_levels`.

**Fix:** soft-delete with `isActive=false` (listings already filter on it).

### D1-11 — Upload validation accepts files the uploader rejects → 500
`add-products/schema.ts:225-227`, `products/single/[id]/variant.schema.ts:8-9`, `testimonials/schema.ts:3-9`, `products/colors/+page.server.ts:73`

Zod accepts `image/heic`, `image/heif`, `application/pdf`; `lib/server/upload.ts` rejects `.heic/.heif`. An iPhone photo passes validation, then `UploadError` is thrown **outside** the `try` (`add-products/+page.server.ts:127-128`, `addVariant :418`, `editVariant :465`, colors edit `:73`) → 500 page. A PDF testimonial avatar is accepted and renders as a broken `<img>`.

**Fix:** align the MIME allowlist with `ALLOWED_EXTENSIONS`; move uploads inside `try`. (Orphaned-file cleanup: D2-12.)

### D1-12 — Supplier email is required on add but never saved ✔
`products/suppliers/add-suppliers/+page.server.ts:40-55`, `suppliers/schema.ts:7`

`email: z.email()` is required although the UI marks it optional, and `email` is left out of the destructure and the insert. Empty → can't save; filled → saved without it.

**Fix:** `z.email().optional().or(z.literal(''))` and include `email` in `.values()`.

## Content

### D1-13 — Testimonials never appear on the public site ✔
`src/routes/+layout.server.ts:132`, `schema.ts:743`

The public query filters `isApproved = true`; the column defaults to false and nothing in `src` ever sets it.

**Fix:** add an "Approved" toggle to the testimonial add/edit forms (or default to true).

### D1-14 — A blog post with gallery images can't be deleted ✔
`src/lib/server/db/schema.ts:38-40`, `blog/single/[id]/+page.server.ts:77`

`blog_gallery.blog_id` has no `onDelete` → delete fails with `ER_ROW_IS_REFERENCED` and an "Unexpected Error" flash. Posts without a gallery delete but leave files on disk.

**Fix:** delete `blogGallery` rows first in a transaction (or `onDelete: 'cascade'`), then unlink files.

### D1-15 — Blog titles with `?`, `#` or `/` produce slugs that 404
`blog/add-blog/+page.svelte:27`, `blog/single/[id]/schema.ts:5`

The slug generator only lowercases and replaces whitespace. "Why PPGI? A guide" → `why-ppgi?-a-guide` → the link routes to slug `why-ppgi` → 404. The server never sanitises. Same for product slugs (`add-products/schema.ts:239`, "roof/tile" makes `/shop/single/[slug]` unreachable).

**Fix:** slugify on the server (`[^a-z0-9-]+` → `-`) in add and edit.

## Inventory

### D1-16 — Stock never moves on its own; every stock screen drifts
`production/+page.server.ts:113,131`, `purchase-orders/[id]/+page.server.ts:178`

- Recording a production batch writes only `production_batches` — no raw material deducted, nothing added to `stock_levels`.
- Setting a PO to `received` only changes its label.
- The default warehouse (`isDefault`) is read nowhere, though the Warehouses page says batches land there.
- Checkout, dashboard orders, settlement and cancel never touch `products.quantity`, `product_variants.quantity`, `stock_levels`, or `raw_materials.quantity_on_hand`.
- Storefront "in stock" reads `product_variants.quantity` (`product-listing.ts:41`), the AI chat reads `products.quantity` (`prompt.ts:56`), the admin products column reads `products.quantity` only (`products/columns.ts:110-120`), and Stock by Warehouse writes only `stock_levels`. Four sources, none connected.

**Fix:** pick one source of truth, then apply atomic `qty = qty ± x` updates in a transaction on batch create, PO → received (once), order delivered/cancelled.

## Messages & admin

### D1-17 — "Mark as Read" on Messages always marks the first unread message ✔
`src/routes/dashboard/messages/read.svelte:40,45`

Every unread row renders `<form id="read">` and its button has `form="read"`, so the browser links every button to the **first** element with that id. Clicking row 5 marks row 1.

**Fix:** remove the `form=` attribute (the button is already inside its form).

### D1-18 — An admin can delete or demote themselves or the last Admin
`src/routes/dashboard/admin-panel/users/[id]/+page.server.ts:81-110, 122-131`

No check against `locals.user.id` and no count of remaining Admins. With one Admin, one click leaves nobody able to open the dashboard; only direct DB access recovers.

**Fix:** refuse when `id === locals.user.id` or when the change leaves zero Admins.

### D1-19 — Duplicate-entry checks never fire (drizzle wraps MySQL errors) ✔
drizzle-orm 0.45.2 throws `DrizzleQueryError` (`mysql-core/session.js:25`); the MySQL `code` is on `err.cause`, so `err.code === 'ER_DUP_ENTRY'` is **always false**. `promo-codes/+page.server.ts:97-106` and `production/+page.server.ts:96-101` already know this and walk `.cause`; 20 other checks don't:

`admin-panel/payment-methods:50,76` · `admin-panel/roles/add-roles:39` · `roles/[id]:85` · `customers:73` · `blog/category:49,72` · `products/categories:54,84` · `products/tags:53,85` · `products/colors:56,88` · `products/lengths|widths|thickness:46,79` · `products/suppliers/add-suppliers:80`

Effects:
- Adding a duplicate shows the raw `"Failed query: insert into … params: …"` text (with the submitted values) in a toast, not the friendly field error.
- Edit handlers are written inverted (`if (err.code === 'ER_DUP_ENTRY') return;` then "name already exists"). Because the check never matches, **every** DB error on edit — FK, too long, connection — is reported as "name already exists".
- 47 dashboard catch blocks concatenate `err.message` into user-facing text, so raw SQL leaks broadly.

**Fix:** move the promo-codes `isDuplicateEntry()` helper to `$lib/server` and use it everywhere; stop echoing `err.message`.

### D1-20 — Dashboard home revenue and daily stats are wrong
`src/routes/dashboard/+page.server.ts:41-47, 66-71`

- `sum(price * quantity)` ignores `priceBasis` (per-metre/area lines count as price × pieces; null quantity counts as 0) and ignores offer totals for quoted orders. Same formula in `customerOrderHistory.ts:66`.
- The filter keeps only orders that are `delivered` **and** created today, so "today's earnings" is usually 0.
- `CURRENT_DATE()` uses the DB session timezone; on a UTC database, Ethiopian orders between 00:00–03:00 count toward the previous day.

(Payments Collected: see D-SYS-4.)

**Fix:** compute from `priceLine()`/offer totals; define "today" (settled or delivered today) in business timezone.

---

# 🟡 P2 — Medium

### D2-1 — Invalid or nonexistent `[id]`/`[range]` params → 500 or blank page
mysql2 sends `NaN` unquoted → `Unknown column 'NaN' in 'WHERE'` (confirmed by the reviewer against the dev DB). Old P2-7 added guards only to some routes.
- 500 on `/abc`: `products/single/[id]/+layout.server.ts:24` (covers `/ranges/*` and `/damaged/*`), `damaged/[range]/+page.server.ts:31`, `admin-panel/roles/[id]/+page.server.ts:30,44,60,91`, `products/suppliers/[id]/+page.server.ts:28`, `blog/single/[id]/+layout.server.ts:24`.
- Blank page instead of 404 for a valid-but-missing id: `products/single/99999` (editable empty form), `quotes/[id]/+page.server.ts:37-41` (Start Order then fails), `customers/[id]/history/+page.server.ts:14-18`.
- `reports/[range]/+page.server.ts:11-14` never validates the range; `/reports/abc` becomes `Invalid Date` → `NULL` and `CalendarDate(NaN,…)`.

**Fix:** `if (!Number.isInteger(id)) error(404)` in each, `error(404)` on empty result, and a param matcher for `[range]`.

### D2-2 — Settings screens show stale values after "Restore originals"
`src/lib/components/dashboard/settings-form.svelte:57-77`

The save form uses `id: 'settings-${screen}'` but `loadSettingsScreen` doesn't pass that id to `superValidate`, so superforms never rebinds from page data; the reset action also puts its form in `page.form`. After reset, the badge says "All original" but inputs still show custom text, and the next Save writes it all back. Affects company-details, page-text, business-settings (including VAT rate). Also `$saveMessage ?? $resetMessage` doesn't subscribe to the reset message once a save message exists.

**Fix:** pass the same `id` in `superValidate`, or `reset({ data })` in the reset form's `onUpdated`; use two separate effects.

### D2-3 — Referenced deletes show raw FK errors
- `customers/[id]/+page.server.ts:144-150` — customer with orders.
- `admin-panel/users/[id]/+page.server.ts:131` — user linked from `customers.user_id` or `quote_replies`; successful deletes null out every `created_by`/`updated_by` (audit trail lost). Delete then redirects to `/dashboard/products` (`+page.svelte:77`).
- `blog/category/+page.server.ts:92-101` — category in use ("Error while deleting category." with no reason).
- `products/suppliers/[id]/+page.svelte:83-91` — posts `?/delete` but **no `delete` action exists** → 404 page; also redirects to `/admin-panel/roles` and only counts products as references.

**Fix:** check references first with a clear message, or soft-disable.

### D2-4 — Customer edit blocks on nullable fields
`customers/[id]/schema.ts:9-13`, `+page.svelte:71,73`

DB `address`/`phone` are nullable, but the schema requires them; pre-fill sets `null`, so client validation blocks save with "Address is Required" though the field shows as optional. The same load `catch` returns `form: null` (`+page.server.ts:77-86`), which makes `superForm(null)` throw instead of showing the fallback.

### D2-5 — Chapa webhook returns 202 for "pending", which stops retries
`src/routes/api/chapa/webhook/+server.ts:74-75`

The comment says a retry should revisit, but 202 is 2xx, so Chapa treats it as delivered. Transient verify failures or D0-6's "amount short" are never retried.

**Fix:** return 5xx for retryable outcomes.

### D2-6 — Order delete isn't guarded or atomic
`orders/+page.server.ts:608-620` — paid/settled orders can be deleted; the `transactions` row is orphaned; offers, links and adjustments cascade; the two deletes aren't in one transaction.

### D2-7 — Adjustment decision can be applied twice
`orders/+page.server.ts:547-566` — checks `status !== 'pending'` then an unconditional UPDATE. Two staff (or approve + reject) both pass, both send notices and, for additions, two balance links. **Fix:** `WHERE id=? AND status='pending'` and check affectedRows.

### D2-8 — Orders list total disagrees with what the customer is billed
`orders/+page.server.ts:67-74, 153` — `SUM(quantity*price)` ignores basis, VAT, discount, adjustments; a null quantity drops the line. A deduction larger than the total makes the adjusted total negative (no upper bound, `schema.ts:69`; also old P2-1).

### D2-9 — Quote discounts can reach ≥100% or overflow
`quotes/[id]/+page.server.ts:292-309,343`, `schema.ts:36` — sales discount + promo add up with no cap; 30% + 80% gives a 0 ETB offer that can be sent, stored as "110.00". Entering 1000 overflows `decimal(5,2)` → 500. Unpriced lines (`price` NULL from the public quote form, or per-length with no length) silently price at 0 (`:320`).

### D2-10 — Quote approve/reject and line edits have no state checks
`quotes/[id]/+page.server.ts:486-508` and `addLine`/`updateLine`/`deleteLine`/`saveOffer` — an order with no lines/offer/payment can be approved; a rejected one approved by direct POST; `orderId` isn't tied to `params.id`; lines/offers stay editable after approval or partial payment (silently changing the balance). Deleting a quote (`quotes/+page.server.ts:87`) leaves its `pending` order orphaned and counted in the sidebar badge.

### D2-11 — Promo end dates drift a day on MySQL
`promo-codes/+page.server.ts:27-28` — `23:59:59.999` into a `timestamp` without fractional seconds: MySQL rounds up to 00:00 next day (MariaDB truncates). The edit dialog then shows the next day, and each re-save adds another day. Server-local `startOfDay/endOfDay` also shifts windows by 3h on a UTC host.

### D2-12 — Uploaded files orphaned on failure, replacement or delete
- Upload inside `db.transaction` with no cleanup: `blog/add-blog/+page.server.ts:46-95` (also no try/catch → 500), `products/single/[id]/+page.server.ts:341` (edit gallery; also skips `form.valid`), `logos/+page.server.ts:29-56`.
- Saved before `try`, never cleaned on 409/500: `add-products:127-128,179-197`, `colors:45,73`, `orders/+page.server.ts:306,370` (receipts).
- Replaced/removed images never unlinked: product featured/variant image (`:154,:465`), blog featured (`blog/single/[id]/+page.server.ts:31`), colors swatch, removed gallery/logo images.

**Fix:** use the `site-images` pattern (`pruneOrphanedUploads` + rollback cleanup) everywhere.

### D2-13 — Stock adjust / damaged actions skip validation and go negative
`products/single/[id]/+page.server.ts:215-269, 290-324`

No `form.valid` check; `quantity` is `z.coerce.string`. Negative "add" subtracts; "remove 500" on 10 leaves -490. `adjust` does three writes (transactions, productAdjustments, products) without a transaction, stores a unit count in the money column `transactions.amount`, and discards the required `costPerItem`/`employeeResponsible`.

**Fix:** `z.coerce.number().int().positive()`, check `form.valid`, one transaction with a `quantity >= n` guard, stop writing `transactions`.

### D2-14 — Duplicate variants aren't blocked
`schema.ts:202-208` — the unique index includes nullable `color_id/width_id/thickness_id/length_id`; MySQL treats NULLs as distinct, so two "Red, no size" variants both insert and the friendly "already exists" message (`+page.server.ts:110-117`) never fires.

### D2-15 — Product edit form rejects existing products
`products/single/[id]/schema.ts:15,22-25` — `brand` required on edit but optional on add; description allows 500 chars but the column is `varchar(255)` → "Data too long" 500.

### D2-16 — Zero price means "quote only" in admin but free at checkout
`products/single/[id]/schema.ts:111`, `+page.svelte:35`, `orderLines.ts:256-264`. **Fix:** `.positive()` or treat 0 as null.

### D2-17 — Purchase orders: no status guard; lines can move between POs
`purchase-orders/[id]/+page.server.ts:127-195`, `purchase-orders/+page.server.ts:94` — `received → draft → received` allowed; lines editable after receipt; line updates aren't scoped to `params.id`, so changing `purchaseOrderId` moves a line to another PO. Becomes double-counted stock once D1-16 is fixed.

### D2-18 — Warehouse "transaction" doesn't use `tx`
`warehouses/+page.server.ts:52-60, 76-87` ✔ — `db.transaction(async () => …)` uses the pool `db`, so `clearOtherDefaults` and the insert/update run outside the transaction. A failure leaves no default warehouse; two admins can both set default.

### D2-19 — `stock_levels` has no unique `(variant_id, warehouse_id)`
`schema.ts:528`, `stock/+page.server.ts:61-83, 98-114` — check-then-write; two concurrent adds create two rows and the total double-counts. **Fix:** unique index + `onDuplicateKeyUpdate`.

### D2-20 — Optional pickers can't be cleared
`SelectComp.svelte`, `ComboboxComp.svelte:70` (PO `line-fields.svelte:17-18`, production, raw-materials) — no "None" option. A PO line with a raw material can't be switched to a variant (the "not both" rule blocks save); supplier/warehouse/producer can't be unset.

### D2-21 — Thickness rejects 3-decimal gauges; dimensions accept 0
`thickness/schema.ts:9,23` — regex allows 2 decimals, column is `decimal(10,3)` ("because 0.425mm matters"). Lengths/widths/thickness all accept `0`.

### D2-22 — Blog slugs can duplicate
`schema.ts:28`, `add-blog/+page.server.ts:54-64`, `blog/single/[id]/+page.server.ts:37` — no unique index; add appends `-1` only once; edit doesn't check. `/blogs/[slug]` uses `.limit(1)` → one post unreachable.

### D2-23 — FAQ ordering breaks after deletions; "Restore originals" has no confirm
`faq/+page.server.ts:83, 160-179` — move assigns list positions instead of swapping; add uses `rows.length`; remove doesn't renumber, so gaps put new/moved items in the wrong place. `faq/+page.svelte:113-122` — one click runs `db.delete(faqItems)`.

### D2-24 — Balance/adjustment dialog preview uses flat VAT (old P2-1, still open)
`orderAdjustments.ts:56-64`, `OrderAdjustments.svelte:68-77`.

### D2-25 — Public quote form 500s for returning guests who signed up
`src/routes/quotes/+page.server.ts:168-178, 274-283` — guest quote creates a `customers` row with their email; after signup, the next quote inserts a second customer with the same email → unique violation, raw Drizzle text in toast. **Fix:** look up by email and link `userId`.

### D2-26 — `addCustomer` action is broken (overlaps old P3-7)
`customers/+page.server.ts:46-53` — destructures `firstName, lastName, gender`, inserts undefined `name` (ReferenceError), never sets required `email`. UI is commented out but the action is still POST-able. **Fix:** delete it.

### D2-27 — Dead links across the dashboard (404)
- `/dashboard/users/{id}` and `/dashboard/users/add-users`: `admin-panel/users/data-table-actions.svelte:27`, `users/+page.svelte:26`, `roles/data-table-actions.svelte:27`, `roles/+page.svelte:26`, `roles/[id]/columns.ts:49`, `payment-methods/+page.svelte:53`, product `ranges`/`damaged` columns. Real route: `/dashboard/admin-panel/users/…`.
- `/dashboard/files/<name>/undefined` receipt links: `ranges/[range]/columns.ts:61-66`, `data-table-actions.svelte:31-40`; real route `/files/[name]`. `reports/[range]/columns.ts:97-100` links `/files/null` when no receipt.
- `/dashboard/staff/undefined` ("Damaged By", `damaged/[range]/columns.ts:48-53`, `damagedById` not selected).
- `products/single/[id]/damaged/+page.server.ts:7` redirects to `/dashboard/products/${id}/damaged/…` (missing `/single`).
- Sidebar `/dashboard/products/add-suppliers` (`app-sidebar.svelte:68`; real: `products/suppliers/add-suppliers`).
- Header search `Search.svelte:16-18,26-27`: `orders/all-orders`, `orders/cancelled`, `orders/delivered`, `recipes/*`.
- `AddCustomer.svelte:18` default action `/dashboard/cusotmers`.

---

# ⚪ P3 — Low

- **D3-1** — `dashboard/+error.svelte:8` renders `{@html page.error?.message}`. No current error includes user input, but it's one message away from XSS. Use `{page.error?.message}`. Similarly public `blogs/[id]/+page.svelte:170` renders unsanitised `{@html item.content}` (admin-only input today).
- **D3-2** — Payment methods have no active toggle; `orders/+page.server.ts:194` lists all methods while `customers/[id]` filters active.
- **D3-3** — Edit/delete on a nonexistent user or payment method reports success (`users/[id]:103-116,131-133`, `payment-methods:70-74`). Editing a user with no role coerces `roleId` to 0 → FK error shown raw (`users/[id]/schema.ts:6`).
- **D3-4** — `admin-panel/+page.svelte:11` typo `<svele:head>` — page title never set.
- **D3-5** — Double-click "Start Order" can create duplicate customer/order (`quotes/[id]/+page.server.ts:168-191`; `ensureQuoteCustomer` outside try, no transaction, `params.id` not NaN-checked).
- **D3-6** — Quote builder promo dropdown lists expired/scheduled/used-up codes (`quotes/[id]/+page.server.ts:130`).
- **D3-7** — Dashboard-added quote lines store the price basis as their label (`amount: basis`), so customer history shows "quantity" as the item label.
- **D3-8** — SMS-only quote reply always reports success (`quotes/+page.server.ts:126-128`; `sendSmsToEthPhone` never throws). Offer SMS uses `customers.phone`, which can be null though the quote has a phone.
- **D3-9** — Quote status "converted" is never set; the list filter for it is dead.
- **D3-10** — Orders load runs ~2 queries per row (`orders/+page.server.ts:184-189`); "Request Balance" shows on every row, including pending/offer-less orders.
- **D3-11** — Customer tables: email column `accessorKey: 'Email'` vs `email` in data (search can't find by email, `customers/columns.ts:50`); cancelled-orders row labelled "Number of Delivered Orders" (`customers/[id]/+page.svelte:38`); edit error sets both flash and message → two toasts (`:130-132`); read inside tx uses `db` not `tx` (`:115`).
- **D3-12** — Report end date uses `new Date('YYYY-MM-DD')` (UTC) then local `setHours` (`lib/global.svelte.ts:75-76`) — drops the last day on servers behind UTC. Same UTC/local mismatch in `lib/dateFields.ts:13` shifts production/PO dates back a day per save on such servers.
- **D3-13** — Zod schemas lack `.max()` matching column sizes (`stock_levels.quantity` int, `raw_material_consumed` decimal(12,3), PO `unit_cost` decimal(10,2)) → generic 500; PO quantity 0.0001 passes `gt(0)` and stores 0.000.
- **D3-14** — PO value differs by a cent between list (SQL sum) and detail (per-line rounding) (`purchase-orders/+page.server.ts:33` vs `[id]:91,101`). PO detail head-form toasts are swallowed by `$message ?? $headMessage` (`[id]/+page.svelte:52-61`).
- **D3-15** — Raw material edit overwrites on-hand with the dialog's stale value (`raw-materials/+page.server.ts:60`); last writer wins.
- **D3-16** — Optional fields can't be cleared on edit: superforms sends `undefined`, drizzle skips it (`suppliers/[id]/schema.ts:17`, `testimonials/schema.ts:25`). Map `''` → `null`.
- **D3-17** — `tags.name` has no unique index (duplicate handler never runs); names never trimmed, so " Red" and "Red" coexist.
- **D3-18** — Dead/incorrect code: `products/single/[id]/variants.+page.server.ts` is never loaded by SvelteKit and imports non-existent `addVariant`/`editVariant`; `AddVariant.svelte:9` imports a type from the wrong file; `dashboard/columns.ts` unused; `products/+page.server.ts:14`, `admin-panel/users/+page.server.ts:3` and `reports/[range]/+page.server.ts` import `PageServerLoad` from `'../$types'` (wrong route — hides param/data type errors); `products/+page.svelte:123` filters on nonexistent `'prices'`.
- **D3-19** — Blog table renders raw HTML text (`blog/columns.ts:78`, `BigText` ignores `html: true`); gallery images have no `orderBy` (`products/single/[id]/+layout.server.ts:48-51`); editGallery re-toasts the last message when an image is removed (`editGallery.svelte:12`).
- **D3-20** — Staff phone is unvalidated free text; dashboard reorder list includes inactive products (`dashboard/+page.server.ts:9-15`); unused `today` variable.

---

## Checked and found OK

- Admin gate: `hooks.server.ts` blocks non-GET `/dashboard` requests for non-admins; `hooks.ts` reroute removes the locale prefix, so `route.id` still starts with `/dashboard`. No `+server.ts` under `/dashboard`. The Admin role can't be renamed or deleted; roles with users can't be deleted.
- Payment settlement claim is atomic and idempotent; pay page uses `amountPaid` + `round2`; webhook HMAC runs on the raw body; link tokens are hashed.
- Orders `add`/`edit` run in transactions; notifications go out after commit; mail failure doesn't fail the action. `RequestBalance`, `OrderAdjustments`, `DecideAdjustment`, `EditVariant`, `VariantPrices`, `SendOffer`, `DecideOrder`, FAQ row actions use per-row ids.
- Uploads use UUID names, an extension allowlist (SVG blocked), and path-traversal guards in `/files/[name]` and `deleteUploadedFile`. Site-images slot rules, pruning and rollback cleanup work.
- Promo codes: duplicate detection walks `.cause` correctly, percentage bounded 0–100, offers snapshot the discount.
- PO `[id]` returns 404 for bad ids; form ids validated; duplicate batch numbers caught.
- Double submit is blocked by superforms' default `multipleSubmits: 'prevent'`.
- Sidebar message badge refreshes via `invalidateAll`.
- Deployment note (not verifiable from the repo): CSRF and better-auth both depend on `ORIGIN` exactly matching the public https host — `www.` and the bare domain can't both work without `trustedOrigins`.


---
---

> **Previous audit (2026-08-10) below — kept for its fix history. Where it conflicts with the audit above, the audit above is current.**

# Bug & Error Report — Dana

Audit date: 2026-08-10 · Branch `main` @ `91c8886`

Baseline from tooling: `svelte-check` reported **680 errors and 216 warnings across 161 files**.
Most of those were downstream of two systemic issues ([P1-10](#p1-10--infer-schema-is-applied-to-data-types-not-schemas), [P2-9](#p2-9--250-implicit-any-errors-in-table-column-definitions));
the findings below are the ones with real runtime or business impact.

**42 findings**, organized by severity.

---

## ✅ Fix status — updated 2026-08-10

**29 of 42 fixed** — every P0 and every P1. `vite build` passes; `svelte-check` is down
from **680 → 567 errors**.

| Severity | Fixed | Remaining |
|---|---|---|
| 🔴 P0 | **4 / 4** | — |
| 🟠 P1 | **15 / 15** | — |
| 🟡 P2 | **9 / 14** | P2-1 (adjusted totals), P2-4 (chat rate limit), P2-9 (implicit `any`), P2-11 (stock validation), P2-14 (root layout perf) |
| ⚪ P3 | 1 / 9 | P3-1 fixed alongside P2-8; P3-3 partly (the two PII/debug logs that mattered); the rest untouched |

The 567 remaining type errors are almost entirely **P2-9** — implicit `any` in TanStack
column definitions, which needs the `ColumnDef<T>` generic supplied per table. Mechanical,
but it touches ~40 files and no runtime behaviour, so it hasn't been started.

### Schema changes requiring a migration

Two columns were added to `transactions`, with **data backfills** — deploy the migrations
before the app code:

- `drizzle/0010_nasty_master_mold.sql` — adds `amount_paid`, backfills from `amount` for
  already-settled rows. Without the backfill every historically paid order reads as unpaid
  and gets re-invoiced.
- `drizzle/0011_aromatic_iron_man.sql` — adds `settled_txn_ref`, backfills from `txn_ref`.
  Without it, the first visit to an old paid order's link re-settles it and re-sends the receipt.

### New modules

| File | Purpose |
|---|---|
| `src/lib/server/orderLines.ts` | Resolves cart lines against the catalog. The boundary that makes "prices are never trusted from the client" actually true. |
| `src/lib/server/paymentSettlement.ts` | The single idempotent, atomic place an order becomes paid. |
| `src/routes/api/chapa/webhook/+server.ts` | The Chapa webhook that was documented but never written. |
| `src/lib/vat.ts` | Shared VAT arithmetic — was reimplemented three times, wrongly in the cart. |
| `src/lib/units.ts` | The unit enums, so row types stop being hand-widened to `string`. |

### Two things worth knowing

1. **[P0-4](#p0-4--order-is-marked-paid-inside-a-load-function-get-side-effect) is fixed in substance, not in form.** The race and the double-send are gone — settlement
   is now one conditional `UPDATE` that exactly one caller can win — and the webhook is now the
   primary path. But `/complete`'s `load` still calls the settle function as a fallback, so a
   GET can still trigger settlement. That is deliberate: it only ever settles what Chapa has
   already confirmed, and removing it would mean a customer who returns before the webhook
   arrives sees "pending" with no way forward. Flagging it because the finding as written asked
   for the side effect to be removed entirely.

2. **[P1-10](#p1-10--infer-schema-is-applied-to-data-types-not-schemas) was larger than reported** — 22 sites, not 12; my original grep only matched the
   `as schema` alias. Restoring real typing immediately exposed two genuine bugs that the `{}`
   fallback had been hiding: `quotes/delete.svelte` imported `DeleteTestimonial` from a schema
   file that **never exported it**, and three gallery editors assigned a `string[]` to a field
   the server parses with `.split(',')`. Both fixed.

Everything below is the original report; fixed items are marked **✅ Fixed** with a one-line note.

---

## Severity scale

| | Level | Meaning |
|---|---|---|
| 🔴 | **P0 — Critical** | Money is lost or mis-charged, or an attacker controls something they shouldn't. Ship a fix before the next release. |
| 🟠 | **P1 — High** | Feature is broken, crashes on real input, or silently discards user data. |
| 🟡 | **P2 — Medium** | Wrong results in edge cases, weak validation, or safety nets that don't hold. |
| ⚪ | **P3 — Low** | Hygiene, dead code, noise, performance headroom. No user-visible failure. |

## Counts

| Severity | Count | Areas affected |
|---|---|---|
| 🔴 P0 | **4** | Payments (3), Checkout pricing (1) |
| 🟠 P1 | **15** | Payments (4), Checkout (3), Crashes (3), Types (2), Auth (1), Files (1), Cart (1) |
| 🟡 P2 | **14** | Payments (2), Auth (3), Crashes (2), Cart (2), Types (2), Files (1), Checkout (1), Perf (1) |
| ⚪ P3 | **9** | Hygiene (7), Perf (1), Files (1) |

## At a glance

| ID | Severity | Area | Finding |
|---|---|---|---|
| [P0-1](#p0-1--client-supplied-prices-are-written-straight-into-orderitems) | 🔴 | Checkout | Client-supplied prices written straight into `orderItems` |
| [P0-2](#p0-2--transactionsamount-is-overwritten-before-payment) | 🔴 | Payments | `transactions.amount` overwritten before payment, corrupting "already paid" |
| [P0-3](#p0-3--chapa-verification-never-checks-the-amount-actually-paid) | 🔴 | Payments | Chapa verification never checks the amount actually paid |
| [P0-4](#p0-4--order-is-marked-paid-inside-a-load-function-get-side-effect) | 🔴 | Payments | Order marked paid inside a `load` function (GET side effect + race) |
| [P1-1](#p1-1--the-chapa-webhook-verifier-is-documented-but-does-not-exist) | 🟠 | Payments | Chapa webhook verifier documented but never written |
| [P1-2](#p1-2--markpaymentlinkused-burns-every-link-for-the-order) | 🟠 | Payments | `markPaymentLinkUsed` burns every link for the order |
| [P1-3](#p1-3--a-settled-advance-payment-displays-as-paid) | 🟠 | Payments | A settled advance payment displays as "paid" |
| [P1-4](#p1-4--money-rounded-to-whole-units) | 🟠 | Payments | Money rounded to whole units in four places |
| [P1-5](#p1-5--customer-account-pages-leak-store-wide-business-metrics) | 🟠 | Auth | Customer account pages leak store-wide business metrics |
| [P1-6](#p1-6--blogsid-throws-a-500-on-any-unknown-slug) | 🟠 | Crashes | `/blogs/[id]` throws a 500 on any unknown slug |
| [P1-7](#p1-7--saveuploadedfile-crashes-on-undefined-despite-advertising-it) | 🟠 | Crashes | `saveUploadedFile` crashes on `undefined` despite advertising it |
| [P1-8](#p1-8--accountorders-reads-a-column-it-never-selected) | 🟠 | Crashes | `account/orders` reads a column it never selected |
| [P1-9](#p1-9--stat-cache-invalidation-targets-the-wrong-path) | 🟠 | Files | Stat-cache invalidation targets the wrong path |
| [P1-10](#p1-10--infer-schema-is-applied-to-data-types-not-schemas) | 🟠 | Types | `Infer<schema>` applied to data types — form typing is entirely fake |
| [P1-11](#p1-11--db-row-types-are-cast-into-stricter-component-prop-types) | 🟠 | Types | DB row types cast into stricter component prop types |
| [P1-12](#p1-12--cart-totalprice-mixes-vat-inclusive-and-vat-exclusive-prices) | 🟠 | Cart | `totalPrice` mixes VAT-inclusive and VAT-exclusive prices |
| [P1-13](#p1-13--uploads-happen-inside-a-db-transaction-and-leak-on-rollback) | 🟠 | Checkout | Uploads inside a DB transaction leak on rollback |
| [P1-14](#p1-14--docs-is-only-saved-for-brand-new-customers) | 🟠 | Checkout | `docs` upload only saved for brand-new customers |
| [P1-15](#p1-15--every-product-row-is-loaded-to-validate-a-handful-of-ids) | 🟠 | Checkout | Full `products` table scan on every checkout |
| [P2-1](#p2-1--adjusted-totals-silently-drop-the-discount-and-re-tax-vat-inclusive-lines) | 🟡 | Payments | Adjusted totals drop the discount and re-tax VAT-inclusive lines |
| [P2-2](#p2-2--discountpercentage-is-unvalidated) | 🟡 | Payments | `discountPercentage` unvalidated — negative totals possible |
| [P2-3](#p2-3--admin-gate-depends-on-a-parent-load-and-returns-instead-of-throws) | 🟡 | Auth | Admin gate depends on a parent load and `return`s instead of throws |
| [P2-4](#p2-4--the-ai-chat-rate-limit-is-trivially-bypassed) | 🟡 | Auth | AI chat rate limit trivially bypassed (cookie-only) |
| [P2-5](#p2-5--sendresetpassword-swallows-email-failures) | 🟡 | Auth | `sendResetPassword` swallows email failures |
| [P2-6](#p2-6--accountorders-swallows-its-own-404) | 🟡 | Crashes | `account/orders` swallows its own 404 and masks DB outages |
| [P2-7](#p2-7--numberparamsid-is-never-nan-checked) | 🟡 | Crashes | `Number(params.id)` never NaN-checked (8 sites) |
| [P2-8](#p2-8--mimeslookup-returns-an-empty-string-or-a-function) | 🟡 | Files | `mimes.lookup` returns `''` or a function instead of a fallback |
| [P2-9](#p2-9--250-implicit-any-errors-in-table-column-definitions) | 🟡 | Types | ~250 implicit-`any` errors in table column definitions |
| [P2-10](#p2-10--nodemailer-has-no-type-declarations) | 🟡 | Types | `nodemailer` has no type declarations |
| [P2-11](#p2-11--no-stock-validation-on-add-or-quantity-update) | 🟡 | Cart | No stock validation on add or quantity update |
| [P2-12](#p2-12--dead-null-check-contradicts-the-declared-type) | 🟡 | Cart | Dead null-check contradicts the declared `price` type |
| [P2-13](#p2-13--a-logged-in-user-with-no-customer-row-creates-an-orphaned-order) | 🟡 | Checkout | Logged-in user with no customer row creates an orphaned order |
| [P2-14](#p2-14--the-root-layout-runs-6-unfiltered-queries-on-every-request) | 🟡 | Perf | Root layout runs 6 unfiltered queries on every request |
| [P3-1](#p3-1--cache-control-header-computed-from-a-separately-parsed-extension) | ⚪ | Files | `Cache-Control` computed from a separately parsed extension |
| [P3-2](#p3-2--sequential-awaits-where-queries-are-independent) | ⚪ | Perf | Sequential awaits where queries are independent |
| [P3-3](#p3-3--debug-logging-left-in-production-paths) | ⚪ | Hygiene | Debug logging left in production paths (incl. PII) |
| [P3-4](#p3-4--two-generated-paraglide-directories) | ⚪ | Hygiene | Two generated paraglide directories, one committed |
| [P3-5](#p3-5--58-mb-of-build-tarballs-in-the-working-tree) | ⚪ | Hygiene | 58 MB of build tarballs in the working tree |
| [P3-6](#p3-6--mixed-zod-import-styles) | ⚪ | Hygiene | Mixed `zod` / `zod/v4` import styles |
| [P3-7](#p3-7--copy-pasted-component-wired-to-the-wrong-endpoint) | ⚪ | Hygiene | Copy-pasted component wired to the wrong endpoint |
| [P3-8](#p3-8--216-state_referenced_locally-warnings) | ⚪ | Hygiene | 216 `state_referenced_locally` warnings |
| [P3-9](#p3-9--unused-imports-across-server-loads) | ⚪ | Hygiene | Unused imports across server loads; lint not gating |

---

# 🔴 P0 — Critical

> Money is lost or mis-charged, or an attacker controls something they shouldn't.

### P0-1 — Client-supplied prices are written straight into `orderItems`

> **✅ Fixed.** `price`/`priceIncludesVat` removed from the checkout schema; every priced field now resolved from the catalog in `src/lib/server/orderLines.ts`, which also rejects a variant submitted under a product it doesn't belong to.

**Area:** Checkout · `src/routes/checkout/schema.ts:14` + `src/routes/checkout/+page.server.ts:154`

```ts
// schema.ts
price: z.number().optional(),
priceIncludesVat: z.boolean().optional(),

// +page.server.ts
price: p.price != null ? String(p.price) : null,
priceIncludesVat: p.priceIncludesVat ?? false,
```

`price`, `priceIncludesVat`, `width`, `thickness`, `length` and `colorId` all arrive from the browser
and are persisted without ever being checked against `productVariants`. A crafted POST sets any
price it likes. Those `orderItems` rows are exactly what `pricing.ts` later prices the quote from
(`unitPrice`, `priceIncludesVat`), and what the payment page renders back to the customer.

The header comment in `pricing.ts:5-6` asserts this data is *"never trusted from the client"* — but
at the point it enters the DB, it is.

**Fix:** re-resolve every priced field server-side from `variantId`; never accept `price` from the wire.

---

### P0-2 — `transactions.amount` is overwritten before payment

> **✅ Fixed.** `transactions.amountPaid` added (migration 0010, with backfill). `amount` is now only the in-flight attempt; every "already collected" read uses `amountPaid`.

**Area:** Payments · `src/routes/pay/[token]/+page.server.ts:203-206`

```ts
await db.update(transactions)
    .set({ txnRef: txRef, amount: String(payAmount) })
    .where(eq(transactions.id, transaction.id));
```

The single `transactions` row is reused for every attempt on an order, so one column is made to mean
two different things: *"amount already collected"* (read at `:161-164` and `:100-103`) and *"amount of
the attempt currently in flight"* (written here).

Failure scenario:

1. Customer pays a 40% advance on a 100,000 order → `amount = 40000`, `paymentStatus = partially_paid`.
2. Customer opens the balance link. `pay` computes `payAmount = 60000` and **overwrites `amount` to
   `60000`** before redirecting to Chapa.
3. Customer abandons checkout at Chapa.
4. On any later visit, `amountPaid` reads `60000` (not the 40000 actually collected), so
   `remainingBalance = 100000 - 60000 = 40000`.

The customer is invoiced 40,000 for a balance that is really 60,000 — a **20,000 shortfall the system
will then mark as fully paid**. Both `load` (`:105`) and `pay` (`:179`) are wrong the same way.

**Fix:** separate columns for collected vs. attempted, or a per-attempt transaction row.

---

### P0-3 — Chapa verification never checks the amount actually paid

> **✅ Fixed.** `settlePaymentAttempt()` now checks `data.amount` against the expected charge, `data.tx_ref` against the ref we generated, and the currency, before writing status.

**Area:** Payments · `src/routes/pay/[token]/complete/+page.server.ts:65`

```ts
const isPaid = verification?.status === 'success' && verification?.data?.status === 'success';
```

The only thing checked is that *some* transaction under this `tx_ref` succeeded. The response's
`data.amount` and `data.currency` are never compared against the expected `payAmount`, and
`data.tx_ref` is never confirmed to equal the ref that was sent. Any mismatch between what was
charged and what was expected — a Chapa-side bug, a partial capture, a currency discrepancy, a
re-used ref — silently marks the order `paid`.

**Fix:** assert `Number(data.amount) >= expected` **and** `data.tx_ref === transaction.txnRef` before
writing status.

---

### P0-4 — Order is marked paid inside a `load` function (GET side effect)

> **✅ Fixed.** Settlement is now one conditional `UPDATE` on `settledTxnRef` (migration 0011) that exactly one caller can win — race and double-email gone. See the caveat in the fix-status section above about the remaining read-path fallback.

**Area:** Payments · `src/routes/pay/[token]/complete/+page.server.ts:82-92`

The DB writes (`transactions.paymentStatus`, `markPaymentLinkUsed`) and the confirmation email all
fire from a `load`, which is a GET handler. Consequences:

- SvelteKit **prefetches** `load` on link hover / `data-sveltekit-preload-data`, and re-runs it on
  client-side navigation and `invalidateAll()`.
- Two concurrent GETs both pass the `link.usedAt` guard at `:37` before either commits — a classic
  check-then-act race. The comment at `:88-89` explicitly relies on that guard to make the email
  fire once; it does not hold under concurrency.
- Browser or proxy prefetch of the return URL can settle a payment with no user action.

**Fix:** move to a POST action or a real webhook, and make the write itself the mutex
(`UPDATE ... WHERE usedAt IS NULL`).

---

# 🟠 P1 — High

> Feature is broken, crashes on real input, or silently discards user data.

### P1-1 — The Chapa webhook verifier is documented but does not exist

> **✅ Fixed.** `src/routes/api/chapa/webhook/+server.ts` added, with HMAC-SHA256 signature verification against `CHAPA_WEBHOOK_SECRET`; `callbackUrl` now points at it instead of the return page.

**Area:** Payments · `src/lib/server/chapa.ts:103-109`

The file ends with a doc comment describing a function — *"Best-effort check that a webhook POST
actually came from Chapa"* — followed by a stray `// src/lib/server/chapa.ts` and EOF. The function
was never written, and `grep -rn "webhook" src/` finds no webhook route anywhere. The `callbackUrl`
passed to Chapa at `pay/[token]/+page.server.ts:219` points at the `/complete` **page**, not a
webhook endpoint.

Payment confirmation therefore depends entirely on the customer's browser returning to the site. If
they close the tab after paying, the order is never marked paid.

---

### P1-2 — `markPaymentLinkUsed` burns every link for the order

> **✅ Fixed.** Renamed `markPaymentLinksUsed`, now guarded with `isNull(usedAt)` and only called once the order is **fully** settled — an advance no longer burns links already emailed out.

**Area:** Payments · `src/lib/server/paymentLinks.ts:50-52`

```ts
await db.update(paymentLinks).set({ usedAt: new Date() }).where(eq(paymentLinks.orderId, orderId));
```

Scoped to `orderId`, not to the link actually used, and with no `usedAt IS NULL` guard. After an
**advance** payment succeeds, every outstanding link for that order is invalidated — including ones
already emailed to the customer. It also rewrites `usedAt` on links consumed earlier, destroying the
audit trail of when each was used.

**Fix:** `eq(paymentLinks.id, link.id)`, plus an `isNull(usedAt)` guard.

---

### P1-3 — A settled advance payment displays as "paid"

> **✅ Fixed.** `/complete` returns `fullySettled` + `remainingBalance`; the page shows "Advance payment received" with the outstanding balance and a pay-the-balance button.

**Area:** Payments · `src/routes/pay/[token]/complete/+page.server.ts:37-39`

```ts
if (link.usedAt) {
    return { status: 'paid' as const, orderId: order.id, token: params.token };
}
```

The early return is unconditional on the payment *kind*. A customer who paid only a 40% advance and
revisits the link is told the order is `paid`, with no mention of the outstanding balance. The branch
needs to distinguish `partially_paid` from `paid`.

---

### P1-4 — Money rounded to whole units

> **✅ Fixed.** All four sites use `round2`, matching `pricing.ts` and `orderAdjustments.ts`.

**Area:** Payments · `src/routes/pay/[token]/+page.server.ts:94, 105, 179, 181`

```ts
const advanceAmount = advanceAvailable ? Math.round(total * (advancePercentage / 100)) : total;
```

`Math.round` discards sub-unit precision, while `getAdjustedOrderTotals` and `calculateOrderPricing`
both carry 2-decimal values via `round2`. An advance and its balance can therefore fail to sum to the
total by up to 1 unit, leaving an order permanently a fraction short of settled — which then trips
the `total - amountPaid <= 0` guard at `:168` incorrectly.

**Fix:** use `round2` consistently.

---

### P1-5 — Customer account pages leak store-wide business metrics

> **✅ Fixed.** Pending-order count is now scoped to the customer's own orders; the unread-contact-messages count (a staff metric) was removed from the customer layout entirely.

**Area:** Auth · `src/routes/account/+layout.server.ts:16-32`

```ts
const ordersNumber = await db.select({ count: count(orders.id) })
    .from(orders).where(eq(orders.status, 'pending'))
const messageNumber = await db.select({ count: count() })
    .from(contactMessages).where(eq(contactMessages.seen, false))
```

Neither query is scoped to the logged-in customer. Every signed-in customer receives the **total
count of all pending orders across the business** and the **count of unread contact messages** in
their layout data. This block looks copy-pasted from `dashboard/+layout.server.ts:22-32`, where it is
admin-gated; here it is not.

**Fix:** scope both to `customers.id`, or drop them.

---

### P1-6 — `/blogs/[id]` throws a 500 on any unknown slug

> **✅ Fixed.** `error(404)` guard added for an unknown slug. Also corrected the `'../$types'` import, which had left `params.id` untyped, and filtered nullable gallery URLs.

**Area:** Crashes · `src/routes/blogs/[id]/+page.server.ts:22-30`

```ts
.then((res) => res[0]);          // → undefined when the slug doesn't exist

const result = await db.select(...)
    .where(eq(portfolioGallery.blogId, portfolioItems.id));   // TypeError
```

`portfolioItems` is `undefined` for any unmatched slug, and `.id` immediately throws
`TypeError: Cannot read properties of undefined`. Every bad or stale blog URL — including anything a
crawler has cached — returns a 500 instead of a 404.

**Fix:** `if (!portfolioItems) error(404)`.

---

### P1-7 — `saveUploadedFile` crashes on `undefined` despite advertising it

> **✅ Fixed.** Guards `!file || typeof file.stream !== 'function'`, validates the extension against an allowlist (SVG excluded — stored-XSS vector), and cleans up partial writes.

**Area:** Crashes · `src/lib/server/upload.ts:22-28`

```ts
export async function saveUploadedFile(file: File | undefined): Promise<string> {
    const ext = path.extname(file?.name);   // path.extname(undefined) → TypeError
    ...
    const webStream = file.stream();        // unguarded
```

The signature accepts `undefined` and `file?.name` gestures at handling it, but `path.extname` throws
on `undefined` and `file.stream()` is not optional-chained. Currently latent — the one caller
(`checkout/+page.server.ts:91`) guards with `docs ?` — but the contract is wrong and the next caller
that trusts the signature will crash.

Also: no validation of extension or MIME type. The original extension is preserved verbatim onto
disk, and `/files/[name]` serves it back.

---

### P1-8 — `account/orders` reads a column it never selected

> **✅ Fixed.** `currentStep` is no longer read from a column that was never selected and doesn't exist; it's derived from the order's status and items.

**Area:** Crashes · `src/routes/account/orders/+page.server.ts:52`

```ts
currentStep: row.currentStep,   // never selected at :26-37
```

`currentStep` is not in the `select()` projection, so it is `undefined` on every row. The order
tracking UI that consumes it gets `undefined` for every order's progress step. (`svelte-check` flags
this too.)

---

### P1-9 — Stat-cache invalidation targets the wrong path

> **✅ Fixed.** Was passing `path.resolve(FILES_DIR, target)` where `target` already contained `FILES_DIR`. Now keyed on the bare filename, matching what `/files/[name]` caches under.

**Area:** Files · `src/lib/server/upload.ts:26-32`

```ts
const target = path.join(FILES_DIR, fileName);        // ".tempFiles/abc.png"
...
invalidateStatCache(path.resolve(FILES_DIR, target)); // ".../.tempFiles/.tempFiles/abc.png"
```

`FILES_DIR` is joined **twice**. The key passed to `invalidateStatCache` can never match the key
`getCachedStats` writes, which is `path.resolve(FILES_DIR, params.name)` from
`src/routes/files/[name=filename]/+server.ts:84`. Invalidation is a permanent no-op.

Practical impact is on **overwrites**: a replaced file keeps serving the old size and mtime — and
therefore the old `ETag` and `Content-Length` — for up to `STAT_CACHE_TTL` (10s), producing truncated
or corrupt responses when the new file is a different size.

**Fix:** `invalidateStatCache(path.resolve(FILES_DIR, fileName))`.

---

### P1-10 — `Infer<schema>` is applied to data types, not schemas

> **✅ Fixed.** All **22** sites corrected (not 12 — see the note above). `SuperValidated<Infer<X>>` → `SuperValidated<X>` where `X` is already a `z.infer` data type; the two genuine `typeof` schema aliases (`LoginSchema`, `SignupSchema`) kept their `Infer<>`.

**Area:** Types · 12 files, e.g. `src/routes/dashboard/testimonials/edit.svelte:5,21` ·
`dashboard/quotes/[id]/DecideOrder.svelte:15` · `shop/single/[slug]/editGallery.svelte:15` ·
`dashboard/testimonials/delete.svelte:19`

```ts
import type { EditPaymentMethod as schema } from './schema';
...
data: SuperValidated<Infer<schema>>;
```

`Infer<T>` expects a **schema object**; what is passed is the already-inferred *data type*. Because
`yup` is present in `node_modules`, TS resolves the unsatisfied constraint against yup's `AnySchema`
and produces:

```
Type '{ id: number; name: string; ... }' does not satisfy the constraint 'Schema'.
Property 'id' does not exist on type '{}'.
```

Every affected form's `data` prop is typed **`SuperValidated<{}>`** — no field is type-checked, and
refactoring a schema field silently breaks the component with zero compile error.

This single mistake accounts for ~28 `Property 'X' does not exist on type '{}'` errors plus ~20
`ValidationErrors<{}>` indexing errors.

**Fix:** `Infer<typeof editPaymentMethodSchema>` against the actual zod schema *value*.

---

### P1-11 — DB row types are cast into stricter component prop types

> **✅ Fixed.** `ProductVariantRow` now uses the real enum unions from the new `src/lib/units.ts` instead of `string | null`; `isCustomLength` widened to match the nullable column.

**Area:** Types · `src/routes/shop/+page.svelte:531` · `shop/single/[slug]/+page.svelte:67,69`

```
Type 'string | null' is not assignable to type '"mm" | "m" | "ft" | "cm" | "in" | null'
Type 'boolean | null' is not assignable to type 'boolean | undefined'
```

Drizzle returns `widthUnit`/`thicknessUnit`/`lengthUnit` as plain `string | null` while `CartItem`
(`src/lib/hooks/cart.svelte.ts:18-22`) and the product components declare narrow unions. Not
cosmetic — a unit string outside the union (or a legacy `NULL`) flows into unit-conversion and
display logic that assumes the narrowed set.

The `boolean | null` → `boolean | undefined` mismatch on `isCustomLength` is the same class: `null`
is falsy so it happens to behave, but the declared contract is violated.

**Fix:** narrow the column with a MySQL enum, or validate on read.

---

### P1-12 — Cart `totalPrice` mixes VAT-inclusive and VAT-exclusive prices

> **✅ Fixed.** Cart totals are VAT-aware via the shared `src/lib/vat.ts`, exposing `subtotalExclVat` / `vatTotal` / `totalPrice`. The checkout summary now reads those instead of duplicating the maths, so drawer and summary can't disagree.

**Area:** Cart · `src/lib/hooks/cart.svelte.ts:40`

```ts
totalPrice = $derived(this.items.reduce((sum, item) => sum + item.price * item.quantity, 0));
```

`CartItem` carries a `priceIncludesVat` flag (`:14`) precisely because some variants are priced gross
and some net — and `pricing.ts:64-65` treats the two differently. The cart total ignores the flag
entirely and adds them raw. Any cart mixing the two shows a total that is neither the net nor the
gross figure, and doesn't match what checkout later computes.

---

### P1-13 — Uploads happen inside a DB transaction and leak on rollback

> **✅ Fixed.** Uploads happen before the transaction opens and are deleted in the catch, via a new `deleteUploadedFile`.

**Area:** Checkout · `src/routes/checkout/+page.server.ts:91` (inside `db.transaction` opened at `:50`)

```ts
const imageUrl = docs ? await saveUploadedFile(docs) : null;
```

The file is written to disk inside the transaction. If any later step throws — the product-existence
check at `:127`, the `orderItems` insert at `:147`, the `quoteRequests` insert at `:166` — the DB
rolls back but **the file stays on disk, orphaned**, with no row referencing it.

**Fix:** move I/O outside the transaction, or record the path and clean up in the catch.

---

### P1-14 — `docs` is only saved for brand-new customers

> **✅ Fixed.** Returning and logged-in customers now get their uploaded document persisted too.

**Area:** Checkout · `src/routes/checkout/+page.server.ts:84-100`

The `saveUploadedFile` call sits inside the `else` branch of `if (doesCustomerExist)`. A logged-in
user, or a returning customer matched by email, has their uploaded document **silently discarded** —
no error, no warning. The form accepts the file and reports success.

---

### P1-15 — Every product row is loaded to validate a handful of IDs

> **✅ Fixed.** Scoped with `inArray(products.id, productIds)`; existence validation moved into `resolveOrderLines`.

**Area:** Checkout · `src/routes/checkout/+page.server.ts:120-122`

```ts
const productRows = await tx
    .select({ id: products.id, name: products.name, categoryId: products.categoryId })
    .from(products);          // no WHERE
```

`productIds` is computed on the line above and then never used to filter. Full table scan into memory
on every checkout, inside a transaction — holding locks longer than needed.

**Fix:** `.where(inArray(products.id, productIds))`.

---

# 🟡 P2 — Medium

> Wrong results in edge cases, weak validation, or safety nets that don't hold.

### P2-1 — Adjusted totals silently drop the discount and re-tax VAT-inclusive lines

**Area:** Payments · `src/lib/server/orderAdjustments.ts:56-64`

`priceExcludingVat` is taken from the stored offer and VAT is recomputed on it at the flat
`offer.vatRate`. But `calculateOrderPricing` (`src/lib/server/pricing.ts:104-105`) derives `vatAmount`
as `priceIncludingVat - priceExcludingVat`, which for lines where `priceIncludesVat = true` is *not*
`priceExcludingVat × vatRate`. Any order mixing VAT-inclusive and VAT-exclusive lines gets a different
total from `getAdjustedOrderTotals` than from `calculateOrderPricing`, even with zero adjustments.

Separately, `discountAmount` is returned verbatim at `:64` but never applied to the adjusted
`subtotal` at `:63`, so the returned breakdown does not internally add up.

---

### P2-2 — `discountPercentage` is unvalidated

> **✅ Fixed.** Clamped to `[0, 100]`, and the clamped value is what's returned in the breakdown.

**Area:** Payments · `src/lib/server/pricing.ts:101-104`

No clamp to `[0, 100]`. A discount of `150` yields a negative `priceExcludingVat` and a negative
`total`; a negative discount silently marks the price *up*.

---

### P2-3 — Admin gate depends on a parent load and `return`s instead of throws

> **✅ Fixed.** Role is queried directly in the guard instead of via `parent()`, and `error`/`redirect` are thrown rather than returned.

**Area:** Auth · `src/routes/dashboard/+layout.server.ts:10-17`

```ts
if (roleName !== 'Admin') {
    return error(404, 'Not Allowed');
}
```

Two problems:

- `error()` and `redirect()` **throw**; `return error(...)` returns the object instead. It happens to
  work because SvelteKit inspects returned errors, but it is not the documented contract and reads as
  a no-op guard.
- The role check delegates to `(await parent()).roleName`, computed in `src/routes/+layout.server.ts:25-32`.
  The entire admin boundary rests on a value produced by the *root* layout — any change to that query
  silently widens dashboard access.

**Fix:** `throw error(...)`, and query the role directly in the guard.

---

### P2-4 — The AI chat rate limit is trivially bypassed

**Area:** Auth · `src/routes/api/chat/+server.ts:82-122`

The 10-prompts-per-day cap lives entirely in a signed cookie. The signature stops forgery of a
*higher* count, but nothing stops a client from simply **deleting the cookie** for a fresh allowance,
or sending requests with no cookie jar at all. As the only guard on an endpoint that makes two paid
Gemini calls per request (`:215` and `:287`), this is an open-ended cost exposure.

**Fix:** server-side accounting keyed on IP or session.

---

### P2-5 — `sendResetPassword` swallows email failures

> **✅ Fixed.** Wrapped with a logged catch and a clear user-facing message. The PII-leaking `console.log` of the user's email in `onPasswordReset` was removed at the same time.

**Area:** Auth · `src/lib/server/auth.ts:20-24`

`await sendEmail(...)` is unguarded. If SMTP is down the callback throws, better-auth surfaces a
generic error, and the user has no idea whether a reset email is coming.

---

### P2-6 — `account/orders` swallows its own 404

> **✅ Fixed.** The `error(404)` moved outside the `try`, and the catch-all that reported DB failures as "no orders" was removed.

**Area:** Crashes · `src/routes/account/orders/+page.server.ts:20` vs `:77-83`

```ts
if (!customer) { throw error(404, 'Customer profile not found.'); }
...
} catch (err) {
    console.error(...);
    return { pendingOrders: [], error: 'Could not populate active tracking parameters.' };
}
```

The `throw error(404)` is inside the `try`, so its own `catch` catches it and converts a legitimate
404 into a 200 with an empty list. The same catch masks every genuine DB failure as "no orders",
which will make real outages look like empty state.

**Rule:** SvelteKit `error()`/`redirect()` must never be thrown inside a broadly-catching `try`.

---

### P2-7 — `Number(params.id)` is never NaN-checked

> **✅ Fixed.** `Number.isInteger` guards added at all five load sites.

**Area:** Crashes · 8 call sites:
`dashboard/products/single/[id]/+page.server.ts:37,420` ·
`dashboard/products/single/[id]/variants.+page.server.ts:28,103` ·
`dashboard/customers/[id]/history/+page.server.ts:10` ·
`dashboard/products/single/[id]/ranges/[range]/+page.server.ts:9` ·
`dashboard/quotes/[id]/+page.server.ts:32,164`

`/dashboard/quotes/abc` produces `Number('abc') === NaN`, which reaches the query builder and surfaces
as a driver-level 500 rather than a 404.

**Fix:** `Number.isInteger` guard or a route param matcher.

---

### P2-8 — `mimes.lookup` returns an empty string, or a function

> **✅ Fixed.** Own-property + `typeof` guards; extension parsing consolidated into one `extensionOf` helper shared with the Cache-Control policy (which also closes P3-1).

**Area:** Files · `src/routes/files/[name=filename]/+server.ts:73-76`

```ts
lookup(s: string): string {
    const ext = s.toLowerCase().split('.').at(-1);
    return (ext && this[ext]) ?? 'application/octet-stream';
}
```

Two defects in one expression:

- `??` only catches `null`/`undefined`, but `ext && this[ext]` yields **`''`** when `ext` is `''`
  (a filename ending in `.`). The response then carries an empty `Content-Type:` and browsers fall
  back to sniffing.
- `this[ext]` is an unguarded index into the map, and the map contains `lookup` itself. A file named
  `x.lookup` returns the **function object**, which stringifies into the header. Same for any
  `Object.prototype` key (`x.constructor`, `x.toString`).

**Fix:** own-property check plus a `typeof === 'string'` test.

---

### P2-9 — ~250 implicit-`any` errors in table column definitions

**Area:** Types

`Binding element 'row'/'column' implicitly has an 'any' type` (187 occurrences) and
`Parameter 'info' implicitly has an 'any' type` (44) dominate the error count. Concentrated in
`src/routes/**/columns.ts` and the `dashboard/testimonials/+page.svelte` cell renderers
(`:17,18,27,37,43,60,72,77,83,97,115`), plus `src/routes/factory/+page.svelte:5,23,29,34`.

TanStack Table's `ColumnDef<T>` provides these types when the generic is supplied; it isn't. Every
cell renderer is unchecked against its row shape.

---

### P2-10 — `nodemailer` has no type declarations

> **✅ Fixed.** `@types/nodemailer` installed.

**Area:** Types · `src/lib/server/email.ts:1`

```
Could not find a declaration file for module 'nodemailer'
```

`@types/nodemailer` is not in `package.json`. The whole email module — transport config, `sendMail`
options, the 10 template helpers whose params are consequently implicit `any`
(`email.ts:161,163,212,214,258,280,...`) — is untyped.

**Fix:** add `@types/nodemailer` as a devDependency.

---

### P2-11 — No stock validation on add or quantity update

**Area:** Cart · `src/lib/hooks/cart.svelte.ts:91-104, 112-123`

`addItem` increments without bound and `updateQuantity` accepts any positive integer. Neither checks
variant availability, so a customer can build and submit a quote for more units than exist. There is
no server-side check at `checkout/+page.server.ts` either — see [P0-1](#p0-1--client-supplied-prices-are-written-straight-into-orderitems).

---

### P2-12 — Dead null-check contradicts the declared type

> **✅ Fixed.** `price` typed `number | null` to match the DB, and the guard now also rejects non-numeric values.

**Area:** Cart · `src/lib/hooks/cart.svelte.ts:92`

```ts
if (item.price == null) { console.error('Refusing to add a quote-only variant...'); return; }
```

`CartItem.price` is declared `number` (`:12`), so TS considers this branch unreachable and callers get
no warning when passing a quote-only variant. Meanwhile the DB genuinely returns `price: string | null`
(see the shop `load` types), meaning the real value can be a **string** — which passes the `== null`
check and then silently coerces in the `totalPrice` multiplication.

**Fix:** type `price` as `number | null` and parse at the boundary.

---

### P2-13 — A logged-in user with no customer row creates an orphaned order

> **✅ Fixed.** A signed-in user with no customer row now gets one created instead of producing an order with `customerId: NULL`.

**Area:** Checkout · `src/routes/checkout/+page.server.ts:52-65, 144`

If `locals.user` exists but no `customers` row matches `userId`, `customerInfo` stays `undefined`, and
the order is inserted with `customerId: undefined`. The later `resolvedName`/`resolvedPhone` guards
(`:111-116`) fall back to form fields that the logged-in checkout form doesn't render — so this either
creates a customer-less order or fails with a confusing *"please update your profile"*.

---

### P2-14 — The root layout runs 6 unfiltered queries on every request

**Area:** Perf · `src/routes/+layout.server.ts:34-93`

`gallery` (all rows), `testimonials`, and `blog ⋈ blogCategories` (all rows, all columns via
`getTableColumns`) are fetched with **no limit**, alongside the best-selling aggregation and its two
follow-ups. This runs on every navigation site-wide — including every dashboard page, which needs
none of it.

---

# ⚪ P3 — Low

> Hygiene, dead code, noise, performance headroom. No user-visible failure.

### P3-1 — `Cache-Control` header computed from a separately parsed extension

`src/routes/files/[name=filename]/+server.ts:94, 23-28`

Anything not in the allow-list gets `no-store`, which is safe, but the extension is derived separately
from the MIME lookup (`params.name.toLowerCase().split('.').at(-1)` vs `mimes.lookup(params.name)`) —
two parses of the same string that can disagree. Derive once.

---

### P3-2 — Sequential awaits where queries are independent

`src/routes/pay/[token]/+page.server.ts:18-88` issues 6 round-trips in strict sequence
(order → transaction → customer → items → offer → adjusted). `orders.ts:6-54` does the same with 4.
The transaction/customer/items/offer group is independent once `order` is known and could be
`Promise.all`'d.

---

### P3-3 — Debug logging left in production paths

`src/lib/server/chapa.ts:36-37` (every payment init) ·
`src/lib/server/auth.ts:27` (**logs user email on every password reset** — PII in logs) ·
`src/lib/server/email.ts:125` · `dashboard/blog/add-blog/+page.server.ts:36,128` ·
`dashboard/admin-panel/users/add-users/+page.server.ts:29` (`console.log(form)` — logs the full
submitted form, likely including credentials) · `dashboard/blog/single/[id]/+page.server.ts:19,156` ·
`dashboard/logos/+page.server.ts:82`

`console.log(form)` on a user-creation form is the notable one — it writes submitted user data to
stdout.

---

### P3-4 — Two generated paraglide directories

`src/paraglide/` and `src/lib/paraglide/` both exist with the same generated files. `.gitignore:31`
ignores only `src/lib/paraglide`, so **`src/paraglide/` is committed to the repo**. `hooks.server.ts:2-3`
imports from `$lib/paraglide`, making `src/paraglide/` dead but tracked.

---

### P3-5 — 58 MB of build tarballs in the working tree

`build.tar` (42 MB) and `build.tar.gz` (16.5 MB) sit in the project root. They are gitignored
(`.gitignore:12-13`) and not tracked, but `npm run build` regenerates `build.tar.gz` on every build
(`package.json:10`) and nothing cleans them up.

---

### P3-6 — Mixed zod import styles

`src/lib/server/prompt.ts:2` uses `import { z } from 'zod'` while the other 38 modules use `'zod/v4'`.
With zod 4.4.3 installed and the `zod4` superforms adapter in use, the odd one out can resolve to a
different `z` instance — schemas from it will not be recognized by v4-specific adapter code.

---

### P3-7 — Copy-pasted component wired to the wrong endpoint

`src/routes/dashboard/testimonials/edit.svelte:5,13`

A **testimonials** edit component imports its schema type as `EditPaymentMethod` and defaults its form
action to `'/dashboard/customers?/addCustomer'`. Callers presumably override `action`, but the default
is wrong and the schema import is from an unrelated feature. Same file, `:49`:
`Cannot assign to 'open' because it is a function` — a local shadows the imported `open`.

---

### P3-8 — 216 `state_referenced_locally` warnings

Svelte 5 warns that a `$state`/`$props` value is read once at init rather than tracked. Concentrated in
`dashboard/quotes/[id]/LineForm.svelte:88-94`, `DecideOrder.svelte:25-46`, `SendOffer.svelte:25-31`,
`dashboard/testimonials/edit.svelte:31-38`, `shop/+page.svelte:40,43`.

Most are inside `superForm` option objects where a one-time read is intended and harmless — but
`shop/+page.svelte:40,43` reads `THICKNESS_MIN`/`THICKNESS_MAX` where the compiler suggests a
`$derived`, meaning the filter bounds won't update when the underlying data changes.

---

### P3-9 — Unused imports across server loads

`user`, `error`, `gte` in `dashboard/+layout.server.ts:2,3,7`; the same set in
`account/+layout.server.ts`; `addUser`/`loginSchema` and `sql`/`and` in several route files. `eslint`
is configured (`eslint.config.js`) but `npm run lint` is evidently not gating commits.

---

## Recommended fix order

Severity ranks *impact*; this ranks *what to do first*. It mostly follows severity, with two
deliberate departures — noted below.

| # | ID | Why here |
|---|---|---|
| 1 | [P0-1](#p0-1--client-supplied-prices-are-written-straight-into-orderitems) | Anyone can set their own price |
| 2 | [P0-2](#p0-2--transactionsamount-is-overwritten-before-payment) | Silently under-charges real orders |
| 3 | [P0-3](#p0-3--chapa-verification-never-checks-the-amount-actually-paid) + [P0-4](#p0-4--order-is-marked-paid-inside-a-load-function-get-side-effect) | Orders marked paid without a verified payment; fix together, same file |
| 4 | [P1-1](#p1-1--the-chapa-webhook-verifier-is-documented-but-does-not-exist) | Payments lost whenever the customer closes the tab |
| 5 | [P1-5](#p1-5--customer-account-pages-leak-store-wide-business-metrics) | Business metrics exposed to every customer; one-line fix |
| 6 | [P1-2](#p1-2--markpaymentlinkused-burns-every-link-for-the-order) + [P1-3](#p1-3--a-settled-advance-payment-displays-as-paid) | Breaks the advance/balance flow end to end |
| 7 | **[P1-10](#p1-10--infer-schema-is-applied-to-data-types-not-schemas)** ⬆ | *Promoted:* unblocks ~50 real type errors and stops the next regression landing silently |
| 8 | [P1-6](#p1-6--blogsid-throws-a-500-on-any-unknown-slug), [P1-8](#p1-8--accountorders-reads-a-column-it-never-selected), **[P2-6](#p2-6--accountorders-swallows-its-own-404)** ⬆ | User-visible 500s; P2-6 rides along in the same file as P1-8 |
| 9 | [P1-9](#p1-9--stat-cache-invalidation-targets-the-wrong-path) | Corrupt responses on file overwrite |
| 10 | [P1-13](#p1-13--uploads-happen-inside-a-db-transaction-and-leak-on-rollback)–[P1-15](#p1-15--every-product-row-is-loaded-to-validate-a-handful-of-ids) | Data loss + full table scan per checkout |

Everything remaining (P2 tail, all P3) is safe to batch into cleanup passes.

---

## Not verified at runtime

This audit is static — `svelte-check`, `grep`, and reading the code. Nothing was executed against a
live database or the Chapa sandbox. The payment findings in particular describe sequences traced
through the code but **not reproduced**; [P0-2](#p0-2--transactionsamount-is-overwritten-before-payment)
and [P0-3](#p0-3--chapa-verification-never-checks-the-amount-actually-paid) are worth confirming
against a sandbox transaction before and after the fix. No tests were found in the repo to run.
