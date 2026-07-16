-- Run this in your Supabase SQL Editor to create the necessary tables, types, and policies

-- 1. Resumes Table
CREATE TABLE resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Resume',
  content JSONB NOT NULL DEFAULT '{}'::jsonb, -- Stores the entire PersonalInfo, Sections, and Settings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Users can manage their own resumes" ON resumes 
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Grant privileges
GRANT ALL ON TABLE resumes TO anon, authenticated, service_role;


-- Enums for new job columns
CREATE TYPE job_source_enum AS ENUM ('relasi/teman', 'keluarga', 'dosen', 'linked in', 'grup WA', 'website perusahaan', 'glints', 'jobstreet', 'indeed', 'mendapat sendiri di dunia nyata', 'instagram', 'twitter', 'Threads by Instagram', 'facebook', 'referral', 'dealls');
CREATE TYPE job_applied_via_enum AS ENUM ('email', 'website perusahaan', 'google form', 'glints', 'jobstreet', 'linked in easy apply', 'indeed', 'ordal', 'dikirim ke tempat', 'dealls');
CREATE TYPE job_work_setup_enum AS ENUM ('WFO', 'WFH', 'Hybrid');

-- 2. Jobs Table (Job Tracker)
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  position TEXT NOT NULL,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'saved', -- saved, applied, interviewed, offered, rejected
  link TEXT,
  date_added TEXT,
  date_applied TEXT,
  description TEXT,
  source job_source_enum,
  applied_via job_applied_via_enum,
  salary_range TEXT,
  work_setup job_work_setup_enum,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Users can manage their own jobs" ON jobs 
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Grant privileges
GRANT ALL ON TABLE jobs TO anon, authenticated, service_role;


-- 3. Storage Bucket for Avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', false) 
ON CONFLICT (id) DO NOTHING;

-- 4. Storage RLS: allow users to manage their own avatars 
CREATE POLICY "Users can manage their own avatars" ON storage.objects
  FOR ALL 
  USING (bucket_id = 'avatars' AND name LIKE 'avatars/' || auth.uid()::text || '-%')
  WITH CHECK (bucket_id = 'avatars' AND name LIKE 'avatars/' || auth.uid()::text || '-%');
