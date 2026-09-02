-- Migration Phase 6: Add is_archived column to jobs table
-- Run this script in your Supabase SQL Editor

ALTER TABLE public.jobs 
ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false;

-- Update the realtime publication if necessary, but jobs is likely already published.

-- Phase 7: Status Expansion Migration
-- We rename existing "interviewed" statuses to "interviewing" to match the new 7-status system
UPDATE public.jobs 
SET status = 'interviewing' 
WHERE status = 'interviewed';

-- Phase 8: Add cv_url column for CV PDF uploads
ALTER TABLE public.jobs ADD COLUMN cv_url TEXT;

-- Phase 8 (Part 2): Storage RLS Policies for cv-uploads bucket
-- (Note: RLS is already natively enabled on storage.objects by Supabase)

-- 1. Allow users to upload files to their own folder
CREATE POLICY "Allow users to upload CVs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'cv-uploads' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. Allow users to read/download their own CVs
CREATE POLICY "Allow users to view own CVs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'cv-uploads' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Allow users to update their own CVs (when replacing an old one)
CREATE POLICY "Allow users to update own CVs"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'cv-uploads' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Phase 9: Added 'closed' status
-- Note: No schema changes required as status is stored as TEXT.
-- This status is mapped to "Closed" metric along with "rejected" and "withdrawn".
