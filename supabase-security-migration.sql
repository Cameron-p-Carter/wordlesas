-- Security hardening migration
-- Run this in your Supabase SQL Editor AFTER deploying the updated application code.

-- 1. Add is_complete tracking to scores so the server can track guess state.
-- Existing scores are all completed, so mark them true.
ALTER TABLE scores ADD COLUMN IF NOT EXISTS is_complete BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE scores SET is_complete = TRUE;

-- 2. Add reset token columns to the Better Auth user table for password resets.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "resetToken" VARCHAR(128);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "resetTokenExpiresAt" TIMESTAMP;

-- 3. Fix RLS for games — remove the always-true write policies.
-- Server-side routes use the service role key which bypasses RLS.
DROP POLICY IF EXISTS "Admins can insert games" ON games;
DROP POLICY IF EXISTS "Admins can update games" ON games;
DROP POLICY IF EXISTS "Admins can delete games" ON games;

-- 4. Fix RLS for scores — remove always-true write policies.
DROP POLICY IF EXISTS "Users can insert their own scores" ON scores;
DROP POLICY IF EXISTS "Users can update their own scores" ON scores;
DROP POLICY IF EXISTS "Admins can delete scores" ON scores;

-- 5. Fix RLS for snake_games.
DROP POLICY IF EXISTS "Admins can insert snake games" ON snake_games;
DROP POLICY IF EXISTS "Admins can update snake games" ON snake_games;
DROP POLICY IF EXISTS "Admins can delete snake games" ON snake_games;

-- 6. Fix RLS for snake_scores.
DROP POLICY IF EXISTS "Users can insert snake scores" ON snake_scores;
DROP POLICY IF EXISTS "Admins can delete snake scores" ON snake_scores;

-- 7. Harden the Better Auth "user" table.
-- NOTE: the old plural `users` table was already dropped by the better-auth
-- migration (which repointed scores/snake_scores to "user"), so there are no
-- policies left on `users` to drop — referencing it would error with
-- "relation users does not exist".
--
-- The real hole is on the "user" table: the better-auth migration created
-- always-true write policies that let the ANON key insert/update/delete users
-- (e.g. flip isAdmin, delete accounts). Better Auth and all auth routes write
-- via the Postgres pool (table owner, bypasses RLS) and admin routes use the
-- service role key (bypasses RLS), so dropping these anon write policies closes
-- the privilege-escalation hole without breaking any flow. The public SELECT
-- policy stays (the admin page and leaderboard read "user" via the anon key).
DROP POLICY IF EXISTS "Service insert users" ON "user";
DROP POLICY IF EXISTS "Service update users" ON "user";
DROP POLICY IF EXISTS "Service delete users" ON "user";

-- After these drops, RLS on games/scores/snake_games/snake_scores has no write
-- policies remaining. With RLS enabled and no matching policy, writes are denied
-- for the anon key. The service role key used by server-side routes bypasses RLS.

-- READ policies are unchanged (all SELECT policies remain open for leaderboard/game queries).