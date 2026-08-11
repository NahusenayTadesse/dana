# UI Bugs & Proposed Fixes

Findings from a pass over the storefront, account area and shared table/print
components. Every item below is anchored to a file and line, and each was read
in the source rather than inferred.

Severity key: **High** = visibly broken or silently loses content ·
**Medium** = wrong behaviour a user can hit · **Low** = polish, consistency,
dead code.

> **Status: all items fixed.** Entries are kept below, marked ✅, as a record of
> what changed and why. `Stars.svelte`, `Spins.svelte` and `imgSeparator.svelte`
> were deleted outright rather than repaired.
>
> Verification after the full pass: build passes; `svelte-check` is at **550
> errors / 198 warnings**, down from a **574 / 216** baseline before any of this
> work. Every a11y and deprecation warning in the list below is gone — the 198
> remaining are `state_referenced_locally` reactivity notes, almost all in
> dashboard forms that were never in scope here.

---

## High — fixed

### 1. ✅ The star field never rendered, and painted a broken gradient in dark mode
`src/lib/components/Stars.svelte:5` — **component deleted**

```js
let stars: { top: string; left: string; delay: string }[] = [];
onMount(() => { stars = Array.from({ length: 200 }, () => ({ … })); });
```

`stars` is a plain `let`, not `$state`, so assigning it in `onMount` never
triggers an update — the `{#each}` renders nothing and the component has been
dead since it was written. (`svelte-check` flags this: *"`stars` is updated, but
is not declared with `$state(...)`"*.)

Two further problems in the same file, line 21:

```html
<div class="stars -z-1 bg-linear-to-r from-dark-blue to-black h-screen w-screen dark:block hidden">
```

- `dark-blue` is not a defined colour token — it appears nowhere in
  `src/routes/layout.css`. The gradient has no start colour, so in dark mode
  this renders as a full-viewport near-black wash rather than a night sky.
- The element has no `pointer-events: none`. It is behind content at `-z-1`
  today, so clicks are not blocked, but that is one z-index change away from
  making the whole page inert.

**Resolved by removal.** `Stars.svelte` and the (0-byte) `Spins.svelte` were
deleted along with their imports and render sites in `src/routes/+layout.svelte`.
Nothing referenced either component anywhere else, so no replacement was needed
— which also retires item #13's `Spins` half.

---

### 2. ✅ Mobile bottom nav: active-state styling applied to every tab
`src/lib/components/bottomMenu.svelte:12-13, 60-63, 76-81, 89-91`

```js
const on  = 'text-primary shadow-lg shadow-primary/20 bg-primary/10';
const off = 'text-muted-foreground hover:text-foreground hover:bg-muted/50';
```

These are class-name strings, so they are **always truthy**. The template then
tests them as booleans:

```html
<div class="… {on ? 'drop-shadow-lg' : ''}">   <!-- always 'drop-shadow-lg' -->
{#if off}<div class="… hover glow …"></div>{/if}   <!-- always rendered -->
```

Every tab gets the "active" drop shadow and every tab gets the hover-glow
layer, including the search trigger, which is not a route at all. The only
thing actually distinguishing the current tab is `blacken()`.

**Fixed.** `blacken()` is gone, replaced by `isActive(url)`; each item now
computes `{@const active = isActive(item.url)}` and drives the container class,
the drop shadow and the hover glow off it. The item also gained
`aria-current="page"`, so the current tab is announced and not just coloured.
The search trigger — which is a dialog, not a route — now reflects the dialog's
own `open` state rather than a constant.

While in the file, the nav labels were switched from eagerly-called message
functions to stored references called in the markup (`{item.title()}`), which
closes item #14.

---

### 3. ✅ DataTable page size was captured once and could hide every row
`src/lib/components/Table/data-table.svelte:44`

```js
let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: data.length });
```

`data.length` is read a single time, at component creation. Two consequences:

- **Empty on first render → `pageSize: 0`.** TanStack slices `0..0`, so when
  the data arrives the table shows no rows at all. Any awaited/streamed list, or
  a filter that momentarily empties the set, hits this.
- **Prop changes don't update it.** `OrderHistoryTable` now feeds this
  component a server-paginated slice; navigating from a page of 10 orders to a
  page of 25 keeps `pageSize` at 10, and 15 orders silently disappear behind a
  pager the user did not ask for.

**Fixed.** The initial read is kept — effects don't run during SSR, so seeding
from the first `data` is what keeps the server-rendered row count equal to the
hydrated one — and a `$effect` now resyncs on any genuine change:

```js
const DEFAULT_PAGE_SIZE = 25;
let pagination = $state({ pageIndex: 0, pageSize: data.length || DEFAULT_PAGE_SIZE });

let lastDataLength = data.length;
$effect(() => {
  if (data.length === lastDataLength) return;
  lastDataLength = data.length;
  pagination = { pageIndex: 0, pageSize: data.length || DEFAULT_PAGE_SIZE };
});
```

The length comparison matters: resetting unconditionally would stomp a page size
the user picked from the "Pages" menu on every re-render. `|| DEFAULT_PAGE_SIZE`
removes the `pageSize: 0` case that rendered nothing. The two
`state_referenced_locally` warnings this raises are suppressed with
`svelte-ignore` and a comment explaining that the initial read is the point.

---

### 4. ✅ The pinned column was the wrong one
`src/lib/components/Table/data-table.svelte:264, 284`

```svelte
class="{index === 1 ? 'sticky left-0 z-10 bg-background' : ''} …"
```

`Table.Root` wraps the table in `overflow-x-auto`, so `sticky left-0` does work
— but it is applied to the **second** column. On horizontal scroll, column 0
(the row number in most `columns.ts` files) slides underneath the pinned second
column and is covered by its opaque `bg-background`.

**Fixed.** `index === 0` in both the header and the body cell. The header also
moved from `z-10` to `z-20` so the pinned heading stays above pinned body cells
rather than tying with them.

---

### 5. ✅ Table pagination buttons escaped the table card
`src/lib/components/Table/data-table.svelte:308-311`

```svelte
<div class="absolute -bottom-5 flex w-full items-end justify-end …">
```

The nearest ancestor is `<div class="rounded-md border">` — not positioned.
`Table.Root`'s internal `relative` wrapper is a *sibling* of this div, not an
ancestor, so the absolute box resolves against the initial containing block and
the Previous/Next buttons land at the bottom of the viewport rather than under
the table. `-bottom-5` also pulls them outside whatever they do resolve
against.

This is mostly hidden today because `getPageCount() > 1` is false while
`pageSize === data.length` (see #3) — but it appears the moment a user picks a
page size from the "Pages" menu.

**Fixed.** The pager is in normal flow now:

```svelte
<div class="flex items-center justify-end gap-2 border-t px-2 py-2">
```

and gained a `Page {page} of {total}` indicator on the left (new
`table_page_of` message in `en`/`am`), since with the pager previously
off-screen there was nothing telling you where you were.

---

## Medium — fixed

### 6. ✅ `Math.random()` table id caused a hydration mismatch
`src/lib/components/Table/data-table.svelte:130`

```js
const uniqueTableId = `table-${Math.random().toString(36).substring(2, 15)}`;
```

This runs during SSR and again on the client, producing two different ids. The
rendered `id` attribute mismatches on hydration, and `Pdf` receives
`tableId="#{uniqueTableId}"` — if the DOM keeps the server value while the
component holds the client value, `document.querySelector(tableId)` returns
`null` and both Print and CSV export silently no-op (they log to console and
return).

**Fixed.** Swapped for Svelte 5's SSR-stable id. It has to be a bare
declaration initializer — Svelte rejects `$props.id()` nested in an expression —
so the prefix is applied on the following line:

```js
const instanceId = $props.id();
const uniqueTableId = `table-${instanceId}`;
```

---

### 7. ✅ `max-h-96` on a `<table>` did nothing
`src/lib/components/Table/data-table.svelte:257`

```svelte
<Table.Root id={uniqueTableId} class="relative max-h-96">
```

`class` lands on the `<table>` element itself. A table box ignores `max-height`
without an overflow context, so long tables still render at full height — the
intended "scroll the body, keep the header" never happens.

**Fixed.** `Table.Root` gained a `containerClass` prop, because its scroll
container is internal and `class` lands on the `<table>`. Wrapping it in another
`overflow-y-auto` div would not have worked: `overflow-x: auto` computes
`overflow-y` to `auto` too, so `Table.Root`'s own container was already the
scrollport and an outer one would never have been consulted by `position: sticky`.

```svelte
<Table.Root id={uniqueTableId} containerClass="max-h-96">
  <Table.Header class="sticky top-0 z-30 bg-background">
```

`z-30` on the header keeps it above the `z-20` pinned first column from #4.

---

### 8. ✅ The buy page recomputed VAT by hand instead of using `$lib/vat`
`src/routes/buy/+page.svelte:106-118`

```js
const unitExclVat = item.priceIncludesVat ? item.price / 1.15 : item.price;
const unitVat = item.priceIncludesVat ? item.price - unitExclVat : item.price * 0.15;
```

The same file already imports `netOf` from `$lib/vat` and uses it in
`sumAmount`, and `$lib/vat` exists precisely because this arithmetic was being
reimplemented per surface. Changing `VAT_RATE` would update the cart drawer,
the checkout summary, the receipt and the server — and leave the buy page
quoting 15% forever.

**Fix:**

```js
import { netOf, vatOf, grossOf } from '$lib/vat';
const subtotalExclVat = $derived(cart.items.reduce((s, i) => s + netOf(Number(i.price), i.priceIncludesVat) * i.quantity, 0));
const vatTotal        = $derived(cart.items.reduce((s, i) => s + vatOf(Number(i.price), i.priceIncludesVat) * i.quantity, 0));
const grandTotal      = $derived(cart.items.reduce((s, i) => s + grossOf(Number(i.price), i.priceIncludesVat) * i.quantity, 0));
```

**Fixed** exactly as written above. This also cleared the
`'item.price' is possibly null` type errors those lines produced, and removed
the now-unused `sumAmount()` helper (see #17).

---

### 9. ✅ Order history showed two pagination scopes at once
`src/lib/components/OrderHistoryTable.svelte:111`

Now that this table renders through `DataTable`, the DataTable toolbar's
"N Results" badge and "Pages" dropdown describe **only the current server
page**, while the pager underneath describes the **whole** result set. A
customer on page 2 of 7 sees "10 Results" above and "Showing 11–20 of 63"
below.

**Fixed.** `DataTable` takes a `serverPaginated` boolean that hides the Pages
menu, the Results badge and its own pager; `OrderHistoryTable` passes it. The
Columns toggle and the export button stay, since both are meaningful for the
page you are looking at.

---

### 10. ✅ `<svelte:component>` was deprecated in runes mode
`src/lib/components/accordion.svelte:116` · `src/lib/components/faq.svelte:123` ·
`src/lib/components/mission.svelte:146` · `src/routes/about/+page.svelte:291, 549, 592`

Six call sites. Components are dynamic by default in Svelte 5; this will be
removed in Svelte 6.

**Fixed.** All six converted to `<value.icon class="size-6" />` form. No
`<svelte:component>` remains outside `src/lib/components/ui`.

---

### 11. ✅ Lightboxes were not keyboard- or screen-reader-reachable
`src/lib/components/lightbox.svelte:89, 109` ·
`src/lib/components/imageGallery.svelte:112` ·
`src/lib/components/TeamStoreGallery.svelte:182`

- `lightbox.svelte` puts `onclick` (close) on `<main>` and a stop-propagation
  `onclick` on `<img>` — non-interactive elements with mouse handlers and no
  keyboard equivalent.
- `imageGallery.svelte` and `TeamStoreGallery.svelte` use
  `<div role="dialog">` with no `tabindex`, so focus never enters the dialog
  and the backdrop can only be dismissed by mouse.

`lightbox.svelte` does bind Escape on `svelte:window`, so the behaviour is
mostly there — it just isn't announced or focusable.

**Fixed** in all three. Each backdrop is now a real
`<button type="button" class="absolute inset-0">` sitting behind the content,
which also removed the `stopPropagation` handlers the image/card carried purely
to defend against the ancestor click handler. The dialog containers gained
`tabindex="-1"`, `aria-label` and — in `lightbox.svelte` — focus-on-open, so
Escape and Tab act on the dialog rather than the page underneath.

Not done: folding `TeamStoreGallery` and `imageGallery` into `lightbox.svelte`.
They are near-identical copies and should be merged, but that is a refactor with
visual consequences rather than a bug fix, and `imageGallery.svelte` turns out to
be imported nowhere at all — worth deleting rather than merging. Flagged as
follow-up, not silently done.

---

### 12. ✅ Decorative cursor blobs sat at `z-index: 0`
`src/lib/cursor.svelte:96-99, 112-116`

```css
position: fixed; z-index: 0; pointer-events: none;
```

`pointer-events: none` keeps clicks working, but a fixed element at `z-index: 0`
still paints above static page content in the same stacking context, so the
blobs can wash over body text.

**Fixed.** Both the canvas and the `.blob` elements moved to `z-index: -1`.

---

## Low — fixed

### 13. ✅ An empty component was still imported and rendered
`src/lib/components/imgSeparator.svelte` (0 bytes)

Rendered inside `src/routes/blogs/[id]/+page.svelte`. The build still reports
`Generated an empty chunk: "chunks/imgSeparator.js"`.

`Spins.svelte`, the other 0-byte component, has been **deleted** along with
`Stars.svelte` (see #1).

**Fixed by deletion.** `imgSeparator.svelte` is gone, along with its imports in
`src/routes/+page.svelte`, `src/routes/blogs/[id]/+page.svelte` and
`src/routes/contact-us/+page.svelte`, and the two render sites. The
`Generated an empty chunk` warning no longer appears in the build.

---

### 14. ✅ Nav labels were resolved once, so they couldn't follow a locale switch
`src/lib/components/bottomMenu.svelte:6-11` — **fixed alongside #2**

```js
const mobNav = [{ title: m.header_nav_home(), … }];
```

The message functions are *called* at component init and the result frozen in a
`const`. This works today only because `setLocale()` triggers a reload; it
breaks the moment locale switching becomes client-side. `src/routes/about/+page.svelte`
already does this correctly — it stores the function reference (`title: m.about_page_layer_power_title`)
and calls it in the markup.

**Fixed.** `mobNav` now stores references (`title: m.header_nav_home`) and the
markup calls them (`{item.title()}`), matching the about page and
`OrderHistoryTable`'s `filters` array. `LanguageSelector` (#15) still has the
same shape and is still open.

---

### 15. ✅ Language selector cached the current locale
`src/lib/components/LanguageSelector.svelte:20`

```js
const currentLang = getLocale();
```

Same shape as #14 — the highlighted/checked entry is computed once. Now that
the locale list is `['en', 'am']`, the `localeLabels`/`localeShort` maps are
complete again (they were missing a `zh` entry while Chinese was configured,
which rendered an empty label).

**Fixed.** `const currentLang = $derived(getLocale())`. While in the file,
`changeLang(locale: string)` was retyped to `changeLang(locale: Locale)`, which
cleared a real type error — `setLocale` accepts the `'en' | 'am'` union, not any
string.

---

### 16. ✅ The payment page had the only unstyled customer-facing order table
`src/routes/pay/[token]/+page.svelte:47`

A hand-rolled `<table class="w-full min-w-[480px]">` inside `overflow-x-auto`.
It works, but it is the one order summary a customer sees that shares no markup
with the cart, the checkout manifest or the printable receipt — so column
widths, number alignment and empty-state wording all drift independently.

**Fixed.** Extracted `src/lib/components/order-lines-table.svelte`, now used by
both `order-receipt.svelte` and the payment page. It takes a normalised
`OrderLine[]` and has a `compact` mode that folds colour/width/thickness/length
into the product cell for the narrow payment card, versus a column each on the
receipt. The receipt's table styles moved into it, so there is one definition of
column widths, borders and number alignment.

The payment page also gained Save-as-PDF and Export-to-CSV, as suggested. The
payment controls are wrapped in `data-print-hide` so the printed copy reads as a
record of the order rather than a form.

**Deliberately not included: the checkout manifest.** Its rows carry quantity
steppers and remove buttons — that is `cart-item-detailed.svelte`, a different
component with a different job. Forcing it through the same read-only table
would have needed a column-configuration layer more complex than the duplication
it removed.

---

### 17. ✅ Dead code

- `src/routes/account/settings/+layout.svelte:7` — `Plus` and `Sheet` imported,
  neither used.
- `src/routes/buy/+page.svelte:89, 103` — `sumAmount()` is computed into
  `orderTotals.amount`, which is never rendered. The summary shows
  `distinctProducts`, `lines`, `quantity` and `lengthText` only.

**Fixed.** Both deleted. `sumAmount()` went with `orderTotals.amount`, as part
of the #8 rewrite.

---

## Follow-ups worth doing, not done here

- **`imageGallery.svelte` is imported nowhere.** It is a near-duplicate of
  `TeamStoreGallery.svelte`. Its a11y was fixed along with the others, but it
  should probably just be deleted — left alone because removing an unreferenced
  component is a call for whoever knows whether it is mid-migration.
- **Three lightbox implementations.** `lightbox.svelte`, `TeamStoreGallery` and
  `imageGallery` all implement the same modal. They should collapse into one.
- **`svelte-check` still reports 550 errors**, overwhelmingly pre-existing
  `possibly null` / implicit-any noise in the dashboard forms. Not itemised
  here; the baseline before any of this work was 574.
- Chinese has been removed from `project.inlang/settings.json` and
  `messages/zh.json` deleted, so the "missing zh translations" gap noted
  earlier no longer applies. `src/lib/paraglide/` was regenerated and now
  emits `locales = ["en","am"]`.
- After the High-list fixes: build passes, `svelte-check` is unchanged at 557
  errors (all pre-existing), and files-with-problems dropped from 158 to 157
  with `Stars.svelte` gone.
