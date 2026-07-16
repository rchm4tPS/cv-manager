-- Phase 5 Migration Script
-- INSTRUCTIONS: Run this script in your Supabase SQL Editor.
-- It safely migrates existing 'local-user' data to your actual UUID, alters column types, and locks down RLS.

-- 1. Backfill local-user data to the first auth.user 
-- (Since you logged in via OAuth, you should have an auth.user record)
DO $$
DECLARE
    target_user_id UUID;
BEGIN
    SELECT id INTO target_user_id FROM auth.users ORDER BY created_at DESC LIMIT 1;
    
    IF target_user_id IS NOT NULL THEN
        UPDATE resumes SET user_id = target_user_id::text WHERE user_id = 'local-user';
        UPDATE jobs SET user_id = target_user_id::text WHERE user_id = 'local-user';
    END IF;
END $$;

-- Clean up any remaining 'local-user' rows if they somehow weren't migrated
DELETE FROM resumes WHERE user_id = 'local-user';
DELETE FROM jobs WHERE user_id = 'local-user';

-- 2. Alter user_id from TEXT to UUID and add Foreign Key constraints
ALTER TABLE resumes 
  ALTER COLUMN user_id TYPE UUID USING user_id::UUID,
  ALTER COLUMN user_id DROP DEFAULT,
  ADD CONSTRAINT resumes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE jobs 
  ALTER COLUMN user_id TYPE UUID USING user_id::UUID,
  ALTER COLUMN user_id DROP DEFAULT,
  ADD CONSTRAINT jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Replace loose RLS policies with strict authenticated policies
DROP POLICY IF EXISTS "Allow all actions for MVP on resumes" ON resumes;
CREATE POLICY "Users can manage their own resumes" ON resumes
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow all actions for MVP on jobs" ON jobs;
CREATE POLICY "Users can manage their own jobs" ON jobs
  FOR ALL USING (auth.uid() = user_id);

-- 4. Create 'avatars' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', false) 
ON CONFLICT (id) DO NOTHING;

-- 5. Storage RLS: allow users to manage their own avatars 
-- First, drop any existing loose/anonymous policies you might have created before
DROP POLICY IF EXISTS "Allow anonymous read" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous uploads" ON storage.objects;

-- File paths are structured as: avatars/<user_id>-<timestamp>.ext
CREATE POLICY "Users can manage their own avatars" ON storage.objects
  FOR ALL 
  USING (bucket_id = 'avatars' AND name LIKE 'avatars/' || auth.uid()::text || '-%')
  WITH CHECK (bucket_id = 'avatars' AND name LIKE 'avatars/' || auth.uid()::text || '-%');
