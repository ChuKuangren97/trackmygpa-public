-- ============================================================================
-- TrackMyGPA — Supabase schema (public portfolio copy)
-- ============================================================================
-- Canonical setup path:
--   1. Apply this file FIRST  (supabase/schema.sql)
--   2. Then apply supabase/functions.sql
--
-- What this file is based on:
--   Every table/column below was derived from actual frontend calls in src/:
--   - src/context/AuthContext.jsx  (profiles select/insert)
--   - src/pages/Dashboard.jsx      (profiles/semesters/courses selects)
--   - src/pages/SemesterDetail.jsx (semesters/courses selects, courses update)
--   - src/pages/AddSemester.jsx    (semesters insert)
--   - src/pages/AddCourse.jsx      (profiles select, courses insert)
--   - src/pages/CGPASimulator.jsx  (profiles/courses selects)
--   - src/pages/Settings.jsx       (profiles select/update)
--
-- What this file does NOT contain (by owner decision):
--   - No invite_codes table. The original invite-code storage is unknown, so
--     only the RPC call contracts are documented (see supabase/functions.sql
--     and supabase/README.md). Signup will reject every invite code until you
--     implement check_invite_code / redeem_invite_code yourself.
--   - No seed data. A fresh backend intentionally starts empty.
-- ============================================================================

-- Needed for gen_random_uuid() primary-key defaults.
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- profiles
-- One row per auth user. id IS the auth user's id (not a separate user_id).
-- Read/written by: AuthContext (select *, insert id/full_name/university/
-- department), Dashboard (target_cgpa, blur_cgpa), CGPASimulator
-- (target_cgpa), AddCourse + SemesterDetail (grading_scale), Settings
-- (full_name, university, department, current_level, target_cgpa,
-- grading_scale, blur_cgpa).
-- Grading-scale values are frontend display strings such as
-- '5.0 (Nigerian)' / '4.0 (International)' (see Settings.jsx); the grade
-- math itself lives in src/lib/gpa.js. No DB-level enum is enforced so the
-- frontend's startsWith('4') check keeps working.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  university text,
  department text,
  current_level text,
  target_cgpa numeric check (target_cgpa is null or (target_cgpa >= 0 and target_cgpa <= 5)),
  grading_scale text,
  blur_cgpa boolean not null default false,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- semesters
-- Inserted by AddSemester.jsx with (user_id, level, semester, academic_year)
-- and read back with .select().single(), so id must be generated server-side.
-- Read by Dashboard (all of mine, newest first) and SemesterDetail
-- (one of mine by id). The frontend has no update/delete UI for semesters.
-- ----------------------------------------------------------------------------
create table if not exists public.semesters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  level text not null,
  semester text not null,
  academic_year text not null,
  created_at timestamptz not null default now()
);

create index if not exists semesters_user_id_created_at_idx
  on public.semesters (user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- courses
-- Inserted by AddCourse.jsx with (user_id, semester_id, course_code,
-- course_name, credit_units, score, grade, grade_point, is_carryover).
-- Updated by SemesterDetail.jsx CourseEditRow with (course_code,
-- course_name, credit_units, score, grade, grade_point, is_carryover,
-- edited=true) filtered ONLY by .eq('id', ...) — ownership on update is
-- enforced by RLS below, not by the frontend query, so the RLS policies
-- are load-bearing here.
-- The one-time-edit rule (edited flag hides the Edit button) is a frontend
-- convention only, by owner decision: the database stays permissive so a
-- failed save can be retried.
-- CHECK ranges mirror the form validation (units 1-12, score 0-100).
-- ----------------------------------------------------------------------------
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  semester_id uuid not null references public.semesters (id) on delete cascade,
  course_code text not null,
  course_name text not null,
  credit_units integer not null check (credit_units >= 1 and credit_units <= 12),
  score numeric not null check (score >= 0 and score <= 100),
  grade text not null,
  grade_point numeric not null,
  is_carryover boolean not null default false,
  edited boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists courses_user_id_idx
  on public.courses (user_id);

create index if not exists courses_semester_id_created_at_idx
  on public.courses (semester_id, created_at asc);

-- ============================================================================
-- Row Level Security — owner-only isolation on all three tables.
-- Enabling RLS alone is NOT the security; the policies below are.
-- Every policy ties the row to auth.uid(). Client-side .eq('user_id', ...)
-- filters in the frontend are convenience only and must never be relied on.
-- ----------------------------------------------------------------------------
-- NOTE on courses.semester_id: RLS trusts the client-supplied semester_id on
-- insert (it only verifies user_id = auth.uid()). A user could attach their
-- own course row to someone else's semester id; the app's list queries filter
-- by both semester_id and user_id, so such a row stays invisible in the UI,
-- but no trigger cross-checks semester ownership. Documented limitation.
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.semesters enable row level security;
alter table public.courses enable row level security;

-- profiles: id is the auth user id.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own on public.profiles
  for delete using (auth.uid() = id);

-- semesters: owned via user_id.
drop policy if exists semesters_select_own on public.semesters;
create policy semesters_select_own on public.semesters
  for select using (auth.uid() = user_id);

drop policy if exists semesters_insert_own on public.semesters;
create policy semesters_insert_own on public.semesters
  for insert with check (auth.uid() = user_id);

drop policy if exists semesters_update_own on public.semesters;
create policy semesters_update_own on public.semesters
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists semesters_delete_own on public.semesters;
create policy semesters_delete_own on public.semesters
  for delete using (auth.uid() = user_id);

-- courses: owned via user_id (this is what protects the id-only update).
drop policy if exists courses_select_own on public.courses;
create policy courses_select_own on public.courses
  for select using (auth.uid() = user_id);

drop policy if exists courses_insert_own on public.courses;
create policy courses_insert_own on public.courses
  for insert with check (auth.uid() = user_id);

drop policy if exists courses_update_own on public.courses;
create policy courses_update_own on public.courses
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists courses_delete_own on public.courses;
create policy courses_delete_own on public.courses
  for delete using (auth.uid() = user_id);
