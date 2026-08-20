# Team split and git workflow

Two people, one repository, zero merge conflicts. This works because of one idea:

> **The integration contract is the database, not shared TypeScript.**

Person B's code writes rows. Person A's code reads them. Neither imports anything the
other person wrote. There is no shared component, no shared hook, no shared action.

---

## The three stages

```
STAGE 1  ── FOUNDATION ──────────────────────────────────────────
   Both people. Together. One machine, or one person while the
   other watches. Ends with a push to `main`.

   Everything shared is created here and then FROZEN.

STAGE 2  ── PARALLEL WORK ───────────────────────────────────────
   Person A on branch  feat/owner
   Person B on branch  feat/customer

   Disjoint file sets. No conflicts are possible.

STAGE 3  ── MERGE ───────────────────────────────────────────────
   B merges first (smaller). Then A rebases and merges.
```

---

## File ownership — exhaustive

### FROZEN after Stage 1 (nobody edits these again)

```
package.json                    package-lock.json
next.config.ts                  tsconfig.json
eslint.config.mjs               postcss.config.mjs
components.json                 .gitignore
.env.local                      .env.local.example

app/layout.tsx                  app/globals.css
app/providers.tsx

components/ui/**                (every shadcn primitive)

lib/types.ts                    <-- THE critical one
lib/supabase/client.ts
lib/supabase/server.ts
lib/supabase/admin.ts
lib/action-result.ts
lib/auth-helpers.ts
lib/sla.ts
lib/utils.ts

supabase/migrations/**
```

If one of these genuinely must change: **both people stop, agree, one person changes it,
pushes to `main`, and both rebase.** This should happen zero times if Stage 1 is done
properly.

### Person A owns — Person B never opens these

```
proxy.ts

app/login/**                    app/signup/**
app/onboarding/**
app/dashboard/**                (every page and actions.ts inside)
app/api/venue/live/**
app/(marketing)/**

components/auth/**
components/onboarding/**
components/dashboard/**
components/menu/**
components/inventory/**
components/orders/**
components/floor/**
components/marketing/**

hooks/use-live-venue.ts

lib/presets.ts
lib/floor.ts
lib/live-types.ts
lib/currencies.ts
lib/slug.ts
lib/storage.ts
```

### Person B owns — Person A never opens these

```
app/order/**                    (page.tsx and actions.ts)
components/order/**
```

That is the entire customer surface. It is deliberately small and completely sealed off.

---

## Why there is no overlap

The two obvious-looking dependencies are not real:

| Looks shared | Actually |
|---|---|
| Person A's Settings page shows a QR pointing at Person B's route | It encodes a **URL string** (`${origin}/order/${slug}`). No import. A can build it before B's route exists. |
| Person A's floor plan shows tables Person B's customers claimed | A reads `table_sessions` from the database. B writes them via an RPC. No shared code. |
| Both need `lib/types.ts` | Created complete in Stage 1 with every table and every RPC already declared. Neither adds to it. |
| Both show wait-time ETAs | `lib/sla.ts` is created in Stage 1, frozen, used read-only by both. |
| Both use shadcn components | Every component either side needs is installed in Stage 1. See `shared/S1-SETUP.md`. |

---

## Git workflow

### Stage 1 — foundation

```bash
git init
git checkout -b main
# ...build the foundation per shared/S1, S2, S3...
git add -A
git commit -m "Foundation: setup, schema, design system, shared types"
git remote add origin <your-repo-url>
git push -u origin main
```

Both people now clone (or pull) so they are identical.

### Stage 2 — parallel

Person A:
```bash
git checkout main
git pull
git checkout -b feat/owner
```

Person B:
```bash
git checkout main
git pull
git checkout -b feat/customer
```

Commit often, on your own branch only:
```bash
git add -A
git commit -m "Menu builder"
git push -u origin feat/owner      # or feat/customer
```

**Never** `git checkout` the other person's branch to "have a look". Never cherry-pick
between them. Never edit a file outside your list above.

### Stage 3 — merge

Person B finishes first (smaller scope). B merges into main:

```bash
git checkout main
git pull
git merge feat/customer
git push
```

Then Person A brings main in and merges:

```bash
git checkout feat/owner
git merge main            # should be clean — disjoint files
git checkout main
git merge feat/owner
git push
```

If `git merge main` reports a conflict, someone edited a file they did not own. Find it,
revert that person's version of the shared file to `main`'s, and re-apply the change
properly.

---

## Rules

1. **Do not edit a file you do not own.** Not even to fix a typo. Not even a one-liner.
2. **Do not add a dependency after Stage 1** without telling the other person. `package.json`
   and `package-lock.json` conflict horribly. If you must, do it, push to `main`
   immediately, and tell them to pull.
3. **Do not add a shadcn component after Stage 1** without the same coordination — it
   writes to `components/ui/` and `package.json`.
4. **Do not change the database schema after Stage 1.** Both sides' types depend on it.
5. **Pull `main` before you merge, not during.** Keep your branch clean.
6. **If you need something the other person has**, do not import it — restate the data need
   and read it from the database, or copy the small piece into your own file. Duplication
   is much cheaper than a conflict during a live event.

---

## If you have more than two people

A third person takes `owner/A7-MARKETING.md` on `feat/marketing`. It touches only
`app/(marketing)/**` and `components/marketing/**`, with one exception: the hero animation
reuses `components/floor/floor-canvas.tsx`, which Person A owns.

Fix: person three waits for A to push `A5-FLOOR-EDITOR`, or writes a standalone copy of the
canvas inside `components/marketing/`. For a timed event, **write the standalone copy.**

---

## Emergency: someone edited a frozen file

```bash
# See what changed
git diff main -- lib/types.ts

# Throw away your version, take main's
git checkout main -- lib/types.ts
```

Then re-apply whatever you actually needed in a file you own.
