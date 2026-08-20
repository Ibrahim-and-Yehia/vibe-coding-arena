# Owner A1 — Auth, route guarding, onboarding wizard

**Person A. Branch `feat/owner`.**

Goal: a person can sign up, is walked through a four-step wizard, and lands in a dashboard
whose menu and floor plan are already populated with a plausible starting point for their
business type.

---

## Files you create

```
proxy.ts
lib/slug.ts
lib/currencies.ts
lib/presets.ts
app/login/page.tsx
app/signup/page.tsx
app/onboarding/page.tsx
app/onboarding/actions.ts
components/auth/auth-shell.tsx
components/auth/login-form.tsx
components/auth/signup-form.tsx
components/onboarding/onboarding-wizard.tsx
```

---

## 1. `proxy.ts` (project root)

**Next.js 16 renamed `middleware.ts` to `proxy.ts` and the export to `proxy`** (Trap 1).

Purpose: refresh the Supabase session cookie on every matched request, and enforce routing
rules so nobody can reach a screen that makes no sense for their state.

Build it with `createServerClient` from `@supabase/ssr` wired to `request.cookies` /
`NextResponse` cookies. Then:

```
const { data: { user } } = await supabase.auth.getUser();

not signed in + hitting /dashboard or /onboarding   -> redirect /login
signed in:
    look up profiles.venue_id
    /dashboard   and no venue    -> redirect /onboarding
    /onboarding  and has venue   -> redirect /dashboard
    /login|/signup and has venue -> redirect /dashboard
    /login|/signup and no venue  -> redirect /onboarding
```

```ts
export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/login", "/signup"],
};
```

Do not match `/order/:path*` — the customer app is intentionally public and unauthenticated.

---

## 2. `lib/slug.ts`

```ts
export function slugify(input: string): string
```
Lowercase, trim, non-alphanumeric runs → `-`, strip leading/trailing `-`, cap at 60 chars,
fall back to `"venue"` if the result is empty.

## 3. `lib/currencies.ts`

`export const CURRENCIES` — array of `{ value, label }`, e.g.
`{ value: "USD", label: "USD — US Dollar" }`. Include: USD, EUR, GBP, EGP, AED, SAR, CAD,
AUD, INR, JPY. Mark it `as const`.

---

## 4. `lib/presets.ts` — starting content per business type

**This is a product feature, not test data.** A brand-new venue with an empty menu and a
blank floor plan is useless, so choosing "Restaurant" at signup seeds a plausible starting
point the owner then edits.

Export:

```ts
export interface PresetMenuItem { category: string; name: string; description?: string; price: number; prepMinutes: number; }
export interface PresetFloorObject { area: string; kind: FloorObjectKind; shape: FloorObjectShape; label: string; seats: number; x: number; y: number; w: number; h: number; }
export interface BusinessPreset { kitchenLabel: string; categories: string[]; items: PresetMenuItem[]; areas: string[]; floorObjects: PresetFloorObject[]; }

export const BUSINESS_PRESETS: Record<BusinessType, BusinessPreset>;
export const BUSINESS_TYPE_LABELS: Record<BusinessType, string>;
```

Content guidance — keep each to roughly 9–12 items and 12–14 floor objects:

| Type | kitchenLabel | Categories | Areas |
|---|---|---|---|
| `cafe` | `Kitchen` | Coffee & Espresso, Pastries, Light Bites, Cold Drinks | Main Room, Patio |
| `restaurant` | `Kitchen` | Starters, Mains, Desserts, Drinks | Dining Room, Terrace |
| `bar` | `Bar` | Beer, Cocktails, Wine, Bar Bites | Main Bar, Lounge |

Prep times must be realistic and *varied* — that is what makes the wait-time engine
visibly interesting. Espresso 2 min, croissant 1, burger 13, salmon 15, risotto 15,
cheesecake 3.

Floor objects: coordinates on a 1000×650 canvas. Each preset needs one `kitchen` or `bar`
fixture, an `entrance`, and 8–12 tables with a mix of `round` (2 seats), `square` (4),
`rect` (6–8) and, for cafes and bars, some `stool` (1). Tables are labelled `"1"`, `"2"`…
and bar stools `"B1"`, `"B2"`… Keep them non-overlapping and roughly 20px from the edges.

---

## 5. `components/auth/auth-shell.tsx`

Server component. Centres a `Card` in the viewport with a "SERVA" wordmark linking home
above it. Props: `title`, `description`, `children`, optional `footer` node rendered under
the card.

## 6. `components/auth/login-form.tsx`

`"use client"`. react-hook-form + zod (`email`, `password` — password just `min(1)`).

- Submit → `supabase.auth.signInWithPassword(values)` using the browser client.
- On error: `toast.error(error.message)`.
- On success: `router.push("/dashboard")` then `router.refresh()`.
  **The `router.refresh()` is required** — without it the Server Components keep the old
  unauthenticated session and you appear not to be logged in.
- Loading state on the submit button with a spinning `Loader2`.

## 7. `components/auth/signup-form.tsx`

`"use client"`. Fields `fullName`, `email`, `password` (`min(8)`).

- `supabase.auth.signUp({ email, password, options: { data: { full_name } } })`.
- If `data.session` exists → `router.push("/onboarding")` + `router.refresh()`.
- If there is **no** session, email confirmation is still switched on in Supabase. Show an
  "check your inbox" `Alert` instead of failing silently. (You should have turned this off
  in `SQL-1`, but handle it so the failure is legible rather than a dead button.)

## 8. `app/login/page.tsx` and `app/signup/page.tsx`

Server components. Each sets `metadata`, renders `AuthShell` with the matching form, and a
footer cross-linking to the other page.

---

## 9. `app/onboarding/actions.ts`

One action:

```ts
export async function createVenueAction(input: {
  name: string; businessType: BusinessType; currency: string;
}): Promise<{ error: string } | undefined>
```

Sequence:

1. `createClient()` from `lib/supabase/server`, `getUser()`, redirect to `/login` if none.
2. Slug: `slugify(input.name)`. Call the `create_venue_and_link_owner` RPC.
   **Handle slug collisions:** loop up to 6 attempts; on attempt *n* use
   `` `${baseSlug}-${n+1}` ``. Postgres error code `23505` is the unique violation —
   retry on that, return the error on anything else.
3. If the preset's `kitchenLabel` is not `"Kitchen"`, update the venue's `kitchen_label`.
4. Insert the preset's categories (with `sort_order` by index), select them back, then
   insert the items mapping `category` name → the new category id.
5. Insert the preset's areas, select them back, then insert `floor_objects` mapping
   `area` name → the new area id, with `z` set to the index.
6. `redirect("/dashboard")`.

**Type gotcha on steps 4 and 5:** a lookup like
`areas.find(a => a.name === o.area)?.id` is `string | undefined`, but the insert requires
`string`. Do not use `.map().filter()` — TypeScript cannot narrow through that. Use
`flatMap` and return `[]` for the miss:

```ts
preset.floorObjects.flatMap((o, i) => {
  const area_id = areaId(o.area);
  if (!area_id) return [];
  return [{ venue_id: venueId, area_id, /* ...rest */ z: i }];
})
```

---

## 10. `components/onboarding/onboarding-wizard.tsx`

`"use client"`. Four steps with a `Progress` bar and step labels: **Name → Type → Currency
→ Review**.

- **Name.** Text input. Below it, live preview: `serva.app/order/{slugify(name)}` so they
  see their URL forming.
- **Type.** Three large clickable cards — Cafe (`Coffee` icon), Restaurant
  (`UtensilsCrossed`), Bar (`Martini`) — each with a one-line description. Selected card
  gets `border-primary bg-accent` and a `Check`.
- **Currency.** shadcn `Select` from `CURRENCIES`, default `USD`.
- **Review.** Venue name, "{Type} · {Currency}", and a sentence stating exactly what will
  be created, computed from the chosen preset: *"We'll set you up with a starter menu (N
  items across M categories) and a floor plan (P objects across Q areas) — all editable the
  moment you land in the dashboard."*

Back / Next buttons; Next disabled until the current step is satisfied. Final button is
"Create my venue" → calls `createVenueAction`, shows a spinner, `toast.error` on failure.
On success the action redirects, so just call `router.refresh()`.

## 11. `app/onboarding/page.tsx`

Server component rendering `AuthShell` + `OnboardingWizard`.

---

## Checkpoint

```bash
npx tsc --noEmit && npx eslint . && npm run build
```

Manual test:
1. `/dashboard` while signed out → redirects to `/login`. ✓
2. Sign up with a fresh email → lands on `/onboarding`. ✓
3. Complete the wizard picking Restaurant → redirects to `/dashboard`. ✓
4. In Supabase Table Editor: `venues` has your row; `menu_items` and `floor_objects` have
   the preset content with your `venue_id`. ✓
5. Sign out, sign back in → straight to `/dashboard`, not onboarding. ✓

Commit: `git commit -am "Auth, route guarding, onboarding wizard"`
