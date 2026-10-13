-- ============================================================================
-- TrackMyGPA — Supabase functions (public portfolio copy)
-- ============================================================================
-- Apply AFTER supabase/schema.sql.
--
-- Contains exactly ONE implemented function:
--   public.delete_user()  — called by Settings.jsx Account view as
--                           supabase.rpc('delete_user') with NO arguments.
--
-- Deliberately NOT implemented (owner decision — docs only, see PART B):
--   check_invite_code(input_code) / redeem_invite_code(input_code)
-- The original invite-code storage is unknown, so no speculative table or
-- function body is shipped. Signup WILL reject every code until YOU
-- implement these two RPCs. Do not invent a production code or reuse a
-- private one.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PART A — delete_user()
-- ----------------------------------------------------------------------------
-- Frontend contract (src/pages/Settings.jsx handleDelete):
--   const { error } = await supabase.rpc('delete_user');
--   if (error) throw error;
--   await supabase.auth.signOut();
-- The call carries no user id, so the function MUST derive the target from
-- auth.uid() and MUST NEVER accept a user id parameter (that would let any
-- caller delete anyone else's account).
--
-- Why SECURITY DEFINER: the caller (authenticated role) can delete their own
-- profile/semester/course rows through RLS, but has no privilege on
-- auth.users. The function runs as its owner to remove the auth user too.
-- It is narrowly scoped: fixed search_path, auth.uid() null-check, deletes
-- only rows belonging to the caller, executable by `authenticated` only.
-- No service-role key is ever needed in the browser.
--
-- Privilege note: create this function while connected as the project's
-- owner (postgres) in the Supabase SQL editor so it owns sufficient rights
-- to delete from auth.users. If your project refuses the final DELETE, use
-- Dashboard > Authentication > Users to remove the auth user manually after
-- the data rows are gone (see supabase/README.md fallback).
-- ----------------------------------------------------------------------------

create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Order matters least→most dependent; FK cascades would also cover this,
  -- but explicit deletes keep behaviour clear if constraints ever change.
  delete from public.courses   where user_id = v_user_id;
  delete from public.semesters where user_id = v_user_id;
  delete from public.profiles   where id      = v_user_id;
  delete from auth.users        where id      = v_user_id;
end;
$$;

-- Callable by signed-in users only. Anonymous callers always fail the
-- auth.uid() check anyway; revoking keeps the permission surface explicit.
revoke all on function public.delete_user() from public, anon;
grant execute on function public.delete_user() to authenticated;

-- ----------------------------------------------------------------------------
-- PART B — Invite-code RPCs: CONTRACT ONLY (not implemented)
-- ----------------------------------------------------------------------------
-- Observed frontend behaviour (src/context/AuthContext.jsx signup):
--
--   1. BEFORE sign-up (caller is ANONYMOUS):
--        supabase.rpc('check_invite_code', { input_code: inviteCode })
--      - input_code: text, exactly as typed in the signup form.
--      - returns: boolean-ish. The frontend rejects signup with
--        "Invalid or already used invite code." whenever the result is
--        falsy, and surfaces RPC errors directly.
--      - Therefore: must be executable by `anon` AND `authenticated`,
--        must return TRUE only for an existing, unredeemed, unexpired code,
--        and must reveal nothing else (no listing of codes).
--
--   2. AFTER sign-up + profile insert (caller should be AUTHENTICATED):
--        supabase.rpc('redeem_invite_code', { input_code: inviteCode })
--      - return value is ignored; only `error` is logged.
--      - Therefore: must atomically mark the code redeemed by auth.uid()
--        (single UPDATE .. WHERE code = input AND not-yet-used, checking the
--        affected row count) so two concurrent signups cannot burn the same
--        code. Must reject already-used codes. Must be executable by
--        `authenticated` (anon must NOT be able to redeem).
--
-- Security requirements for YOUR implementation:
--   - Backing table (whatever you design): NO direct access for anon or
--     authenticated roles (no SELECT/INSERT/UPDATE/DELETE grants, RLS deny).
--     All access goes through SECURITY DEFINER RPCs with fixed search_path.
--   - check_invite_code: grant EXECUTE to anon + authenticated.
--   - redeem_invite_code: grant EXECUTE to authenticated ONLY.
--   - Provision codes yourself in the SQL editor / dashboard with
--     unpredictable values; never commit real codes to git.
--
-- Auth-settings interaction (important):
--   This frontend inserts the profile row and redeems the code IMMEDIATELY
--   after supabase.auth.signUp(), i.e. it assumes a session exists right
--   away. If you enable "Confirm email" in Supabase Auth, there is no
--   session at that point, so the profile insert and the redeem call fail
--   under RLS and the code is never burned. For this app flow, keep email
--   confirmation OFF (or redesign signup to redeem after first sign-in).
-- ----------------------------------------------------------------------------
