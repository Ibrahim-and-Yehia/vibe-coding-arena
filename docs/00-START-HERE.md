# Serva — Build Guide

A hospitality operations platform for cafes, restaurants, and bars. Owners get a menu +
inventory system, a floor plan they draw themselves that goes live with real orders, and
real-time order tracking with wait-time alerts. Customers order from a per-venue QR code.

This folder contains everything needed to build it from nothing.

---

## Who does what

| Role | Person | Builds |
|---|---|---|
| **Foundation** | Both, together, FIRST | Project setup, database, design system, shared types |
| **Person A** | Owner side | Auth, dashboard, menu, inventory, floor plan, live orders, kitchen, marketing site |
| **Person B** | Customer side | The QR ordering app: claim a table, browse, order, track |

**The foundation must be finished and pushed before A and B start working in parallel.**
It is roughly 45–60 minutes of work. Doing it together avoids every merge conflict that
would otherwise happen.

---

## Read these two first — they tell you how to use everything else

```
03-WORKFLOW-ORDER.md   What to paste into the AI, in what order, with the exact
                       wording. Also: what to cut if you run out of time.
04-HUMAN-TASKS.md      Everything you do with your own hands — Supabase, the
                       SQL, the Auth toggles, GitHub, testing, deploying.
```

**The single most important distinction:** files in `sql/` are pasted into the **Supabase
SQL Editor by you**. Every other file is pasted into **the AI**. Never mix those up — the
AI cannot reach your database.

## Full file list

### Read before any code (both people)
```
02-REFERENCE.md            Stack, formulas, and eleven traps. Non-negotiable.
01-TEAM-SPLIT-AND-GIT.md   Who owns which files.
```

### Foundation — both people, together, in order
```
sql/SQL-1-SCHEMA.md        -> Supabase SQL Editor
sql/SQL-2-FUNCTIONS.md     -> Supabase SQL Editor
sql/SQL-3-SECURITY.md      -> Supabase SQL Editor

shared/S1-SETUP.md         -> AI.  Scaffold, dependencies, env.
shared/S2-DESIGN-SYSTEM.md -> AI.  Theme tokens, root layout, providers.
shared/S3-TYPES-AND-CLIENTS.md -> AI.  THE MOST ERROR-PRONE FILE.
```

**Commit and push the foundation to `main` before continuing.**

### Then split up

**Person A**, in order:
```
owner/A1-AUTH-ONBOARDING.md
owner/A2-DASHBOARD-SHELL.md
owner/A3-MENU.md
owner/A4-INVENTORY.md
owner/A5-FLOOR-EDITOR.md
owner/A6-LIVE-FLOOR.md
owner/A7-MARKETING.md
```

**Person B**, in order:
```
customer/B1-SETUP-AND-CLAIM.md
customer/B2-MENU-AND-CART.md
customer/B3-TRACK-AND-POLISH.md
```

Person B has less to build, so B should finish early and then help A with A7 (the
marketing site), which is fully isolated and safe to hand over.

---

## Non-negotiable rules

1. **No fake data, no seed scripts, no demo accounts.** A new venue gets its starting
   menu and floor plan from the onboarding wizard's business-type presets — that is a
   real product feature, not test data. Nothing else is pre-populated.

2. **Nobody edits a file they do not own.** See `01-TEAM-SPLIT-AND-GIT.md`. If you think
   you need to, you are wrong — talk to the other person instead.

3. **The foundation files are frozen after Step 2.** Especially `lib/types.ts`. If it
   genuinely must change, both people stop, change it together, and both pull.

4. **Read `02-REFERENCE.md` before writing code.** It contains eleven specific traps that
   will otherwise cost you 20+ minutes each. They are not obvious and they are not
   guessable.

---

## What "done" looks like

Two browser windows side by side:

- **Left (owner):** sign up → onboarding wizard → dashboard → live floor plan
- **Right (customer):** open `/order/<your-venue-slug>` → enter name, phone, pick a free
  table → order two items

Within about a second of the customer submitting, the left window shows a numbered pin on
that table, a new entry in the notification sidebar, and a ticket on the kitchen display.
Advance it through Preparing → Ready → Delivered and the customer's screen follows along.
Free the table on the left and it becomes selectable again on the right.

That loop is the whole product. Build toward it.
