import { supabase } from './supabase';
import { Resume } from '@/types/resume';
import { Job } from '@/types/job';

export const supabaseApi = {
  // --- Resumes ---
  
  async saveResume(resume: Resume) {
    // Destructure to separate top-level fields from the JSON payload
    const { id, title, userId, ...content } = resume;
    
    // We do an upsert so it creates if new, updates if exists
    const { data, error } = await supabase
      .from('resumes')
      .upsert({
        id: id === 'new' ? undefined : id, // Let Postgres generate UUID if 'new'
        user_id: userId,
        title: title,
        content: content,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving resume:', error);
      throw error;
    }
    return data;
  },

  async getResumes(userId: string) {
    const { data, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching resumes:', error);
      throw error;
    }
    
    // Map back to our Resume type
    return data.map(row => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      ...row.content // Spreads personalInfo, sections, settings
    })) as Resume[];
  },

  async getResumeById(id: string, userId: string) {
    const { data, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching resume by id:', error);
      throw error;
    }
    
    if (!data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      ...data.content
    } as Resume;
  },

  async deleteResume(id: string) {
    const { error } = await supabase
      .from('resumes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting resume:', error);
      throw error;
    }
    return true;
  },

  // --- Jobs ---

  async saveJob(job: { id: string; userId: string; company: string; position: string; location?: string; status: string; link?: string; dateAdded: string; dateApplied?: string; description?: string; source?: string; appliedVia?: string; salaryRange?: string; workSetup?: string }) {
    const { data, error } = await supabase
      .from('jobs')
      .upsert({
        id: job.id.startsWith('temp-') ? undefined : job.id,
        user_id: job.userId,
        company: job.company,
        position: job.position,
        location: job.location,
        status: job.status,
        link: job.link,
        date_added: job.dateAdded,
        date_applied: job.dateApplied,
        description: job.description,
        source: job.source,
        applied_via: job.appliedVia,
        salary_range: job.salaryRange,
        work_setup: job.workSetup
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving job:', error);
      throw error;
    }
    return {
      id: data.id,
      userId: data.user_id,
      company: data.company,
      position: data.position,
      location: data.location,
      status: data.status,
      link: data.link,
      dateAdded: data.date_added,
      dateApplied: data.date_applied,
      description: data.description,
      source: data.source,
      appliedVia: data.applied_via,
      salaryRange: data.salary_range,
      workSetup: data.work_setup
    };
  },

  async updateJob(id: string, updates: Partial<Job>) {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.company !== undefined) dbUpdates.company = updates.company;
    if (updates.position !== undefined) dbUpdates.position = updates.position;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.link !== undefined) dbUpdates.link = updates.link;
    if (updates.dateAdded !== undefined) dbUpdates.date_added = updates.dateAdded;
    if (updates.dateApplied !== undefined) dbUpdates.date_applied = updates.dateApplied;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.source !== undefined) dbUpdates.source = (updates.source as string) === "" ? null : updates.source;
    if (updates.appliedVia !== undefined) dbUpdates.applied_via = (updates.appliedVia as string) === "" ? null : updates.appliedVia;
    if (updates.salaryRange !== undefined) dbUpdates.salary_range = updates.salaryRange;
    if (updates.workSetup !== undefined) dbUpdates.work_setup = (updates.workSetup as string) === "" ? null : updates.workSetup;

    const { data, error } = await supabase
      .from('jobs')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating job:', error);
      throw error;
    }
    return {
      id: data.id,
      userId: data.user_id,
      company: data.company,
      position: data.position,
      location: data.location,
      status: data.status,
      link: data.link,
      dateAdded: data.date_added,
      dateApplied: data.date_applied,
      description: data.description,
      source: data.source,
      appliedVia: data.applied_via,
      salaryRange: data.salary_range,
      workSetup: data.work_setup
    };
  },

  async getJobs(userId: string) {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching jobs:', error);
      throw error;
    }
    return data.map(row => ({
      id: row.id,
      userId: row.user_id,
      company: row.company,
      position: row.position,
      location: row.location,
      status: row.status,
      link: row.link,
      dateAdded: row.date_added,
      dateApplied: row.date_applied,
      description: row.description,
      source: row.source,
      appliedVia: row.applied_via,
      salaryRange: row.salary_range,
      workSetup: row.work_setup
    }));
  },

  async deleteJob(jobId: string) {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', jobId);

    if (error) {
      console.error('Error deleting job:', error);
      throw error;
    }
  },

  // --- Storage ---
  
  async uploadProfilePhoto(file: File, userId: string) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (error) {
      console.error('Error uploading photo:', error);
      throw error;
    }
    
    return filePath;
  },

  async getProfilePhotoUrl(path: string) {
    const { data, error } = await supabase.storage
      .from('avatars')
      .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 days

    if (error) {
      console.error('Error getting signed url:', error);
      return null;
    }

    return data.signedUrl;
  },

  async deleteProfilePhoto(path: string) {
    const { error } = await supabase.storage
      .from('avatars')
      .remove([path]);

    if (error) {
      console.error('Error deleting photo:', error);
      throw error;
    }
    return true;
  }
};
