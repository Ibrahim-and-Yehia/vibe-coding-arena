# Human tasks — everything you do with your own hands

The AI cannot click buttons in the Supabase dashboard, cannot see your screen, and cannot
judge whether something looks right. This document is the list of things **you** do.

Roughly 30 minutes of work in total, most of it at the start.

---

## 1. Create the Supabase project

**One person only.** Then share the keys with the other.

1. Go to `supabase.com`, sign in, **New project**.
2. Name it anything. **Save the database password somewhere** — you will not see it again.
   (You do not need it for this build, but losing it is annoying.)
3. Pick the region closest to the event venue. This is the round-trip time on every order,
   so it is worth thirty seconds of thought.
4. Wait for provisioning — about two minutes.

## 2. Copy the three keys

**Project Settings → API.** You need three values:

| Label in dashboard | Goes into `.env.local` as |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` `secret` key | `SUPABASE_SERVICE_ROLE_KEY` |

> **The URL is `https://<ref>.supabase.co`.** It is *not* the
> `supabase.com/dashboard/project/<ref>` address in your browser bar. Using the dashboard
> URL produces confusing failures that look like auth problems.

> The `service_role` key bypasses all security. It belongs only in `.env.local`, which is
> gitignored. Never paste it into a client component, never commit it, never put it in a
> chat with the AI if that chat is public.

**Send both keys and the URL to your teammate** — over a private channel, not a public repo
or a shared screen.

## 3. Run the SQL — three files, in order

Supabase Dashboard → **SQL Editor** → **New query**.

1. Open `sql/SQL-1-SCHEMA.md`. Copy **only** the contents of the big ```sql``` block.
   Paste. **Run**. Then run the verification query at the bottom of that file — it must
   return `18`.
2. Same for `sql/SQL-2-FUNCTIONS.md`. Verification must return `12`.
3. Same for `sql/SQL-3-SECURITY.md`. Verification must return `18`.

If a run fails, read the error — it names the line. Usually it means the previous file was
not run. They are safe to re-run from the top.

**Do not give these files to the AI.** It has no access to your database.

## 4. The two Auth toggles

This one has caught people out badly. Supabase Dashboard → **Authentication** →
**Sign In / Providers** → click **Email** to open its panel.

1. **Enable email provider** → **ON**
2. **Confirm email** → **OFF**
3. Press **Save** — the button at the bottom **inside that Email panel**. It is separate
   from the page's own save. If you skip it, nothing applies and the page still *looks*
   correct.

Verify from a terminal (substitute your ref and anon key):

```bash
curl -s "https://<PROJECT_REF>.supabase.co/auth/v1/settings" -H "apikey: <ANON_KEY>"
```

You need **both** of these in the response:

```
"email": true                 <- provider is on
"mailer_autoconfirm": true    <- confirmation is off
```

`"email": false` means the provider toggle did not save. `"mailer_autoconfirm": false`
means confirmation is still required and signup will stall on a screen asking users to
check an inbox they do not have.

## 5. GitHub repo

**One person creates it:**

1. New repository on GitHub. Private is fine. **Do not** add a README, .gitignore, or
   licence — an empty repo avoids a merge on the first push.
2. Add the other person: **Settings → Collaborators → Add people**.

**After the AI finishes the foundation (S1–S3):**

```bash
git init
git checkout -b main
git add -A
git commit -m "Foundation: setup, design system, shared types"
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

**Then the other person clones it:**

```bash
git clone https://github.com/<you>/<repo>.git
cd <repo>
npm install
```

**They also need their own `.env.local`** — it is gitignored, so it does not travel with
the clone. Create it by hand with the same three values from step 2.

**Then both people branch:**

```bash
git checkout -b feat/owner       # Person A
git checkout -b feat/customer    # Person B
```

## 6. After every step file

Four things, every time, before starting the next step:

```bash
# 1. does it compile and lint
npx tsc --noEmit
npx eslint .

# 2. does it build
npm run build

# 3. click through the manual test list at the bottom of that step's .md

# 4. save it
git add -A
git commit -m "Step A3: menu builder"
git push
```

If step 1 or 2 fails, paste the **entire** error output back to the AI. Do not summarise
it and do not fix it yourself unless it is trivial — the AI needs the exact text.

Step 3 is the one only a human can do. The AI will tell you it is finished; the test list
tells you whether that is true.

## 7. Merging at the end

**Person B goes first** — smaller change, fewer surprises.

Person B:
```bash
git add -A
git commit -m "Customer side complete"
git push -u origin feat/customer

git checkout main
git pull
git merge feat/customer
git push
```
Then tell Person A that `main` has moved.

Person A:
```bash
git checkout feat/owner
git merge main            # should be clean — you own disjoint files
# ...resolve nothing, because there is nothing to resolve...
git checkout main
git merge feat/owner
git push
```

If `git merge main` reports a conflict, someone edited a file they did not own. Find it:

```bash
git diff main -- <the conflicted file>
```

Take `main`'s version and re-apply the change in a file you actually own:

```bash
git checkout main -- <the conflicted file>
```

## 8. Deploying

The repo is a standard Next.js app — no Docker, no local database, no filesystem writes.
It should deploy anywhere Next.js runs.

Whatever platform you use, **you must set the three environment variables** in its
settings, exactly as named in step 2. `.env.local` is gitignored and does not deploy.
A deploy that builds fine but shows a blank or erroring page is almost always missing
env vars.

If the platform offers a build command, it is `npm run build`. Do not add `--turbopack`.

## 9. Final clean-up before you demo

You will have created test venues and test sittings while building. **The final state must
be clean** — no leftover test data.

In the SQL Editor:

```sql
-- what exists right now
select id, name, slug from venues;
```

Delete any venue you do not want to demo (everything below it cascades):

```sql
delete from venues where slug = '<the-test-one>';
```

Delete leftover test sittings from the venue you *are* keeping:

```sql
delete from table_sessions
where venue_id = (select id from venues where slug = '<your-real-slug>');
```

Orders and order items cascade with the session. Optionally clear the alerts they raised:

```sql
delete from alerts
where venue_id = (select id from venues where slug = '<your-real-slug>');
```

Remove test accounts: **Authentication → Users** → delete any you are not presenting with.

---

## 10. Rehearse the demo once, end to end

Do this before you present. It takes four minutes and it is the only way to find out that
something in the chain is broken.

Two browser windows, side by side:

| | Left window (owner) | Right window (customer) |
|---|---|---|
| 1 | Sign up → onboarding wizard → dashboard | |
| 2 | Settings → note the QR / copy the link | |
| 3 | | Open `/order/<your-slug>` |
| 4 | | Name, phone, pick a free table |
| 5 | Floor plan: table turns cyan with a numbered pin | Browse menu, add 2 items, place order |
| 6 | Notification bell shows an unread alert | Track screen shows "In queue" |
| 7 | Kitchen: advance to Preparing, then Ready | Timeline follows both steps |
| 8 | Floor: click table → Free table | Returns to the claim screen |
| 9 | That table is green again | It is selectable again |

**Use two different browsers** (e.g. Chrome and Firefox), or one normal window and one
private window. Two tabs of the same browser share the login cookie and you will end up
signed in as the owner on the customer side.

If any row above does not happen, that is your bug list. Fix it before the event, not
during.

---

## Quick reference — who does what

| Task | AI | You |
|---|---|---|
| Write application code | ✅ | |
| Run `npm install` / scaffold | usually ✅ | if it cannot |
| Create the Supabase project | | ✅ |
| Run the SQL files | | ✅ |
| Flip the Auth toggles | | ✅ |
| Put the real keys in `.env.local` | | ✅ |
| Create the GitHub repo | | ✅ |
| `git commit` / `push` / `merge` | sometimes ✅ | ✅ decide when |
| Run `tsc` / `eslint` / `build` | ✅ | ✅ check the output |
| Click through the manual test list | | ✅ |
| Decide a step is actually finished | | ✅ |
| Set env vars on the deploy platform | | ✅ |
| Clean up test data | | ✅ |
