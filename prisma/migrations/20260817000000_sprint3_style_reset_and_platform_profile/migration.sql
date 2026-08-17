-- Step 1: Add platform column to StyleProfile for per-platform scoping.
-- Uses IF NOT EXISTS so this is safe if the column already exists (e.g. from a prior db push).
-- Existing rows automatically receive platform = 'all' via the DEFAULT.
-- NO rows are deleted.
ALTER TABLE "StyleProfile" ADD COLUMN IF NOT EXISTS "platform" TEXT NOT NULL DEFAULT 'all';

-- Step 2: Drop the old single-column unique constraint if it exists.
-- Uses IF EXISTS so this is safe if the constraint was already dropped.
ALTER TABLE "StyleProfile" DROP CONSTRAINT IF EXISTS "StyleProfile_userId_key";

-- Step 3: Create composite (userId, platform) unique constraint.
-- We verified no such constraint exists in the current database state.
ALTER TABLE "StyleProfile" ADD CONSTRAINT "StyleProfile_userId_platform_key" UNIQUE ("userId", "platform");
