# Customer Journey — Friction & Responsiveness

A walk through the code along the path a real buyer takes: land → browse →
configure → build an order → check out → pay → track. Everything below was read
in the source, not inferred; each item names a file and line.

Severity: **A** = loses work, dead-ends, or breaks on a phone ·
**B** = costs the customer time or confidence · **C** = polish.

> **Status: all 14 fixed.** Each entry keeps its original diagnosis and states
> what was done. Build passes; `svelte-check` is at **544 errors / 198
> warnings**, down from **574 / 216** before this and the preceding UI pass.

---

## 1. Landing & navigation

### A1 ✅ — Two navigation bars at tablet widths
`src/lib/components/header.svelte:91, 213` · `src/lib/components/bottomMenu.svelte:42`

The header's desktop nav is `hidden … md:flex` (shows from 768px). The header's
mobile cluster is `md:hidden` (hides from 768px). But the fixed bottom nav is
`lg:hidden` — it stays until 1024px.

Between **768px and 1023px** — iPad portrait, most Android tablets, a
half-screen desktop window — the customer sees the full desktop nav at the top
*and* the mobile tab bar pinned to the bottom, with duplicate Home/Shop entries.

**Fixed.** `bottomMenu`'s `<nav>` is now `md:hidden`, matching where the header
swaps between its desktop nav and its mobile sheet. Exactly one navigation is
live at any width.

Three other elements were clearing the bar at `lg` and had to move with it, or
768–1023px would have left a gap where it used to be: the floating cart button
(`cart.svelte:30`), the chat pill (`FloatingChat.svelte:111`) and the footer's
bottom padding (`Footer.svelte:35`) are all `md:` now. The footer comment
records that the breakpoint is shared, so the next person moves all four.

### B1 ✅ — `/buy` was missing from the mobile tab bar
`src/lib/components/bottomMenu.svelte:8-13`

`mobNav` is Home · Shop · Orders · Account, plus Search. `/buy` — the page that
actually takes an order, and the one the header comments call out as sitting
"right after /shop" — is only reachable on a phone through the hamburger sheet.

**Fixed.** `/buy` replaces `/account/orders` in the tab bar. Order tracking is
one tap inside Account; taking an order is the thing the tab bar should make
reachable.

---

## 2. Shop — browsing and filtering

### A2 ✅ — Every keystroke in the search box was a server round-trip
`src/routes/shop/+page.svelte:256`

```svelte
<Input type="text" bind:value={searchQuery} oninput={handleSearch} … />
```

`handleSearch` → `updateFilters` → `goto(newUrl)`. Typing "corrugated" fires
**ten** navigations, each re-running the shop load and re-querying the database.
On a phone on 3G the input visibly stutters and results arrive out of order.

**Fixed** together with A3 — the debounce went into `updateFilters` itself, so
every filter path gets it rather than just the search box. Enter still commits
immediately via `handleSearchKeydown`, so nobody has to wait out the delay.

### A3 ✅ — Each filter tick was its own page load
`src/routes/shop/+page.svelte:117-183`

`toggleColorFilter`, `toggleWidthFilter`, `toggleLengthFilter`,
`toggleCategoryFilter`, `toggleCoatingTypeFilter`, `toggleBrandFilter` and
`handleAvailabilityChange` each call `updateFilters` immediately. Picking three
colours and two widths is five sequential round-trips, and the grid gives no
per-request feedback beyond the global top-of-page progress bar.

Note the thickness slider already does this correctly — it collects the range
and commits on `applyThicknessFilter()`.

**Fixed** with option 1 — `updateFilters` now takes an `{ immediate }` flag and
debounces by default:

```js
clearTimeout(filterTimer);
if (immediate) apply();
else filterTimer = setTimeout(apply, FILTER_DEBOUNCE_MS);
```

Deliberate single actions opt out of the delay: `goToPage` and
`applyThicknessFilter` pass `{ immediate: true }`, because paging and pressing
Apply are not bursts and shouldn't feel laggy.

The product grid also dims and stops accepting clicks while `navigating.to` is
set, so a slow filter reads as in-flight rather than as a no-op.

### A4 ✅ — The filter panel could become impossible to close
`src/routes/shop/+page.svelte:205-206, 268`

```js
const mobile = isMobile();          // evaluated once, never again
let showFilter = $state(mobile ? false : true);
…
{#if mobile}<Button onclick={() => (showFilter = !showFilter)}>…</Button>{/if}
```

`isMobile()` (`src/lib/global.svelte.ts:91`) is a plain function returning
`window.innerWidth <= 768`, with `false` on the server and no resize listener.
Consequences:

- SSR always renders the desktop branch, so on a phone the filter sidebar is
  open on first paint and pushes the product grid below the fold until hydration.
- Rotate a phone to landscape (>768px) and back, or resize a browser window, and
  neither `mobile` nor `showFilter` updates.
- Worst case: the page hydrates at >768px (`mobile === false`), the user narrows
  the window, and the toggle button is never rendered — the sidebar is stuck
  open with no way to dismiss it.

**Fixed with CSS rather than a media query**, which turned out to be strictly
better here: it removes the SSR problem too, since the server no longer has to
guess a viewport.

```svelte
<Button onclick={() => (showFilter = !showFilter)} class="mb-4 w-40 lg:hidden">
<aside class="{showFilter ? 'block' : 'hidden'} lg:col-span-1 lg:block">
```

From `lg` up the panel is always shown and the toggle is always hidden, so the
stuck-open state is now unreachable regardless of what `showFilter` holds. The
`isMobile` import is gone from this file entirely.

### B2 ✅ — The shop's own header hid behind the site header
`src/routes/shop/+page.svelte:225`

```svelte
<header class="sticky top-0 z-40 …">
```

The global site header is `sticky top-0 z-50`
(`src/lib/components/header.svelte:74`). Both pin to `top: 0`, so once the page
scrolls, the shop header — which holds the search box, the result count and the
Clear-filters button — slides underneath the site header and disappears. The
sidebar below it already accounts for this with `sticky top-32`.

**Fixed** with the variable, not the magic number. `--header-h: 4rem` is defined
on `:root` in `layout.css` next to a comment naming `header.svelte`'s `h-16` as
its source. The shop header is `sticky top-[var(--header-h)]` and the filter
sidebar is `sticky top-[calc(var(--header-h)+8rem)]`, so both track the header if
it ever changes height.

### C1 ✅ — Untranslated string on a fully translated page
`src/routes/shop/+page.svelte:233`

```svelte
Total items: {data?.pagination?.totalCount ?? 0}
```

The only hardcoded English left on the shop page. It was missed in the i18n pass
because the text is immediately followed by an interpolation, which the sweep's
text-node pattern skipped.

**Fixed** exactly as written, with `shop_total_items` added to `en` and `am`.

---

## 3. Product detail

### C2 ✅ — A whole card was a `<button>` with no affordance
`src/lib/components/product-detail.svelte:999`

```svelte
<button type="button" onclick={printSpecSheet} class="mt-4.5 flex flex-wrap gap-3">
  <div …><span>…icon…</span><div><div>Tech spec sheet</div>…</div></div>
</button>
```

The spec-sheet download is a bordered info card that happens to be a button. It
has no hover state, no cursor change beyond the default button styling, and
reads as a static callout — a customer is unlikely to discover it is clickable.
There is a second `printSpecSheet` trigger at line 1071.

**Fixed.** The card is now the button itself rather than a button wrapping a
card: `cursor-pointer`, hover border/background, an `active:scale-[0.99]` press
state and a download icon on the trailing edge. The nested `<div>`s became
`<span class="block">`, so the button's content model is valid and its
accessible name is the title and subtitle rather than a nested block soup.

---

## 4. The cart drawer

### A5 ✅ — The cart was a 760px-wide table on a 360px phone
`src/lib/components/floating-cart/cart.svelte:91`

```svelte
<table class="w-full min-w-[760px] border-collapse text-sm">
```

Nine columns — product, colour, width, thickness, length, qty, unit price, total,
remove — inside `overflow-x-auto`, in a sheet that is `width: 100%` on mobile. On
a phone the customer sees the product name and colour; **the quantity, the price,
the line total and the remove button are all off-screen behind a horizontal
scroll**.

This is the exact problem `buy-order-row.svelte:317-323` documents having solved
for the order table:

> "The order table used to be one wide `<table>` inside an overflow-x container,
> which on a phone hid the price, the total and the delete button behind a
> sideways scroll most people never find."

The fix landed on `/buy` and never came back to the drawer.

**Fixed** by copying the reference. `cart-item-detailed.svelte` is no longer a
`<tr>`: it is `grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_auto_minmax(0,7rem)_auto]`,
with per-cell labels that disappear at `sm` and the delete button moving up
beside the product name on mobile. The `<table>` in `cart.svelte` became a
`divide-y` list with headings that only render from `sm`. No horizontal scroll
at any width.

Two things collapsed along the way: colour/width/thickness/length are now one
spec line rather than four columns (the per-axis breakdown lives on /checkout
and the receipt — the drawer is for a glance), and the row's inline `1.15`/`0.15`
VAT arithmetic was replaced with `$lib/vat`, the same fix A8's sibling got on the
buy page.

### A6 ✅ — "Clear" wiped the whole order with one tap, no confirmation
`src/lib/components/floating-cart/cart.svelte:122` ·
`src/routes/buy/+page.svelte:200`

Both the drawer's **Clear** and the buy page's **Start over** call
`cart.clearCart()` directly. On a phone, Clear sits immediately beside
**Checkout** in a two-button flex row. A mis-tap destroys an order that may have
taken ten minutes to build, with no undo — the cart is overwritten in
localStorage by the `$effect` in `cart.svelte.ts:162`.

**Fixed** with the forgiving option rather than the cheap one. Both call sites
snapshot the cart, clear it, and raise a 10-second toast carrying an Undo action
that re-adds the snapshot:

```js
const snapshot = [...cart.items];
cart.clearCart();
toast.success(m.cart_cleared_toast(), {
  duration: 10000,
  action: { label: m.cart_undo(), onClick: () => { /* re-add snapshot */ } }
});
```

A confirm dialog would have taxed the intentional case to protect the
accidental one; undo taxes neither.

### C3 ✅ — The empty cart was a dead end
`src/lib/components/floating-cart/cart.svelte:131-138`

Empty state shows an icon and two lines of text, and no way forward. The
checkout page's empty state gets this right — it offers a "Browse" button.

**Fixed** — a "Start an order" button to `/buy` that also closes the drawer.

---

## 5. Checkout

### A7 ✅ — Submitting a quote looked like losing the order
`src/routes/checkout/+page.svelte:47-52` ·
`src/routes/checkout/+page.server.ts:320`

```js
onResult: ({ result }) => {
  if (result.type === 'success') {
    cart.clearCart();
    toast.success(m.checkout_quote_success());
  }
}
```

The action returns `message(...)` — no redirect. So on success the customer
stays on `/checkout`, the cart empties, and the page re-renders into its
**empty-cart state**: a package icon, "your order is empty", and a button back
to the shop. The only evidence anything worked is a toast that disappears in a
few seconds.

There is no reference number, no summary of what was sent, no statement of what
happens next, and no link to `/account/orders` where the request now lives. This
is the highest-stakes moment in the journey and it reads as a failure.

**Fixed** as proposed. The action ends in
`redirect(303, /checkout/submitted?ref=${newQuoteId})` — verified to sit outside
the transaction's try/catch, so it isn't swallowed — and the `onResult` success
branch that cleared the cart is gone.

`/checkout/submitted` shows the reference number, a three-step "what happens
next" (confirmation sent → we price it → we get in touch), the order that was
sent with both the receipt export and the per-product summary export, and links
to `/account/orders` and `/shop`.

The cart clear moved onto that page and is **guarded on `ref`** — without the
guard, landing there from a bookmark would wipe a cart that was never
submitted.

### B3 ✅ — Signing in from the checkout dialog left the dialog sitting there
`src/routes/checkout/+page.svelte:230-244` · `src/lib/forms/Login.svelte:47` ·
`src/lib/forms/Signup.svelte:48`

Both dialogs post cross-route (`/login/?/login`, `/signup/?/signup`) and both
actions return `message(form, { type: 'success', … })` rather than redirecting
(`login/+page.server.ts:66`, `signup/+page.server.ts:76`). superForm's default
`invalidateAll` should refresh `data.user` behind the dialog — but nothing
closes the dialog, so the customer is left looking at the form they just
submitted, with the now-authenticated page hidden behind it.

**Fixed.** `DialogComp` now takes a bindable `open`, and `Login`/`Signup` take an
optional `onSuccess` callback fired from their `onResult` on success or
redirect. Checkout and `/quotes` both bind the two dialogs and close them.
Both forms already toast on success, so the state change is announced.

### B4 ✅ — Guest and signed-in checkout asked for different things
`src/routes/checkout/+page.svelte:255-320`

The guest branch asks name, email, phone, customer type, and TIN + trade licence
for companies. The signed-in branch asks nothing at all — it shows the profile
and a submit button. A company customer who happens to be logged in is never
asked for a TIN, and the server then throws
`'Missing name for quote request — please update your profile.'`
(`+page.server.ts:202-205`) if the profile is incomplete — an error the customer
can't act on from this page.

**Fixed** with the first option. The checkout `load` now reads the customer's
profile and returns `missingProfileFields`; the signed-in branch renders an
input for each gap inside a dashed panel, with a link to save them to the
profile instead. The action already fell back to form values
(`resolvedName = customerInfo?.name ?? name`), so filling the gaps here makes
those throws unreachable in normal use.

The three error strings were rewritten anyway, as a safety net, to say what to
do rather than just what is missing.

---

## 6. Order history & account

### A8 ✅ — The data table rendered a phantom empty pane on phones
`src/lib/components/Table/data-table.svelte:215, 399`

```svelte
<Resizable.Pane defaultSize={isMobile() ? 100 : visibleCols * 20} …>
…
{#if isMobile()}<Resizable.Pane defaultSize={0} />{:else}<Resizable.Pane />{/if}
```

Same non-reactive `isMobile()` as **A4**, called during render. It returns
`false` on the server, so a phone gets the desktop markup — a second, empty
resizable pane taking roughly half the width beside the table — and the values
disagree between SSR and hydration. It never responds to rotation either.

This now shows on `/account`, `/account/history` and
`/dashboard/customers/[id]/history`, since order history was moved onto this
component.

**Fixed** with the reactive query. The project already had
`$lib/hooks/is-mobile.svelte.ts` — an `IsMobile extends MediaQuery` used by the
shadcn sidebar — so `data-table.svelte` uses `new IsMobile()` and reads
`isMobile.current`. No new abstraction, and it now responds to rotation.

`isMobile()` has been **deleted from `global.svelte.ts`**, so the broken pattern
can't be picked up again. Its third caller, `DateMonth.svelte`, moved to
`IsMobile` too (and lost a dead `let number = isMobile` line).

---

## 7. Payment

### C4 ✅ — No way back from the payment page
`src/routes/pay/[token]/+page.svelte`

The page is reached from an emailed link and has no header link, no "contact
us", and no route back into the site if the customer wants to check something
before paying. The reject/cancel actions are the only exits, and both are
destructive.

**Fixed** — a "Questions about this order? Contact us" link under the Chapa
security note, pointing at `/contact-us?order={id}`.

---

## Cross-cutting: responsiveness — all fixed

| # | Issue | Where |
|---|---|---|
| A1 | Two nav bars, 768–1023px | `header.svelte:91, 213`, `bottomMenu.svelte:42` |
| A4 | `isMobile()` non-reactive, SSR-false | `global.svelte.ts:91` → `shop/+page.svelte:205` |
| A5 | 760px min-width table in a full-width mobile sheet | `floating-cart/cart.svelte:91` |
| A8 | `isMobile()` in table render, phantom pane | `Table/data-table.svelte:215, 399` |
| B2 | Two `sticky top-0` headers stacking | `shop/+page.svelte:225` |

**The root cause of A4 and A8 was one function**, and it has been deleted.
`isMobile()` was a synchronous `window.innerWidth` read with an SSR guard
returning `false`, so every caller inherited three bugs: wrong on the server,
frozen after the first call, deaf to resize.

No new abstraction was needed — `$lib/hooks/is-mobile.svelte.ts` already
exported `IsMobile extends MediaQuery` for the shadcn sidebar. `data-table` and
`DateMonth` use it; `shop` needed no breakpoint in JS at all once the panel
became CSS-driven.

**Things that are already right**, and worth not regressing:

- `buy-order-row.svelte` — stacked on mobile, grid from `sm`, per-cell labels.
  This is the pattern the cart drawer should copy.
- `Footer.svelte:35` — `pb-40 lg:pb-28` correctly clears the fixed bottom nav.
- `cart.svelte:76` — the inline `style="width:100%;max-width:56rem"` on the sheet,
  with the comment explaining why a utility class loses that cascade battle.
- `product-detail.svelte:553` — `lg:sticky` only, with a comment explaining that a
  sticky gallery on a one-column mobile layout hides the controls below it.

---

## Worth verifying by hand

The changes below are behavioural and deserve a click-through before release:

- **Submit a quote as a guest and as a signed-in customer.** Confirm the
  redirect lands on `/checkout/submitted`, the reference matches, and the cart
  is empty afterwards — but *not* if you open that URL without a `ref`.
- **Sign in from the checkout dialog.** The sheet should close and the page
  should switch to the authenticated branch underneath it.
- **A signed-in customer with no phone on file.** The dashed panel should appear
  with just the phone input, and the submit should succeed without touching
  Account → Settings.
- **The cart drawer on a real phone**, at 360px — every control reachable, no
  sideways scroll.
- **Clear the cart, then Undo** within ten seconds, on both the drawer and the
  buy page.
- **Resize the window across 768px and 1024px** on `/shop` and `/account/history`
  — one nav bar at a time, filter panel toggling correctly, no phantom pane.
