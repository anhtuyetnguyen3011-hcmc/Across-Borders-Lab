-- Wipe test data from prior unassigned-bucket flow
DELETE FROM "StyleSample";
DELETE FROM "StyleProfile";

-- Add platform column to StyleProfile for per-platform scoping
ALTER TABLE "StyleProfile" ADD COLUMN "platform" TEXT NOT NULL DEFAULT 'all';

-- Replace single-user unique constraint with composite (userId, platform)
ALTER TABLE "StyleProfile" DROP CONSTRAINT "StyleProfile_userId_key";
ALTER TABLE "StyleProfile" ADD CONSTRAINT "StyleProfile_userId_platform_key" UNIQUE ("userId", "platform");
