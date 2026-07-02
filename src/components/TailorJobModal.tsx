"use client";

import { useEffect, useState } from "react";
import { X, Briefcase, PlusCircle, Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { supabaseApi } from "@/lib/supabase-api";
import { Resume } from "@/types/resume";
import Link from "next/link";
import { createPortal } from "react-dom";

interface Job {
  id: string;
  company: string;
  position: string;
  location?: string;
  status: string;
  link?: string;
  dateAdded: string;
  dateApplied?: string;
  description?: string;
}

interface TailorJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectJob: (job: Job) => void;
  isDuplicating: boolean;
}

export function TailorJobModal({ isOpen, onClose, onSelectJob, isDuplicating }: TailorJobModalProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [tailoredResumesByJob, setTailoredResumesByJob] = useState<Record<string, string[]>>({});

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([
        supabaseApi.getJobs(),
        supabaseApi.getResumes()
      ]).then(([jobsData, resumesData]) => {
        setJobs(jobsData);
        
        // Map jobId to array of tailored resume titles
        const resumeMap: Record<string, string[]> = {};
        resumesData.forEach((resume: Resume) => {
          if (resume.tailoringJob?.id) {
            if (!resumeMap[resume.tailoringJob.id]) {
              resumeMap[resume.tailoringJob.id] = [];
            }
            resumeMap[resume.tailoringJob.id].push(resume.title);
          }
        });
        setTailoredResumesByJob(resumeMap);
      }).catch(err => {
        console.error("Failed to load jobs or resumes:", err);
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2 text-slate-800">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Briefcase className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-lg">Select a Job to Tailor</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={isDuplicating} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1 bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p>Loading your jobs...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 mb-4">You haven't saved any jobs yet.</p>
              <Link href="/jobs" className={buttonVariants({ variant: "outline" })}>
                Go to Job Tracker to add one
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => {
                const tailoredCvTitles = tailoredResumesByJob[job.id];
                return (
                  <button
                    key={job.id}
                    onClick={() => onSelectJob(job)}
                    disabled={isDuplicating}
                    className="w-full flex flex-col text-left p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md hover:bg-blue-50/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-slate-800 truncate">{job.position}</h3>
                        <p className="text-sm text-slate-500 truncate">{job.company}</p>
                      </div>
                      <div className="shrink-0 ml-4 w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <PlusCircle className="w-5 h-5" />
                      </div>
                    </div>
                    {tailoredCvTitles && tailoredCvTitles.length > 0 && (
                      <div className="mt-2 text-[11px] text-slate-400 font-medium">
                        Tailored CV exists: 
                        <ul className="mt-1 space-y-0.5">
                          {tailoredCvTitles.map((title, idx) => (
                            <li key={idx} className="italic text-slate-400">- {title}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
