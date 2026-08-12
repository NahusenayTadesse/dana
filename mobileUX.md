# Mobile & Plain-Language Review

Where a non-technical buyer on a phone is likely to stall, get confused, or be
shown a wrong number. Everything below was read in the source; each item names a
file and line.

This deliberately does **not** repeat [`frictions.md`](frictions.md), which
already fixed the double navigation bar, the shop filters, the cart drawer's
sideways scroll, the checkout dead-end and the missing `/buy` tab. Those are
done. What follows is what a phone-first, non-technical audience still runs into.

Severity: **A** = shows a wrong number, or stops someone completing an order ·
**B** = costs confidence or time · **C** = polish.

---

## What is already good

Worth stating, because it sets the bar the rest should meet.

`/buy` is genuinely well built for this audience. The copy is plain and warm —
"Build Your Order", "Pick a product below", "How many", "Longest we make",
"Send your order — no payment now". The block-code hint is the best line in the
app:

> "Codes like **A1** are there so you can point at a line when you call us."

That sentence assumes the customer will phone rather than self-serve, and
designs for it. The order row (`buy-order-row.svelte:325`) stacks into labelled
cells on a phone instead of scrolling sideways, and the row spells out
`price × qty` rather than making the reader redo the arithmetic.

The payment page is also solid: the whole payment-choice card is the tap target
(`pay/[token]/+page.svelte:178`), not just the radio dot, and the submit button
is a full-width 48px.

---

## A1 — The length stepper silently shows the wrong price

`src/lib/components/buy-order-row.svelte:315` and `:483`

```js
const lineTotal = $derived(item.price * item.quantity);
```
```svelte
{formatPrice(item.price)} × {item.quantity}
{formatPrice(lineTotal)}
```

`item.price` is the variant's price and never changes when the length does —
`updateLength()` in `cart.svelte.ts` sets length and label, not price. That was
harmless while every product was priced per piece. Since the 2026-08-12
repricing, four products are priced **per metre**, and the length stepper is the
main control on the row.

Dial a 3 m Ega sheet up to 6 m with the **+** button and the row still reads:

```
817.71 ETB × 1                    <- what the customer sees
817.71 ETB                        <- and believes, because the sum is shown
1,635.42 ETB                      <- what the quote and the email will say
```

Two things make this worse than a normal rounding mismatch. The row **displays
its own arithmetic**, so the wrong figure looks checked. And the control that
causes it is the one the page invites people to use — "Any length from 1 to 12".

The storefront is only shielded for catalogue lengths, where
`product_variants.price` was set to the per-sheet equivalent. Custom lengths are
reachable on GI (1–12 m), Flashings (0.5–4 m) and Gutters (1–10 m).

**Fix:** thread `priceBasis` from `variant_prices` through `loadBuyProductList`
into `CartItem`, then mirror `unitsFor()` from `pricing.ts` in the cart totals
and in this row's `lineTotal`. Same change closes the last open item in
[`testErrors.md`](testErrors.md) S9.

---

## A2 — The checkout page speaks a different language than the rest of the site

`messages/en.json`, rendered at `src/routes/checkout/+page.svelte:159, 240, 258, 265, 307, 323, 416, 419`

`/buy` was rewritten into plain language. `/checkout` was not, and the customer
crosses that line mid-order. Every string below is live on the page:

| Where | What it says |
|---|---|
| Item-count badge (`:159`) | "{count} **Bundles / Tons**" |
| Section heading (`:258`) | "**Procurement Verification**" |
| Guest notice (`:265`) | "You are **processing this estimate as a guest buyer**. Register to track **historical order logs, weight tolerances, and pending invoice logs** within a corporate profile." |
| Name field (`:307`) | "**Company Representative**" |
| Phone field (`:323`) | "**Direct Phone Line**" |
| Signed-in label (`:416`) | "**Verified Procurement Officer**" |
| Item count (`:419`) | "{count} **profile lines staged in inquiry memory**" |
| Empty cart (`:240`) | "No **material profiles** selected in your **current session context**." |

A homeowner buying roofing sheets is not a procurement officer, does not have
"inquiry memory", and may not answer to "Company Representative" when asked for
their name. The same file also holds "Review your custom **profile payload**",
"Registering **Allocation Needs**…", "**Ex-Factory Base Cost**" and
"Proceed with **Authorized Terms**".

This is the single cheapest high-impact fix in the app: it is `messages/en.json`
only, no logic. Suggested replacements, matching `/buy`'s voice:

| Now | Instead |
|---|---|
| Bundles / Tons | {count} items |
| Procurement Verification | Your details |
| the guest paragraph | You can send this request without an account. Sign up if you'd like to track your orders later. |
| Company Representative | Your name |
| Direct Phone Line | Phone number |
| Verified Procurement Officer | Signed in |
| {count} profile lines staged in inquiry memory | {count} items in this request |
| No material profiles selected… | You haven't added anything yet. |

Also worth checking the Amharic file has not inherited the same register.

---

## B1 — Tap targets are 32px throughout the order builder

`buy-order-row.svelte` (6 × `size-8`), `buy-product-card.svelte:285`

Every +/- control for **length** and **how many**, and every colour swatch on the
product card, is `size-8` — 32×32px. Apple's guidance is 44pt, Google's 48dp.

These are not incidental controls. Setting quantity means tapping **+** eight
times for eight sheets, and each tap is below the size both platforms consider
reliable. Colour swatches at 32px with small gaps are the very first interaction
on the page, and picking the wrong colour is not obvious afterwards — the swatch
is small enough that the confirmation is small too.

**Fix:** `size-11` (44px) on the steppers and swatches. The row is stacked on
phones so there is vertical room; this mostly costs padding.

---

## B2 — Print and CSV export are desktop features on a phone-first site

`src/lib/print.ts:100`, `order-receipt.svelte:123,184`, `order-product-summary.svelte:100,104`

The checkout page shows an **Export** dropdown offering "Save PDF" and
"Export CSV".

- "Save PDF" calls `window.print()`. On Android Chrome that opens the print
  sheet and PDF is a destination buried in a picker; on iOS Safari it is a share
  sheet with no obvious "save" step. The button promises a file and delivers a
  print dialog.
- "Export CSV" downloads a `.csv`. On a phone with no spreadsheet app that file
  is effectively unopenable — and this audience is the least likely to have one.

**Fix:** hide the export controls below `sm`, or replace them on mobile with
something a phone does well — a **Share** button (`navigator.share`) or
**Send to WhatsApp**, which is how this order will actually be forwarded to a
foreman or a spouse.

---

## B3 — The per-product summary still scrolls sideways

`src/lib/components/order-product-summary.svelte:168`

```svelte
<div class="overflow-x-auto rounded-xl border border-border">
```

Four columns — Product, Lengths, Qty, Total length — inside a horizontal
scroller, on both `/buy` and `/checkout`.

This is the same pattern `frictions.md` **A5** identified and fixed for the cart
drawer, where the diagnosis was that a sideways scroll "hid the price, the total
and the delete button behind a scroll most people never find". The order row was
restacked; this table was not.

On a 360px screen the "Total length" column — the reason a roofer reads this
table at all — is the one off-screen.

**Fix:** the same treatment as the order row: stack into labelled rows below
`sm`, table from `sm` up.

---

## B4 — Tax wording on the payment page

`messages/en.json` — `pay_withholding`, `pay_price_excl_vat`

The payment page is otherwise plain, then presents:

```
Price (excl. VAT)
VAT (15%)
Withholding (3%)      -362.59
Total
```

Withholding tax **reduces** the total, which reads like a discount to anyone who
hasn't met it, and like an error to anyone who has. Neither term is explained.

**Fix:** keep the labels (they need to match the invoice) but add one line of
plain text under the block — e.g. "Withholding tax is deducted at source and
paid to the revenue office on your behalf." A one-line note costs nothing and
removes the single most common "why is this number here" call.

---

## C1 — The company path asks for a TIN and a licence upload, unlabelled as optional

`src/routes/checkout/+page.svelte:343-361`

Choosing "Business" reveals **Tin Number** and **Trading Licence
Documentation** (a file upload). Both are optional in `schema.ts` — but neither
is marked optional in the UI, so a customer on a phone who does not have the
licence to hand will reasonably assume they cannot continue, and abandon.

**Fix:** append "(optional)" to both labels, and confirm the file input allows
camera capture so a licence can be photographed rather than located as a file.

---

## Two things I could not assess from the source

- **Real-device rendering.** Everything here is read from the markup and
  Tailwind classes. Tap-target sizes and stacking behaviour should be confirmed
  on an actual phone, ideally a small Android one (360px), which is the likely
  device for this audience.
- **Amharic.** All findings are against `messages/en.json`. If the plain-language
  rewrite of `/buy` was only applied to English, Amharic-speaking customers may
  still be reading the industrial register everywhere.

---

## Suggested order of work

1. **A2** — the checkout wording. One file, no logic, biggest effect on this audience.
2. **A1** — the length/price bug. Real wrong numbers, and it closes S9.
3. **B1** — 44px tap targets. Mechanical.
4. **B3** — restack the summary table, reusing the pattern already proven on the order row.
5. **B2**, **B4**, **C1** — smaller, independent.
