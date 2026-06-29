import { supabase } from './supabase';
import { Resume } from '@/types/resume';

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

  async getResumes(userId: string = 'local-user') {
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

  async getResumeById(id: string) {
    const { data, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('id', id)
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

  async saveJob(job: { id: string; company: string; position: string; location?: string; status: string; link?: string; dateAdded: string; description?: string }) {
    const { data, error } = await supabase
      .from('jobs')
      .upsert({
        id: job.id.startsWith('temp-') ? undefined : job.id,
        user_id: 'local-user',
        company: job.company,
        position: job.position,
        location: job.location,
        status: job.status,
        link: job.link,
        date_added: job.dateAdded,
        description: job.description
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving job:', error);
      throw error;
    }
    return data;
  },

  async getJobs(userId: string = 'local-user') {
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
      company: row.company,
      position: row.position,
      location: row.location,
      status: row.status,
      link: row.link,
      dateAdded: row.date_added,
      description: row.description
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
  
  async uploadProfilePhoto(file: File, userId: string = 'local-user') {
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
