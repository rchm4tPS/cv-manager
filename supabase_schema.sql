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
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all actions for MVP (Remove in production)
CREATE POLICY "Allow all actions for MVP on jobs" ON jobs FOR ALL USING (true);
