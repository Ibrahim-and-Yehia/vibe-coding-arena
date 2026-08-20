# Shared 2/3 — Design system

**Both people, together. Frozen after this.**

---

## The two-theme idea

One codebase, two visual identities, no theme switcher:

| Surface | Theme | Feel |
|---|---|---|
| Marketing site, customer ordering app | **Light** (`:root`) | Warm, appetising, terracotta accent |
| Owner dashboard, kitchen display | **Dark** (`.dark`) | Deep slate ops console, cyan signal colour |

The dashboard gets dark by putting `className="dark"` on its layout wrapper — **not** by
following the operating system's colour scheme. A customer on a phone in dark mode still
sees the warm light menu, which is what you want for food.

On top of shadcn's normal tokens there are five **status tokens** used by the floor plan,
countdown rings, and stock warnings. They are deliberately separate from `--primary` so
that "late" reads as red in both themes regardless of branding.

---

## 1. `app/globals.css`

Replace the whole file.

Keep the first three `@import` lines and the `@custom-variant` line exactly as shadcn's
init wrote them. Then define the theme.

**Structure required:**

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  /* ...all the standard shadcn mappings shadcn init generated: --color-background,
     --color-foreground, --color-primary, --color-card, --color-border, --color-ring,
     --color-chart-1..5, --color-sidebar*, --radius-* ... keep every one ... */

  /* then ADD these five status mappings: */
  --color-status-free: var(--status-free);
  --color-status-free-foreground: var(--status-free-foreground);
  --color-status-occupied: var(--status-occupied);
  --color-status-occupied-foreground: var(--status-occupied-foreground);
  --color-status-active: var(--status-active);
  --color-status-active-foreground: var(--status-active-foreground);
  --color-status-amber: var(--status-amber);
  --color-status-amber-foreground: var(--status-amber-foreground);
  --color-status-red: var(--status-red);
  --color-status-red-foreground: var(--status-red-foreground);
}
```

### `:root` — light (marketing + customer)

Warm off-white background, terracotta primary. Values in `oklch`:

```
--background: oklch(0.99 0.006 75)
--foreground: oklch(0.22 0.03 45)
--card: oklch(1 0 0)
--card-foreground: oklch(0.22 0.03 45)
--popover: oklch(1 0 0)
--popover-foreground: oklch(0.22 0.03 45)
--primary: oklch(0.64 0.19 40)
--primary-foreground: oklch(0.99 0.006 75)
--secondary: oklch(0.95 0.02 70)
--secondary-foreground: oklch(0.3 0.04 45)
--muted: oklch(0.96 0.015 70)
--muted-foreground: oklch(0.5 0.03 50)
--accent: oklch(0.93 0.05 55)
--accent-foreground: oklch(0.3 0.06 40)
--destructive: oklch(0.577 0.245 27.325)
--border: oklch(0.9 0.02 60)
--input: oklch(0.9 0.02 60)
--ring: oklch(0.64 0.19 40)
--chart-1: oklch(0.64 0.19 40)
--chart-2: oklch(0.7 0.15 70)
--chart-3: oklch(0.6 0.12 20)
--chart-4: oklch(0.75 0.1 90)
--chart-5: oklch(0.5 0.1 30)
--radius: 0.75rem
--sidebar: oklch(0.97 0.015 70)
--sidebar-foreground: oklch(0.22 0.03 45)
--sidebar-primary: oklch(0.64 0.19 40)
--sidebar-primary-foreground: oklch(0.99 0.006 75)
--sidebar-accent: oklch(0.93 0.05 55)
--sidebar-accent-foreground: oklch(0.3 0.06 40)
--sidebar-border: oklch(0.9 0.02 60)
--sidebar-ring: oklch(0.64 0.19 40)

--status-free: oklch(0.72 0.17 155)
--status-free-foreground: oklch(0.99 0 0)
--status-occupied: oklch(0.55 0.03 50)
--status-occupied-foreground: oklch(0.99 0 0)
--status-active: oklch(0.6 0.17 255)
--status-active-foreground: oklch(0.99 0 0)
--status-amber: oklch(0.78 0.16 75)
--status-amber-foreground: oklch(0.2 0.04 60)
--status-red: oklch(0.6 0.22 25)
--status-red-foreground: oklch(0.99 0 0)
```

### `.dark` — the ops console

Deep blue-slate, cyan primary:

```
--background: oklch(0.19 0.018 260)
--foreground: oklch(0.96 0.006 260)
--card: oklch(0.235 0.02 260)
--card-foreground: oklch(0.96 0.006 260)
--popover: oklch(0.22 0.02 260)
--popover-foreground: oklch(0.96 0.006 260)
--primary: oklch(0.78 0.13 200)
--primary-foreground: oklch(0.15 0.02 240)
--secondary: oklch(0.29 0.02 260)
--secondary-foreground: oklch(0.93 0.01 260)
--muted: oklch(0.27 0.018 260)
--muted-foreground: oklch(0.66 0.02 255)
--accent: oklch(0.32 0.04 220)
--accent-foreground: oklch(0.93 0.02 200)
--destructive: oklch(0.65 0.2 25)
--border: oklch(1 0 0 / 10%)
--input: oklch(1 0 0 / 14%)
--ring: oklch(0.78 0.13 200)
--chart-1: oklch(0.78 0.13 200)
--chart-2: oklch(0.72 0.17 155)
--chart-3: oklch(0.78 0.16 75)
--chart-4: oklch(0.65 0.19 300)
--chart-5: oklch(0.6 0.22 25)
--sidebar: oklch(0.165 0.018 260)
--sidebar-foreground: oklch(0.93 0.01 260)
--sidebar-primary: oklch(0.78 0.13 200)
--sidebar-primary-foreground: oklch(0.15 0.02 240)
--sidebar-accent: oklch(0.27 0.02 260)
--sidebar-accent-foreground: oklch(0.93 0.01 260)
--sidebar-border: oklch(1 0 0 / 10%)
--sidebar-ring: oklch(0.78 0.13 200)

--status-free: oklch(0.72 0.19 155)
--status-free-foreground: oklch(0.12 0.03 155)
--status-occupied: oklch(0.42 0.02 260)
--status-occupied-foreground: oklch(0.9 0.01 260)
--status-active: oklch(0.78 0.13 200)
--status-active-foreground: oklch(0.12 0.02 200)
--status-amber: oklch(0.8 0.17 80)
--status-amber-foreground: oklch(0.15 0.03 80)
--status-red: oklch(0.68 0.22 25)
--status-red-foreground: oklch(0.98 0 0)
```

### Base layer and one animation

```css
@layer base {
  * { @apply border-border outline-ring/50; }
  body { @apply bg-background text-foreground; }
  html { @apply font-sans; }
}

/* Used by the numbered order pin on a late table. */
@keyframes pulse-ring {
  0%   { box-shadow: 0 0 0 0  color-mix(in oklch, var(--status-active) 55%, transparent); }
  100% { box-shadow: 0 0 0 14px color-mix(in oklch, var(--status-active) 0%, transparent); }
}
.animate-pulse-ring {
  animation: pulse-ring 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

**Do not** add a `@media (prefers-color-scheme: dark)` block. Dark is applied by class
only, deliberately.

---

## 2. `app/providers.tsx`

A client component wrapping the whole app.

- `"use client"` at the top.
- Creates a `QueryClient` **inside `useState`** so it is not shared across requests:
  `const [queryClient] = useState(() => new QueryClient({ ... }))`
- Default query options: `refetchOnWindowFocus: false`, `staleTime: 1000`.
- Renders, nested: `QueryClientProvider` → `TooltipProvider` (with `delayDuration={200}`)
  → `{children}` and a `<Toaster position="top-right" richColors closeButton />` from
  `@/components/ui/sonner`.
- Exports `function Providers({ children }: { children: React.ReactNode })`.

---

## 3. `app/layout.tsx`

- Keeps the Geist / Geist_Mono font setup from the scaffold.
- `metadata`: title `"Serva — Run your floor, live"`, description
  `"Menu and inventory, a live floor plan, and real-time order tracking for cafes, restaurants, and bars."`
- Signature must be `export default function RootLayout({ children }: LayoutProps<"/">)`.
  `LayoutProps` is a global generated type — **do not import it** (Trap 2).
- `<html lang="en" suppressHydrationWarning>` with the font variables plus
  `h-full antialiased`.
- `<body className="min-h-full flex flex-col">` wrapping `<Providers>{children}</Providers>`.

Do **not** put a header or footer here — the marketing site has its own layout, and the
dashboard and customer app are full-screen surfaces.

---

## 4. Checkpoint

`npm run dev` and confirm the page still renders. Then verify the dark tokens actually
resolve — in the browser console:

```js
const d = document.createElement('div');
d.className = 'dark';
d.innerHTML = '<div id="p" style="background:var(--background);color:var(--foreground)">x</div>';
document.body.appendChild(d);
console.log(getComputedStyle(document.getElementById('p')).backgroundColor);
d.remove();
```

You should get a very dark colour. If you get white, the `.dark` block did not apply.

Then `npx tsc --noEmit` and `npx eslint .` — both silent. Continue to `S3`.
