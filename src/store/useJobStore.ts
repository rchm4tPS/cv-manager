import { create } from 'zustand';
import { supabaseApi } from '@/lib/supabase-api';
import { Job } from '@/types/job';

interface JobStore {
  jobs: Job[];
  isLoading: boolean;
  hasLoadedInitial: boolean;
  
  fetchJobs: (userId: string, force?: boolean) => Promise<void>;
  addJob: (jobData: Omit<Job, 'id'>) => Promise<Job | null>;
  updateJob: (id: string, updates: Partial<Job>) => Promise<boolean>;
  deleteJobs: (ids: string[]) => Promise<boolean>;
}

export const useJobStore = create<JobStore>((set, get) => ({
  jobs: [],
  isLoading: false,
  hasLoadedInitial: false,

  fetchJobs: async (userId, force = false) => {
    const { hasLoadedInitial, isLoading } = get();
    if (isLoading) return;
    if (hasLoadedInitial && !force) return;

    if (!hasLoadedInitial) set({ isLoading: true });
    try {
      const data = await supabaseApi.getJobs(userId);
      if (data) {
        set({ jobs: data, hasLoadedInitial: true });
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addJob: async (jobData) => {
    try {
      // The database generates the ID, so we pass a temp ID to satisfy the API
      const newJob = await supabaseApi.saveJob({ ...jobData, id: `temp-${Date.now()}` });
      if (newJob) {
        set((state) => ({ jobs: [newJob, ...state.jobs] }));
        return newJob;
      }
    } catch (error) {
      console.error('Failed to add job:', error);
    }
    return null;
  },

  updateJob: async (id, updates) => {
    // Optimistic update
    const previousJobs = get().jobs;
    set((state) => ({
      jobs: state.jobs.map(j => (j.id === id ? { ...j, ...updates } : j))
    }));

    try {
      const updated = await supabaseApi.updateJob(id, updates);
      if (!updated) {
        // Revert on failure
        set({ jobs: previousJobs });
        return false;
      }
      return true;
    } catch (error) {
      console.error('Failed to update job:', error);
      set({ jobs: previousJobs });
      return false;
    }
  },

  deleteJobs: async (ids) => {
    // Optimistic update
    const previousJobs = get().jobs;
    set((state) => ({
      jobs: state.jobs.filter(j => !ids.includes(j.id))
    }));

    try {
      await Promise.all(ids.map(id => supabaseApi.deleteJob(id)));
      return true;
    } catch (error) {
      console.error('Failed to delete jobs:', error);
      set({ jobs: previousJobs });
      return false;
    }
  }
}));
