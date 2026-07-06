-- Run this in your Supabase SQL Editor to create the necessary tables

-- 1. Resumes Table
CREATE TABLE resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL DEFAULT 'local-user', -- In a real app with Auth, this would reference auth.users
  title TEXT NOT NULL DEFAULT 'Untitled Resume',
  content JSONB NOT NULL DEFAULT '{}'::jsonb, -- Stores the entire PersonalInfo, Sections, and Settings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all actions for MVP (Remove in production)
CREATE POLICY "Allow all actions for MVP on resumes" ON resumes FOR ALL USING (true);


-- Enums for new job columns
CREATE TYPE job_source_enum AS ENUM ('relasi/teman', 'keluarga', 'dosen', 'linked in', 'grup WA', 'website perusahaan', 'glints', 'jobstreet', 'indeed', 'mendapat sendiri di dunia nyata');
CREATE TYPE job_applied_via_enum AS ENUM ('email', 'website perusahaan', 'google form', 'glints', 'jobstreet', 'linked in easy apply', 'indeed', 'ordal', 'dikirim ke tempat');
CREATE TYPE job_work_setup_enum AS ENUM ('WFO', 'WFH', 'Hybrid');

-- 2. Jobs Table (Job Tracker)
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL DEFAULT 'local-user',
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

-- Create policy to allow all actions for MVP (Remove in production)
CREATE POLICY "Allow all actions for MVP on jobs" ON jobs FOR ALL USING (true);
