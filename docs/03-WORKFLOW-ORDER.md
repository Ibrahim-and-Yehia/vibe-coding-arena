# Workflow order — exactly what to paste, and when

Two kinds of file in this folder, and they go to **different places**:

| Folder | Goes to | Never goes to |
|---|---|---|
| `sql/` | Supabase SQL Editor, by hand | the AI |
| everything else | the AI, as a prompt | Supabase |

Do not paste SQL into the AI. Do not ask the AI to "set up the database" — it cannot reach
your Supabase project. You run that SQL yourself. See `04-HUMAN-TASKS.md`.

---

## Stage 0 — Human setup (no AI yet)

**Both of you, ~20 minutes.** Follow `04-HUMAN-TASKS.md` sections 1–4:

1. One person creates the Supabase project and shares the three keys.
2. Run `sql/SQL-1-SCHEMA.md`, then `SQL-2`, then `SQL-3` in the SQL Editor.
3. Flip the two Auth toggles (and press Save **inside** the Email panel).
4. Create the GitHub repo.

Nothing below works until this is done.

---

## Stage 1 — Load the AI's context (once per chat session)

**Before asking for any code**, give the AI these two files, in this order. This is the
single most valuable thing you will do — it is what stops it writing Next.js 15 code from
memory and burning 20 minutes on type errors.

### Prompt 1

> Paste the full contents of `00-START-HERE.md`, then:

```
This is the project we are building. Read it for context.
Do not write any code yet. Reply with one sentence confirming you understand
what we are building.
```

### Prompt 2

> Paste the full contents of `02-REFERENCE.md`, then:

```
These are the technical rules and the known traps for this project.
Follow every one of them in all the code you write from now on.
The eleven traps are not optional and not guessable — I hit each of them already.
Do not write any code yet. Reply with a short list of the traps so I know you read them.
```

If the AI's reply does not mention `proxy.ts`, async `params`, and the `never` type
problems, paste `02-REFERENCE.md` again before continuing.

---

## Stage 2 — Foundation (both people, together, one machine)

Give these one at a time. **Finish and verify each before pasting the next.**

| Order | File | Prompt to add underneath |
|---|---|---|
| 3 | `shared/S1-SETUP.md` | `Do this now. Tell me any command you cannot run yourself so I can run it.` |
| 4 | `shared/S2-DESIGN-SYSTEM.md` | `Do this now.` |
| 5 | `shared/S3-TYPES-AND-CLIENTS.md` | `Do this now. lib/types.ts must match the spec exactly — traps 4, 5, 6 and 7 all apply to that one file.` |

After **each** one, run the checkpoint yourself:

```bash
npx tsc --noEmit
npx eslint .
```

If either prints errors, paste the **full error text** back to the AI:

```
This step is not finished. Fix these errors:

<paste the exact output>
```

Do not move on with errors outstanding. They compound.

**Then push to `main` and both people pull.** See `04-HUMAN-TASKS.md` section 5.

---

## Stage 3 — Split. Two people, two chat sessions, in parallel.

From here you are working separately. **Each person opens their own AI chat and repeats
Stage 1 in it** (both files, `00-START-HERE.md` then `02-REFERENCE.md`) so their AI has the
context. Then add one more:

### Extra prompt for both people, right after Stage 1

> Paste `01-TEAM-SPLIT-AND-GIT.md`, then:

```
I am Person A.        <-- or "I am Person B."
Only ever create or edit the files listed as mine in this document.
If a step seems to need a file I do not own, stop and tell me instead of editing it.
```

That instruction is what protects you from merge conflicts. The AI will otherwise happily
"helpfully" edit a shared file.

### Person A — owner side

| Order | File |
|---|---|
| 6 | `owner/A1-AUTH-ONBOARDING.md` |
| 7 | `owner/A2-DASHBOARD-SHELL.md` |
| 8 | `owner/A3-MENU.md` |
| 9 | `owner/A4-INVENTORY.md` |
| 10 | `owner/A5-FLOOR-EDITOR.md` |
| 11 | `owner/A6-LIVE-FLOOR.md` |
| 12 | `owner/A7-MARKETING.md` |

### Person B — customer side

| Order | File |
|---|---|
| 6 | `customer/B1-SETUP-AND-CLAIM.md` |
| 7 | `customer/B2-MENU-AND-CART.md` |
| 8 | `customer/B3-TRACK-AND-POLISH.md` |

Same prompt for every one of these:

```
Implement this step. Follow it exactly.
Stay inside the files it lists. When you are done, tell me what to test.
```

Then: run the checkpoint, do the manual test list at the bottom of that file, commit, and
only then paste the next one.

---

## Stage 4 — Merge and rehearse

Person B merges first, then Person A. Full steps in `04-HUMAN-TASKS.md` section 7.

---

## The commit rhythm

After every single step file:

```bash
npx tsc --noEmit && npx eslint . && npm run build
git add -A
git commit -m "Step A3: menu builder"
git push
```

A green build committed every 30–40 minutes means the worst case is losing one step, not
the whole day.

---

## If you run out of time

The demo loop is: **customer orders → it appears live on the owner's floor plan → owner
advances it → customer sees it move → owner frees the table.**

These steps are what that loop needs:

```
REQUIRED   Stage 0, Stage 1, S1, S2, S3, A1, A2, A5, A6, B1, B2, B3
```

Everything else can be cut without breaking the demo:

| Step | What you lose if you skip it |
|---|---|
| `A3` Menu builder | You cannot *edit* the menu in the UI. The onboarding preset still creates a real menu, so customers can still order. Cheapest cut. |
| `A4` Inventory | No ingredients, recipes, POs or stock takes. Menu items still sell; they just do not deduct anything. |
| `A7` Marketing site | No public landing page. The app still works — you demo from `/login`. |

Cut in that order: `A4` first, then `A3`, then `A7`.

**Never cut A5 or A6** — the live floor plan is the whole product.

---

## When the AI gets stuck

**It writes `middleware.ts`, or `params` without `await`:**
> Re-paste the relevant trap from `02-REFERENCE.md` and say: `You broke trap 1 (or 2). Fix it.`

**A wall of `Property 'x' does not exist on type 'never'`:**
> That is `lib/types.ts`. Re-paste `shared/S3-TYPES-AND-CLIENTS.md` section 1 and say:
> `lib/types.ts is wrong. Traps 4, 5, 6 and 7. Rewrite that file to match this spec exactly.`

**`react-hooks/set-state-in-effect` errors:**
> Paste trap 8 and say: `Use the render-time pattern, not an effect.`

**`react/no-unescaped-entities` errors:**
> `Escape the apostrophes and quotes in the JSX text as &apos; and &quot;.`

**It edits a file the other person owns:**
> `git checkout main -- <that file>` and tell the AI:
> `Do not touch <file>. It belongs to the other developer. Put your change in a file I own.`

**It rewrites something that already worked:**
> `Stop. <file> is already finished and tested. Only change the files this step lists.`
