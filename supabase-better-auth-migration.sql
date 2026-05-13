-- Better Auth Migration
-- Run this in Supabase SQL Editor

-- 1. Create better-auth user table
CREATE TABLE "user" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT UNIQUE,
  "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
  "image" TEXT,
  "isAdmin" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "username" TEXT UNIQUE
);

-- 2. Create session table
CREATE TABLE "session" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "token" TEXT UNIQUE NOT NULL,
  "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Create account table (passwords live here — not readable via anon key)
CREATE TABLE "account" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
  "refreshTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
  "scope" TEXT,
  "password" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. Create verification table
CREATE TABLE "verification" (
  "id" TEXT PRIMARY KEY,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 5. Migrate existing users (UUID cast to TEXT)
INSERT INTO "user" ("id", "name", "username", "isAdmin", "createdAt", "updatedAt")
SELECT
  id::TEXT,
  name,
  name,
  is_admin,
  created_at,
  created_at
FROM users;

-- 6. Update scores.user_id: drop FK, retype, re-add FK to new user table
ALTER TABLE scores DROP CONSTRAINT scores_user_id_fkey;
ALTER TABLE scores ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE scores ADD CONSTRAINT scores_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES "user"("id") ON DELETE CASCADE;

-- 7. Update snake_scores.user_id: same
ALTER TABLE snake_scores DROP CONSTRAINT snake_scores_user_id_fkey;
ALTER TABLE snake_scores ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE snake_scores ADD CONSTRAINT snake_scores_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES "user"("id") ON DELETE CASCADE;

-- 8. Drop old users table
DROP TABLE users;

-- 9. RLS
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read users" ON "user" FOR SELECT USING (true);
CREATE POLICY "Service insert users" ON "user" FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update users" ON "user" FOR UPDATE USING (true);
CREATE POLICY "Service delete users" ON "user" FOR DELETE USING (true);

ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service manages sessions" ON "session" FOR ALL USING (true);

-- account: no public SELECT (passwords stored here)
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service manages accounts" ON "account" FOR ALL USING (true);

ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service manages verifications" ON "verification" FOR ALL USING (true);
