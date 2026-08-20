# Owner A2 — Dashboard shell, home, settings

**Person A. Branch `feat/owner`.**

The frame every other owner screen sits inside, plus the home page and settings.

---

## Files you create

```
app/dashboard/layout.tsx
app/dashboard/page.tsx
app/dashboard/settings/page.tsx
components/dashboard/venue-context.tsx
components/dashboard/sidebar.tsx
components/dashboard/topbar.tsx
components/dashboard/user-menu.tsx
components/dashboard/notification-sheet.tsx   (scaffold now, wired up in A6)
components/dashboard/settings-form.tsx
components/dashboard/venue-qr.tsx
components/dashboard/coming-soon.tsx
lib/storage.ts
```

Also create placeholder pages so the sidebar never 404s. Each renders `<ComingSoon>` and
gets replaced in a later step:

```
app/dashboard/menu/page.tsx        -> replaced in A3
app/dashboard/inventory/page.tsx   -> replaced in A4
app/dashboard/floor/page.tsx       -> replaced in A6
app/dashboard/orders/page.tsx      -> replaced in A6
app/dashboard/kitchen/page.tsx     -> replaced in A6
```

---

## 1. `app/dashboard/layout.tsx`

Server component. This is where the app turns dark.

```
signature: export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">)
```

1. `createClient()` from `lib/supabase/server`; `getUser()`; redirect `/login` if none.
2. Read `profiles.venue_id`; redirect `/onboarding` if null.
3. Read the full `venues` row; redirect `/onboarding` if missing.
4. Render:

```tsx
<VenueProvider venue={venue}>
  <div className="dark flex min-h-screen bg-background text-foreground">
    <Sidebar />
    <div className="flex flex-1 flex-col">
      <Topbar email={user.email ?? ""} />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  </div>
</VenueProvider>
```

The `dark` class here is the *only* thing that makes the dashboard dark. The marketing site
and customer app stay light because they never get this class.

Note the redirect checks duplicate `proxy.ts`. That is intentional — the proxy is for UX,
this is the actual guarantee, and it means the layout's `venue` is never null.

## 2. `components/dashboard/venue-context.tsx`

`"use client"`. A React context holding the `VenueRow`.

- `export function VenueProvider({ venue, children })`
- `export function useVenue(): VenueRow` — throws a clear error if used outside the
  provider.

This is how deep client components (kitchen display, live floor) get `venue.id` without
prop-drilling or re-fetching.

## 3. `components/dashboard/sidebar.tsx`

`"use client"` (needs `usePathname` for the active state). Fixed 15rem column,
`bg-sidebar`, hidden below `md`.

Nav items, in order, each with a lucide icon:

| Label | href | Icon |
|---|---|---|
| Home | `/dashboard` | `LayoutDashboard` |
| Floor Plan | `/dashboard/floor` | `Map` |
| Menu | `/dashboard/menu` | `BookOpen` |
| Inventory | `/dashboard/inventory` | `Package` |
| Orders | `/dashboard/orders` | `ClipboardList` |
| Kitchen | `/dashboard/kitchen` | `ChefHat` |
| Settings | `/dashboard/settings` | `Settings` |

Home matches exactly; the rest match by `startsWith`. Active item gets
`bg-sidebar-accent text-sidebar-accent-foreground`. Footer shows the venue name from
`useVenue()` and its business type underneath, capitalised.

## 4. `components/dashboard/topbar.tsx`

Server component, 4rem tall, bottom border, contents pushed right: `<NotificationSheet />`
then `<UserMenu email={email} />`.

## 5. `components/dashboard/user-menu.tsx`

`"use client"`. A `DropdownMenu` triggered by a `User` icon button. Shows the email as a
muted label, a separator, then "Sign out" → `supabase.auth.signOut()`,
`router.push("/login")`, `router.refresh()`.

## 6. `components/dashboard/notification-sheet.tsx` — scaffold

`"use client"`. A `Sheet` triggered by a `Bell` icon. For now the body is an empty state:
"Nothing yet — alerts appear the moment something needs attention."

**A6 replaces this file entirely** with the live version. Build the shell now so the topbar
is complete.

## 7. `components/dashboard/coming-soon.tsx`

Small presentational component: a `Card` with a circled icon, title, description, and a
pill showing which step will build it. Props: `icon` (`LucideIcon`), `title`, `phase`,
`description`.

---

## 8. `app/dashboard/page.tsx` — home

Server component. `requireVenue()`, then run four queries **in parallel with
`Promise.all`**:

- the venue row
- `count` of `menu_items` for this venue
- `count` of `floor_objects` where `kind = 'table'`
- `count` of `ingredients`

Use `.select("id", { count: "exact", head: true })` for counts — it returns no rows.

Render: a heading welcoming them by venue name, three stat `Card`s (Menu items, Tables,
Ingredients tracked), and a "Where to go next" card with ghost buttons linking to
`/dashboard/menu`, `/dashboard/floor`, `/dashboard/settings`.

> **Lint gotcha:** apostrophes in JSX text must be escaped as `&apos;` or the
> `react/no-unescaped-entities` rule fails the build. Same for `"` → `&quot;`. This will
> bite you repeatedly — write "Here&apos;s" not "Here's".

---

## 9. `lib/storage.ts`

```ts
export async function uploadMedia(file: File, folder: string): Promise<string>
```

Uploads to the `serva-media` bucket at `{folder}/{crypto.randomUUID()}.{ext}`,
`cacheControl: "3600"`, `upsert: false`. Throws on error. Returns the public URL from
`getPublicUrl`.

---

## 10. `components/dashboard/settings-form.tsx`

`"use client"`. react-hook-form + zod over `name`, `kitchen_label`, `currency`, defaulted
from the venue prop.

- `currency` uses shadcn `Select`, which is not a native input — wrap it in RHF's
  `<Controller>` and drive it with `field.value` / `field.onChange`.
- Submit updates the `venues` row by id via the browser client, `toast.success("Settings
  saved")`, `router.refresh()`.
- Describe `kitchen_label` as the prep-station label shown on the kitchen display.

## 11. `components/dashboard/venue-qr.tsx`

`"use client"`. Renders `QRCodeCanvas` from `qrcode.react`.

The QR must encode an **absolute** URL, which only the browser knows. Read it with
`useSyncExternalStore`, never `useState` + `useEffect` (Trap 8b):

```ts
const noopSubscribe = () => () => {};
const origin = useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
const url = origin ? `${origin}/order/${slug}` : "";
```

Layout: a white card (white regardless of theme, so the code always scans) containing the
venue name, the QR at 180px, and "Scan to view the menu and order". Below: Copy link, Open
(new tab), and Print buttons, plus the URL as small muted text.

Give the buttons and URL text `print:hidden` and the card `print:border-0` so printing
yields a clean table card.

> This links to Person B's route. It is only a **string** — build and test it now, before
> that route exists. Opening it will 404 until B merges. That is expected.

## 12. `app/dashboard/settings/page.tsx`

Server component. `requireVenue()`, load the venue, render two cards: "Venue"
(`SettingsForm`) and "Ordering QR code" (`VenueQr`).

---

## Checkpoint

```bash
npx tsc --noEmit && npx eslint . && npm run build
```

Manual: every sidebar link loads, the dashboard is dark, stat counts match the preset
content from A1, changing the venue name in Settings persists after a reload, and the QR
card renders with a scannable code.

Commit: `git commit -am "Dashboard shell, home, settings, QR"`
