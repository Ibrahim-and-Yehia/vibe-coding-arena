# Shared 1/3 — Project setup

**Both people, together. Before anyone splits off.**

---

## 1. Scaffold

```bash
npx create-next-app@latest serva --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm
cd serva
```

> If your folder name has capital letters, npm rejects it. Scaffold into a lowercase
> folder name and move the contents afterwards, or rename the `name` field in
> `package.json` to lowercase.

Confirm you got **Next.js 16**:

```bash
node -e "console.log(require('./node_modules/next/package.json').version)"
```

### package.json scripts

Leave them exactly as scaffolded. **Do not add `--turbopack`** — Next.js 16 uses Turbopack
by default and the flag is unnecessary.

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint"
}
```

---

## 2. Dependencies

One command, so `package-lock.json` is written once:

```bash
npm install @supabase/supabase-js @supabase/ssr @tanstack/react-query zod react-hook-form @hookform/resolvers lucide-react clsx tailwind-merge class-variance-authority sonner date-fns qrcode.react server-only
```

| Package | Used for |
|---|---|
| `@supabase/supabase-js` | Database, auth, storage, realtime |
| `@supabase/ssr` | Cookie-based auth in Server Components and `proxy.ts` |
| `@tanstack/react-query` | The 2-second live polling |
| `zod` + `react-hook-form` + `@hookform/resolvers` | Every form |
| `lucide-react` | Icons |
| `sonner` | Toasts |
| `date-fns` | Relative timestamps in the alert list |
| `qrcode.react` | The venue QR code |
| `server-only` | Guards the service-role client from ever being bundled client-side |

---

## 3. shadcn/ui

```bash
npx shadcn@latest init --template next -b radix -p nova -y --force
```

Then install **every** component both people will need, in one command. Doing this now is
what stops `components/ui/` and `package.json` conflicting later:

```bash
npx shadcn@latest add button input label textarea select checkbox switch dialog drawer dropdown-menu tabs card badge avatar separator sheet tooltip popover table scroll-area skeleton sonner alert alert-dialog progress slider accordion command breadcrumb -y
```

Then, separately (it must be added on its own):

```bash
npx shadcn@latest add field -y
```

> `field` provides `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldGroup`,
> `FieldSeparator`. This build uses those instead of the older `form` component, which is
> not available in this shadcn version.

Verify `components/ui/field.tsx` exists before continuing.

---

## 4. Environment variables

Create `.env.local` in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

And `.env.local.example` with the same keys and placeholder values, which **is** committed.

**Getting the values:** Supabase Dashboard → Project Settings → API.

> The URL is the API host, `https://<ref>.supabase.co`. It is **not** the
> `supabase.com/dashboard/project/<ref>` link from your browser's address bar. Using the
> dashboard URL is a common mistake and produces confusing failures.

Confirm `.gitignore` already contains `.env*` (the Next.js scaffold includes it). If not,
add it. **The service-role key must never be committed.**

---

## 5. next.config.ts

Menu photos are served from Supabase Storage, so `next/image` needs that host allow-listed.

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "YOUR_PROJECT_REF.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
```

Replace `YOUR_PROJECT_REF` with your actual project ref.

---

## 6. Checkpoint

```bash
npm run dev
```

Open `http://localhost:3000`. You should see the default Next.js page with no console
errors. Stop the server.

```bash
npx tsc --noEmit    # must be silent
npx eslint .        # must be silent
```

Both clean? Continue to `S2-DESIGN-SYSTEM.md`.

---

## Note on the AGENTS.md file

The Next.js scaffold creates an `AGENTS.md` warning that this version has breaking
changes. That is genuine and worth heeding — `docs/02-REFERENCE.md` already captures the
ones that affect this build (traps 1, 2, 3). Leave the file alone; `next dev` rewrites it
if you delete its contents.
