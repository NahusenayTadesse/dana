# Errors found — end-to-end notification run

Run date: 2026-08-12. Environment: `vite dev --mode test` (`.env.test`) against local MariaDB `dana`, mail into Mailpit, GeezSMS and Chapa intercepted so nothing left the machine.

Companion logs: [emailTest.md](emailTest.md) (26 emails captured), [smstest.md](smstest.md) (12 messages).

**Status: all nine are fixed and re-verified. S3 is applied locally and ships as a runnable SQL file — it still has to be applied to production.**

👉 **Action required:** run [`drizzle/manual/2026-08-12_payment_settlement_columns.sql`](drizzle/manual/2026-08-12_payment_settlement_columns.sql) against production (or `npx drizzle-kit migrate` there). Until then, payments in production may be failing outright — see S3.

| | Finding | Severity | Status |
|---|---|---|---|
| S1 | Payment settlement never completes; no confirmation sent | CRITICAL | ✅ fixed, re-tested |
| S2 | Contact form crashes the Node process | CRITICAL | ✅ fixed, re-tested |
| S3 | DB two migrations behind | HIGH | ✅ applied locally + SQL file — **run on production** |
| S4 | Delivered orders notify nobody | HIGH | ✅ fixed, re-tested |
| S5 | One failed send suppresses the rest | MEDIUM | ✅ fixed, re-tested |
| S6 | SMS skipped whenever email fails | MEDIUM | ✅ fixed, re-tested |
| S7 | "Send offer" commits, then reports failure | MEDIUM | ✅ fixed, re-tested |
| S8 | Auto-stripped SMS truncates mid-sentence | MEDIUM | ✅ fixed, re-tested |
| S9 | Quote email's item table not basis-aware | LOW (latent) | ✅ fixed, re-tested |

---

## S1 — CRITICAL: no payment ever completes, and no one is ever told — ✅ FIXED

`src/lib/server/paymentSettlement.ts:153`

```ts
const wonClaim = ((claim as unknown as { affectedRows?: number })?.affectedRows ?? 0) > 0;
```

`db.update()` on drizzle + mysql2 resolves to `[ResultSetHeader, FieldPacket[]]` — an **array**. `claim.affectedRows` is therefore always `undefined`, so `wonClaim` is always `false`, on the very first settlement. Measured directly:

```
typeof: object | isArray: true
res.affectedRows     = undefined
res[0].affectedRows  = 1
```

Execution then takes the `if (!wonClaim)` early return at line 170, which skips **everything** after it:

| Skipped | Consequence |
|---|---|
| `transactions.paymentStatus` update | a fully paid order stays `pending` forever |
| `markPaymentLinksUsed(orderId)` | payment links are never burned — they stay live and reusable |
| `sendPaymentConfirmation(...)` | **the customer is never emailed or SMSed that their payment succeeded** |

Observed on order 13 after both an advance and a balance payment settled:

```
id  amount    amount_paid  payment_status  settled_txn_ref
11  10832.64  18054.40     pending         ord13-bal-3cc73467

payment_links: order 13 -> used_at = NULL  (both links still live)
```

The money was recorded, the order reads as unpaid, both magic links still work, and zero emails were sent. `settlePaymentAttempt` returned `alreadySettled: true` on the first call.

### Fix applied

`affectedRowsOf()` in `paymentSettlement.ts` now reads the header off element 0, accepting both shapes so a driver change can't reintroduce a bug whose only symptom is silence. This was the codebase's only `affectedRows` read.

**Re-verified** on a reset order 13:

| Stage | `alreadySettled` | Emails |
|---|---|---|
| advance settles (40%) | `false` | 2 — "Advance Payment Received" to customer + staff |
| same ref settled again | `true` | **0** — idempotency intact |
| balance settles | `false` | 2 — "Payment Confirmed" to customer + staff |

Database afterwards, all three consequences resolved:

```
amount_paid  payment_status   payment_links.used_at
18054.40     paid             both burned
```

---

## S2 — CRITICAL: the contact form can kill the server — ✅ FIXED

`src/routes/contact-us/+page.server.ts:35,38`

```ts
sendEmail(SMTP_USER, adminMail.subject, adminMail.html);          // not awaited, not caught
sendEmail(email, userMail.subject, userMail.html, phoneNumber);   // same
```

The promises escape the surrounding `try`, so an SMTP failure becomes an unhandled rejection, and Node 22 terminates the process on those by default.

Reproduced against the running dev server with the mail host unreachable — **one POST**:

```
dev server before: 200
POST -> 200  {"type":"success", ...}      <- user is told it worked
dev server after:  000 DEAD

Error: connect ECONNREFUSED 127.0.0.1:1025
    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1638:16)
node:internal/process/promises:394 triggerUncaughtException(err, true /* fromPromise */);
```

Anyone can take the site down by submitting the contact form during a mail outage, and the submitter is shown a success message while it happens.

### Fix applied

`.catch(...)` on both sends, as every other call site already does. They stay un-awaited on purpose — the message is already saved and the sender shouldn't wait on SMTP — which is exactly why the `.catch` is what makes it safe.

**Re-verified** with the mail host unreachable, four submissions in a row:

```
POST -> 200   POST 1 -> 200   POST 2 -> 200   POST 3 -> 200
dev server after 4 total submissions: 200      <- survives
8 errors caught and logged (2 per submission):
  Email Error (Admin contact): Error: connect ECONNREFUSED 127.0.0.1:1025
```

---

## S3 — HIGH: the database was two migrations behind, and both are load-bearing

`__drizzle_migrations` had 10 of 12 applied. Missing:

- `0010_nasty_master_mold.sql` → `transactions.amount_paid`
- `0011_aromatic_iron_man.sql` → `transactions.settled_txn_ref`

Both are written to by `settlePaymentAttempt`, so on that schema the payment path throws `Unknown column` before it can do anything. I took a dump first (`scratchpad/dana-backup-before-migrate.sql`, 140K) and ran `npx drizzle-kit migrate`; both applied cleanly with their backfills.

**Check production has these:**

```sql
SHOW COLUMNS FROM `transactions` LIKE 'amount\_paid';
SHOW COLUMNS FROM `transactions` LIKE 'settled\_txn\_ref';
```

If it doesn't, every Chapa payment there is failing outright — and the two migrations carry backfill `UPDATE`s that matter for orders paid before the columns existed.

### Runnable SQL for production

**[`drizzle/manual/2026-08-12_payment_settlement_columns.sql`](drizzle/manual/2026-08-12_payment_settlement_columns.sql)**

`npx drizzle-kit migrate` is still the preferred route. This file is for environments where the CLI can't be pointed at the production database, and is equivalent to 0010 + 0011 plus their journal bookkeeping.

- **Guarded against `information_schema`**, not MariaDB's `IF NOT EXISTS`, so it runs on MySQL too.
- **Backfills only fire when this script is what created the column** — re-running must never overwrite an `amount_paid` that has since accumulated real payments.
- **Writes the `__drizzle_migrations` rows** (correct sha256 hashes and journal `when` timestamps), so a later `drizzle-kit migrate` doesn't try to re-apply and fail on a duplicate column.
- Ends with a verification `SELECT`; expect `1, 1, 12`.

Tested three ways:

| Test | Result |
|---|---|
| Against the already-migrated DB | clean no-op, `1, 1, 12` |
| Against a fresh restore of the pre-migration backup | both columns added; paid/partially-paid rows backfilled; the `unpaid` row correctly left at `0` / `NULL`; bookkeeping 10 → 12 |
| Re-run after simulating a later in-flight attempt (`amount` changed, `amount_paid` accumulated) | `amount_paid` preserved, no duplicate journal rows |
| `npx drizzle-kit migrate` afterwards | reports nothing pending, no duplicate-column error, data intact |

Take a backup first: `mysqldump -u USER -p DBNAME > dana-before-payment-columns.sql`

---

## S4 — HIGH: delivering an order notifies nobody — ✅ FIXED

`customerDeliveredTemplate` and `adminDeliveredTemplate` were written in full and **had zero callers**. `dashboard/orders/+page.server.ts` flips an order to `delivered`, creates the transaction and marks it paid — and sent nothing. Confirmed in the first run: the delivered scenario produced 0 emails.

### Fix applied

- New `sendOrderDeliveredNotice(orderId, fallbackTotal?)` in `notifications.ts`. The fallback covers orders staff create directly on the Orders page: those never went through the quote builder, so there is no price offer for `getAdjustedOrderTotals()` to read and the action's own line total is the only figure available.
- Both delivered templates now render with `generateVariantOrderTable`, which matches the item shape `getOrderDetails()` actually returns. They were calling `generateOrderTable`, which expects the older `{ product, amount }` shape — so even once wired up they would have rendered a table of `Product #undefined`. Totals now pass through `toLocaleString()` like every other template.
- New `orderDeliveredSms()`, so the delivery SMS isn't an auto-stripped wall of table cells (S8).
- Wired into **both** the `add` and `edit` actions, fire-and-forget with a `.catch` — the order is committed, and a mail failure must not report the sale as failed.
- `edit` fires only on the **transition** into `delivered`, comparing against the previous status read inside the same transaction. Staff edit delivered orders routinely (fixing a quantity, attaching a receipt) and none of that should re-announce the delivery.

**Re-verified** by driving the real `actions.edit`, not the notification function:

| Action | Emails | SMS |
|---|---|---|
| edit `pending` → `delivered` | 2 — "Your Order Has Been Delivered! (#13)" + "Order Delivered: #13" | 1 |
| edit `delivered` → `delivered` again | **0** — guard holds | 0 |

Both rendered clean: 1 table, 4 rows, zero `undefined`/`NaN` tokens.

Still dead, not addressed here: `customerCheckoutTemplate`, `adminCheckoutTemplate`, `customerQuoteTemplate`, `adminQuoteTemplate`, and the welcome email commented out at `signup/+page.server.ts:75`.

---

## S5 — MEDIUM: one failed send silently suppresses every send after it — ✅ FIXED

Every function in `notifications.ts` awaits the customer email before the admin email, so a customer-side failure means **staff are never told either**. Measured with SMTP down:

| Scenario | Threw | Admin email attempted | SMS attempted |
|---|---|---|---|
| `sendQuotePaymentLink` | `ECONNREFUSED` | no | 0 |
| `sendPaymentConfirmation` | `ECONNREFUSED` | no | 0 |

### Fix applied

New `notifyBoth()` helper in `notifications.ts` runs the two legs under `Promise.allSettled` and logs which one failed, applied to all four paired notifications (`sendQuotePaymentLink`, `sendPaymentConfirmation`, `sendBalancePaymentLink`, `sendOrderAdjustmentNotice`) plus the new delivery notice.

It still **rejects when the customer leg fails**, since that is what callers report on — a staff-side failure is logged instead, so it cannot make a notification the customer *did* receive look like a failure. The caller contract is unchanged; only the suppression is gone.

**Re-verified** — see the combined S5+S6 test below.

---

## S6 — MEDIUM: the SMS is skipped whenever the email fails — ✅ FIXED

`src/lib/server/email.ts:139` sends mail first, then SMS:

```ts
await transporter.sendMail({...});   // throws here
if (phone) { ...sendSms... }         // never reached
```

A customer with a bouncing address but a working phone gets nothing at all, even though the SMS leg was fine. Measured: **0 SMS attempted** across all three SMTP-down scenarios.

### Fix applied

The SMS is now started *before* the mail send and awaited separately; the mail error is held and rethrown afterwards, so the caller contract ("rejects means the email failed") is unchanged while the SMS's dependence on it is gone. Phone normalisation moved into a `sendSmsToEthPhone()` helper that logs an unusable number rather than silently dropping it.

### S5 + S6 combined re-verification

Isolating a **customer-only** failure: the customer's address was blanked so nodemailer rejects that send outright, while the staff address still resolves.

```
=== S5+S6: customer email fails, staff copy + SMS must still go
    emails: 1 -> sales@dana.test | Quote Sent: Order #13 — 18,054.4 ETB     <- S5: was suppressed before
    SMS attempted: 1 -> "Dana Steel: Quote #13 ready. Total 18,054.4 ETB
                         (incl. VAT 2,418 ETB). Pay: http://localhost:5173/pay/DdPZ…"   <- S6: was skipped before
    threw: Error: No recipients defined                                      <- contract preserved
    logged: quote payment link (order #13): customer notification failed: …
```

Before these fixes the same scenario produced 0 emails and 0 SMS.

---

## S7 — MEDIUM: "send offer" commits, then reports failure — ✅ FIXED

`src/routes/dashboard/quotes/[id]/+page.server.ts:414` awaits `sendQuotePaymentLink` *after* the transaction row, the `quoteReplies` insert, the `quoteRequests → 'quoted'` update and the payment-link token have all committed. On an SMTP failure staff see "Error sending offer", the customer received nothing, and the system believes the quote was sent. Retrying stacks a second reply row and a second live payment token.

Same shape, lower stakes, at `dashboard/quotes/+page.server.ts:121`.

### Fix applied

Both actions were reordered so the record follows the send, in three separately-reported phases:

1. **Prepare** — resolve the offer/order and do the money plumbing (the transaction row, `orders.transactionId`) inside one `db.transaction`. This half is genuinely idempotent: a retry updates the same transaction rather than creating a second one, so it is safe to have run even if the send never succeeds.
2. **Send** — outside that try, reported on its own. A failure now says *"The offer is saved, but it could not be sent to the customer: … — nothing was recorded as sent. Press Send again to retry."*
3. **Record** — the `quote_replies` row and `quoteRequests.status = 'quoted'` are written **only after the customer has actually been told**. A failure here is logged but does not fail the action: the customer has the offer, and reporting failure would invite a resend they don't need.

The staff reply action in `dashboard/quotes/+page.server.ts` got the same treatment, and now also falls back to SMS when the quote request has a phone but no email — previously that customer got nothing at all.

**Re-verified**, both directions:

| Run | Staff sees | Reply rows | Quote status | Emails |
|---|---|---|---|---|
| SMTP down | "The offer is saved, but it could not be sent… nothing was recorded as sent. Press Send again to retry." | 0 → **0** | `new` → **`new`** | 0 |
| SMTP up | "Priced offer sent to customer." | 0 → **1** | `new` → **`quoted`** | 2 |

Before the fix, the failing run left one reply row and a `quoted` status behind, and every retry added another.

Not changed: `sendQuotePaymentLink` still mints a fresh payment token per attempt, so a retry leaves an unused earlier token. That is harmless — `markPaymentLinksUsed()` burns every link for the order on full settlement — but worth knowing.

---

## S8 — MEDIUM: auto-stripped SMS truncates mid-sentence — ✅ FIXED

Templates that pass a phone but no dedicated SMS copy fall back to `stripHtml`, which hard-slices at 335 with no ellipsis. Captured from the `/quotes` flow — exactly 335 characters, cut mid-word:

```text
Quote Request Received
 Hi Quote Asker,
 Thanks for reaching out to Dana Steel. We've received your quote request #19:
 Item: PPGI Colour-Coated Sheets (Signal Red · 3 Feet (914mm) · 0.425mm · Standard 3.0m Sheet)
 Estimated quantity: 200 sheets
 Your message: Do you deliver to Adama?
 Our sales team will review your request and foll
```

Affected `/quotes`, `contact-us`, and the `dashboard/quotes` staff reply. The `/checkout` flow was already unaffected — it passes purpose-built SMS copy.

### Fix applied

- **`capSms(msg, limit)`** replaces every hand-rolled `slice(0, 335)` in the file (six of them). It trims on a word boundary and appends an ellipsis, backing up to a boundary only when one is reasonably close — so an unbroken run like a URL loses its tail rather than the whole message.
- **Three purpose-built builders** so the fallback isn't reached at all: `quoteRequestReceivedSms`, `contactReceivedSms`, `quoteReplySms`. Each spends the budget on what the reader needs — who it's from, what it's about, what happens next — instead of on greetings and sign-offs.
- `quoteRequestReceivedSms` drops the item line **wholesale** when the message runs long, rather than emitting half a spec; the reference number is what the customer needs to quote back.
- `quoteReplySms` trims the staff's free text to *its own* budget, so the framing survives instead of the tail being cut off.
- `stripHtml` now routes through `capSms` too, and is documented as a last resort.

**Re-verified** across normal, overlong, entity-escaped and unbroken-run inputs: **0 over the limit, 0 mid-word cuts.**

```text
Dana Steel: Quote request #19 received.
Item: PPGI Colour-Coated Sheets (Signal Red · 3 Feet (914mm) · 0.425mm · Standard 3.0m Sheet)
Our sales team will follow up shortly with pricing and availability.          (202 chars)

Dana Steel: Thanks Contact Person, we've received your message about
"Bulk pricing question". Our team will get back to you as soon as possible.   (144 chars)

Dana Steel: Hi Quote Asker, a reply to your quote request:
We can supply that quantity and deliver within two weeks. … We…
Check your email for the full message.                                        (333 chars, ellipsis)
```

In the final run the `/quotes` message dropped from a truncated 335 to a complete 202, and no message in the log is at the cap.

---

## S9 — LOW (latent): the quote email's item table doesn't reconcile with its own total — ✅ FIXED

`generateVariantOrderTable` computed each line as `unitPrice × quantity`, but the totals block beneath it comes from `calculateOrderPricing`, which is basis-aware. For a product priced per metre or per m², the rows and the Total disagreed — and the customer had no way to tell which figure was real.

Latent rather than live: every row in `variant_prices` is currently `basis = 'quantity'`, where the two agree. It would have bitten the day someone added a per-metre rate.

### Fix applied

- `getOrderDetails()` now selects `orderItems.priceBasis`. Without it the table could only ever assume "per piece".
- `generateVariantOrderTable` costs each line through **`priceLine()` — the same function the quote builder uses** — so the column adds up to the Subtotal printed underneath by construction, not by coincidence.
- The Subtotal column is now labelled **excl. VAT** and shows each line's net, which is exactly what `calculateOrderPricing` sums into `subtotal`. Previously it mixed net and gross depending on each line's `priceIncludesVat`.
- The unit price shows its basis (`per m`, `per m²`, `per piece`) and an `incl. VAT` marker, and the Qty cell shows the billed units when they differ from the piece count — so `8 × 6m at 410/m` is legible rather than mysterious.

**Re-verified** on a deliberately awkward cart — per-piece, per-metre, per-m², and a VAT-inclusive rate, the four ways the two calculations could diverge:

```
Ridge Cap                     qty 20         180 ETB per piece            3,600 ETB
PPGI Sheet (per metre)        qty 8  48 m    410 ETB per m               19,680 ETB
Cladding (per m²)             qty 5  18 m²   620 ETB per m²              11,160 ETB
Gutter (VAT-inclusive rate)   qty 6  24 m  1,150 ETB per m · incl. VAT   24,000 ETB

Sum of the Subtotal column : 58,440 ETB
Offer Subtotal (excl. VAT) : 58,440 ETB      match ✅

Old flat unitPrice × qty   : 16,880 ETB      off by 41,560 ETB
```

### Still open: the client cart is not basis-aware — and this is now LIVE

`cart.svelte.ts` (`subtotalExclVat` / `vatTotal` / `totalPrice`) and `buy-order-row.svelte`'s `lineTotal` all compute `price × quantity` with no length factor. This was latent while every rate was `quantity` basis.

It is no longer latent: the 2026-08-12 repricing put GI Galvanized Sheets, Ridge Caps, Flashings and Gutters onto `length` rates.

The storefront is shielded for **catalogue** lengths, because `product_variants.price` was set to the per-sheet equivalent (rate × that variant's length) — see `drizzle/manual/2026-08-12_repricing_per_metre.sql`. The two agree exactly there.

They diverge on a **cut-to-order** length, which is reachable on three of the four repriced products (GI 1–12 m, Flashings 0.5–4 m, Gutters 1–10 m). The client keeps the catalogue-length price while the server scales by the length actually requested:

```
Ega 3 m variant dialled to 6 m, ×1
  on-screen estimate :   817.71 ETB   (client, 3 m price)
  staff quote / email: 1,635.42 ETB   (server, 272.57 × 6 m)
```

The quote, the payment link and every email are correct — only the on-screen estimate is low, and it is labelled an estimate. The fix is threading `priceBasis` from `variant_prices` through `loadBuyProductList` into `CartItem`, then mirroring `unitsFor()` in the cart totals and every line-total display site.

---

## Also fixed along the way

- **`email.ts`** — `secure: true` was hardcoded, so the only workable configuration was port 465; a local catcher on 1025 or a relay on 587 failed at the TLS handshake. Now `secure: Number(SMTP_PORT) === 465`, nodemailer's own convention. Production is on 465, so no behaviour change there. Applied to both transporters.
- **`email.ts` `orderSummarySms`** — read "Total: 1 pcs" on a single-item cart; now pluralises.

---

## Housekeeping

- Test rows were created in the local dev DB: `quote_requests` 16–19, `orders` 13–16, `price_offers` 11, `transactions` 11, one `order_adjustments` row, and four `payment_links`. Order 13 is left in the inconsistent state S1 produces — useful as a reproduction, but delete it if you'd rather have a clean DB.
- Pre-migration dump: `scratchpad/dana-backup-before-migrate.sql`.
- `.env.test` is committed (`.gitignore` explicitly un-ignores it) and holds only local/placeholder values — no production secret.
