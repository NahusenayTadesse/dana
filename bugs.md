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
