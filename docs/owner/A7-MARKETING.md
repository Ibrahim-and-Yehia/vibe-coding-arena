# Owner A7 — Marketing site

**Person A (or a third person on `feat/marketing`). Branch `feat/owner`.**

The public site. Fully isolated from everything else — this is the safest work to hand off.

---

## Files

```
app/(marketing)/layout.tsx
app/(marketing)/page.tsx
app/(marketing)/features/page.tsx
app/(marketing)/pricing/page.tsx
app/(marketing)/about/page.tsx
app/(marketing)/contact/page.tsx
app/(marketing)/contact/actions.ts
components/marketing/site-header.tsx
components/marketing/site-footer.tsx
components/marketing/hero-floor.tsx
components/marketing/contact-form.tsx
```

**Delete `app/page.tsx`.** The route group `(marketing)` provides `/` instead. The
parentheses mean the folder name does not appear in the URL — it exists purely to give
these pages a shared layout that the dashboard and customer app do not inherit.

> After deleting `app/page.tsx`, Next's generated route types go stale and `tsc` reports
> `Cannot find module '../../app/page.js'`. Fix with:
> ```bash
> rm -rf .next/types && npx next typegen
> ```

---

## 1. `app/(marketing)/layout.tsx`

```tsx
export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
```

No `dark` class — the marketing site is the warm light theme.

## 2. `components/marketing/site-header.tsx`

Sticky, `bg-background/85 backdrop-blur`, bottom border, 4rem tall. Left: "SERVA" wordmark
in `tracking-[0.2em] uppercase` linking to `/`. Centre (hidden below `md`): Features,
Pricing, About, Contact. Right: ghost "Sign in" → `/login`, primary "Get started" →
`/signup`.

## 3. `components/marketing/site-footer.tsx`

Top border, the wordmark with the tagline "Run your floor, live.", and the same nav links.

---

## 4. `components/marketing/hero-floor.tsx` — the animated hero

`"use client"`. This is what makes the landing page memorable: **the real `FloorCanvas`
component from A5**, driven by a scripted sequence instead of the database.

- A hard-coded `LAYOUT: EditableObject[]` — a kitchen, a bar, an entrance, and nine tables
  positioned on the 1000×650 canvas. Give them plausible ids (`"t1"`, `"t2"`…).
- A `SCRIPT: Frame[]` where `Frame = Record<objectId, { status: TableStatus; orders: number[] }>`.
  Eight frames telling a small story: a table gets seated, orders arrive, one runs amber
  then red, another party sits, the late one clears, a new one starts. Use realistic-looking
  order numbers in the teens.
- `useEffect` with `setInterval` advancing the frame every 2200ms, wrapping with modulo.
- Build the `live` record from the current frame, defaulting anything not mentioned to
  `{ status: "free", orderNumbers: [] }`.
- Wrap in `<div className="dark rounded-xl border bg-background p-3 shadow-2xl">` so the
  hero shows the **dark ops console** against the light page — the contrast is the point.

> This is presentational animation, not fake business data. Nothing is written to the
> database and no user ever sees it as their own venue.

> **If a third person builds the marketing site on a separate branch**, they must not import
> `components/floor/floor-canvas.tsx` (Person A owns it). Write a trimmed standalone copy
> inside `components/marketing/` instead. Duplication is far cheaper than a merge conflict
> during a timed event.

---

## 5. `app/(marketing)/page.tsx` — home

Sections in order:

1. **Hero** — a small pill ("For cafes, restaurants, and bars"), h1 **"Run your floor,
   live."**, a one-sentence subhead, two CTAs ("Set up your venue" → `/signup`, "See the
   live demo" → `/login`), then `<HeroFloor />` with a caption underneath.

2. **Problem** — two columns. Left: a heading like *"The information exists. It's just
   scattered."* and a paragraph. Right: four bordered cards each holding one real question
   an owner asks mid-service ("How long has table six actually been waiting?", "Are we out
   of salmon? Since when?", "What does this dish actually cost us to make?").

3. **Three pillars** — alternating image/text rows, one per pillar, each with an icon, a
   headline, a paragraph, and three checkmarked points:
   - *Menu & inventory that agree with each other*
   - *Draw your floor. Watch it come alive.*
   - *Know which table is about to be unhappy*

4. **How it works** — three numbered cards: put your QR on the tables → orders land
   instantly → move it along and free the table.

5. **Extras** — four small cards: Smart timing, Recipe costing, Kitchen display, One QR per
   venue.

6. **CTA** — "Set up your venue in about five minutes." with the signup button.

Use `text-balance` on headings and `text-pretty` on body paragraphs. Constrain content with
`mx-auto w-full max-w-6xl px-5`.

## 6. `app/(marketing)/features/page.tsx`

Four groups — Menu, Inventory, Floor plan, Orders & alerts — each a heading with an icon
and a grid of small cards (feature name + one-line description). Then a "For your
customers" band: no app to install, they pick their own table, they can watch their order.

Describe only what actually exists. Every feature listed here must be real.

## 7. `app/(marketing)/pricing/page.tsx`

Three tiers, middle one featured (`border-primary shadow-lg`, "Most popular" badge):

| Tier | Price | For |
|---|---|---|
| Counter | $29/mo | Single-room cafes and small bars |
| Service | $79/mo | Full-service restaurants with a real kitchen |
| Group | $199/mo | Multiple venues |

Differentiate by scale: Counter caps tables and offers item-level stock only; Service adds
ingredient inventory, recipes, costing, the kitchen display and SLA alerts; Group adds
multi-venue.

Below, an `Accordion` FAQ answering: hardware needed, whether customers install anything,
changing the menu mid-service, how the wait-time target is calculated, and what happens
when a table is freed.

**No billing integration.** Every CTA goes to `/signup`.

## 8. `app/(marketing)/about/page.tsx`

Prose page. The argument: most hospitality software makes you think like a database — you
translate your room into table IDs and back again under pressure. Serva starts from the
room. Then four "What we optimise for" cards: show the room not a list; warn early not
after; one number everywhere; nothing you have to babysit. Close with who it is for
(independents, 5–50 tables).

## 9. `app/(marketing)/contact/actions.ts`

```ts
export async function submitContact(input: {
  name: string; email: string; businessName: string; message: string;
}): Promise<ActionResult>
```

Uses `createAdminClient()` — the visitor is not authenticated and the `anyone can contact`
RLS policy allows anon insert, but going through the server keeps it uniform. Inserts into
`contact_messages` with `business_name` null when blank.

## 10. `components/marketing/contact-form.tsx`

`"use client"`. Fields: name, email, venue name (optional), message. On success swap the
whole form for a success `Alert` — do not just toast, the page should visibly change state.

## 11. `app/(marketing)/contact/page.tsx`

Two columns: left has the heading plus three cards pointing at the demo, the features page,
and the reply time; right has the form.

---

## Checkpoint

```bash
rm -rf .next/types && npx next typegen
npx tsc --noEmit && npx eslint . && npm run build
```

Manual: `/`, `/features`, `/pricing`, `/about`, `/contact` all render; header and footer
links work; the hero animation cycles; the contact form submits and the row appears in
Supabase; every CTA reaches `/signup` or `/login`; the pages are readable at mobile width.

Commit: `git commit -am "Marketing site"`

---

## Person A is done

Push, then coordinate the merge per `01-TEAM-SPLIT-AND-GIT.md` — **Person B merges first**,
then you bring `main` into your branch and merge up.
