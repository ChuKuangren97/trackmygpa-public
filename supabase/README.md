# Supabase backend setup — TrackMyGPA (public copy)

This folder contains everything needed to point this frontend at **your own** Supabase project. Nothing here connects to, or contains credentials for, the original private project.

Canonical files and apply order:

1. `supabase/schema.sql` — tables, indexes, Row Level Security. Apply **first**.
2. `supabase/functions.sql` — the `delete_user()` function plus the documented invite-code RPC contracts. Apply **second**.

There is intentionally no `seed.sql` — a fresh backend starts empty (no semesters, no courses), and invite codes must be provisioned by you, never committed to git.

## 1. Create a fresh Supabase project

1. Create a new project at [supabase.com](https://supabase.com) (free tier is fine for local development).
2. Wait until the project is fully provisioned.
3. Open **SQL Editor** in the Supabase dashboard — you will run the files there as the project owner.

## 2. Apply the SQL in order

1. Copy the full contents of `supabase/schema.sql`, run it in **SQL Editor**, and confirm there are no errors. This creates `profiles`, `semesters`, `courses`, indexes, and owner-only RLS policies.
2. Copy the full contents of `supabase/functions.sql` and run it. This creates `delete_user()` and documents the invite-code contracts.
3. Verify in **Table Editor** that the three tables exist and are empty.

If either script fails, stop — do not continue to the frontend setup. Re-run from step 1 on a clean project rather than patching tables by hand.

## 3. Configure Authentication

1. Go to **Authentication > Providers** and make sure **Email** provider is enabled.
2. Keep **Confirm email OFF** for this app. The signup flow (`src/context/AuthContext.jsx`) inserts the profile row and redeems the invite code immediately after `signUp()`, which only works when a session exists right away. With email confirmation on, both calls fail and the invite code is never burned.
3. **Site URL / Redirect URLs** (Authentication > URL Configuration): for local development, add your Vite dev URL (usually `http://localhost:5173`). For any deployed preview, add its exact URL too.
4. Password sign-in, session restoration, and password updates (`updateUser`) need no extra configuration beyond the Email provider.

## 4. Invite codes — you must implement this part

The signup form requires an invite code, but this public copy ships **no invite-code table or function bodies** — the original storage design is unknown and will not be guessed at here.

What the frontend expects (exact contracts):

- `check_invite_code(input_code text)` → boolean. Called **before** signup as an anonymous user. Return true only for an existing, unredeemed, unexpired code.
- `redeem_invite_code(input_code text)` → void (return ignored). Called **after** signup as the new authenticated user. Must atomically mark the code used by `auth.uid()` and reject double redemption (single conditional `UPDATE` + affected-row check, so concurrent signups cannot burn one code twice).

Rules for your implementation:

- Backing table: grant **no** direct access to `anon`/`authenticated`; expose it only through `SECURITY DEFINER` RPCs with a fixed `search_path`.
- `check_invite_code`: `GRANT EXECUTE` to `anon, authenticated`.
- `redeem_invite_code`: `GRANT EXECUTE` to `authenticated` only.
- Provision codes yourself with unpredictable random values via SQL Editor or Table Editor. Never commit real codes, and never make code creation publicly writable.

Until you implement both functions, **every signup attempt fails** with “Invalid or already used invite code.” That is expected, not a frontend bug.

## 5. Connect the frontend

1. Copy the env template (from the repo root):
   ```bash
   cp .env.example .env
   ```
2. In the Supabase dashboard go to **Project Settings > API** and copy:
   - Project URL → `VITE_SUPABASE_URL`
   - Publishable / anon key → `VITE_SUPABASE_ANON_KEY`
3. Paste them into `.env`. Never commit `.env` — only `.env.example` (placeholders) belongs in git. Never use a service-role key in the frontend.

## 6. Run the app

```bash
npm install
npm run dev
```

Open the printed URL (usually `http://localhost:5173`). Sign up with one of your own invite codes, add a semester, add courses, and check the dashboard and simulator.

## 7. Account deletion notes

Settings > Account > Delete calls `delete_user()` (no arguments — the function deletes only `auth.uid()`'s own data and auth user). Requirements:

- The function must exist (step 2) and the caller must be signed in.
- It runs as `SECURITY DEFINER` under the project owner so it can remove the `auth.users` row; no service-role key is needed in the browser, and none should ever be added there.
- Fallback: if your project refuses the `auth.users` delete, remove the user in **Dashboard > Authentication > Users** after confirming their `profiles`/`semesters`/`courses` rows are gone.

## 8. Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Signup always says “Invalid or already used invite code.” | Invite RPCs not implemented yet (expected until step 4 is done). |
| Profile insert / redeem fails right after signup | Email confirmation is ON, so there is no session yet — turn it off (step 3). |
| “Semester not found” for a semester that exists | RLS working as designed: that row belongs to a different user. |
| Course edit fails | RLS owner check on `courses` (`user_id = auth.uid()`); sign in as the owning user. |
| `delete_user` errors | Function missing, caller signed out, or project blocked the `auth.users` delete — see step 7 fallback. |
| Blank app / Supabase network errors | `.env` missing or wrong URL/anon key; restart `npm run dev` after editing `.env`. |

## 9. Security model in one paragraph

The anon key is publishable by design; real protection comes from RLS (owner-only policies on all three tables), RPCs that act only on `auth.uid()`, and keeping invite-code storage closed to direct table access. Known limitation: `courses.semester_id` is client-supplied and RLS checks `user_id` only (see `schema.sql` header), so a user could attach their own course to someone else's semester id — invisible in the app's filtered queries, but not cross-checked by a trigger. Review these trade-offs before treating any deployment as production.
