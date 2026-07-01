"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseApi } from "@/lib/supabase-api";
import { Resume } from "@/types/resume";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Upload, Loader2, Clock, Trash2, Sparkles } from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";

export default function HomePage() {
  const router = useRouter();
  const { tailoringJob, setTailoringJob } = useResumeStore();
  const [recentResumes, setRecentResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await supabaseApi.getResumes();
        if (data) {
          setRecentResumes(data);
        }
      } catch (error) {
        console.error("Failed to load resume history:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadHistory();
  }, []);

  const handleCreateNew = () => {
    router.push("/editor/new");
  };

  const handleOpenResume = (resume: Resume) => {
    router.push(`/editor/${resume.id}`);
  };

  const handleDeleteResume = async () => {
    if (!deleteConfirmId) return;
    try {
      setIsDeleting(true);
      await supabaseApi.deleteResume(deleteConfirmId);
      setRecentResumes(prev => prev.filter(r => r.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Failed to delete resume:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 flex flex-col p-8 md:p-12 overflow-auto">
      <div className="max-w-4xl w-full mx-auto space-y-10">
        
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Welcome to CV Manager</h1>
          <p className="text-muted-foreground text-lg">Create, manage, and tailor your professional resumes.</p>
        </div>

        {/* Tailoring Context Banner */}
        {tailoringJob && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3 text-blue-800">
               <Sparkles className="w-6 h-6 shrink-0" />
               <p className="font-medium text-sm md:text-base">
                 Select a resume below to begin tailoring for <span className="font-bold">{tailoringJob.position}</span> at <span className="font-bold">{tailoringJob.company}</span>.
               </p>
            </div>
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 shrink-0" onClick={() => setTailoringJob(null)}>
              Cancel Tailoring
            </Button>
          </div>
        )}

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button 
            onClick={handleCreateNew}
            className="flex flex-col items-center justify-center p-8 bg-white border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 rounded-xl transition-all group text-center"
          >
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Create New CV</h3>
            <p className="text-sm text-slate-500">Start with a completely blank canvas</p>
          </button>

          <button 
            className="flex flex-col items-center justify-center p-8 bg-white border-2 border-slate-200 hover:border-slate-300 hover:shadow-md rounded-xl transition-all group text-center"
          >
            <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Upload Existing CV</h3>
            <p className="text-sm text-slate-500">Extract data from a PDF (Coming Soon)</p>
          </button>
        </div>

        {/* History Section */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-slate-400" />
            <h2 className="text-xl font-semibold text-slate-800">Recent Resumes</h2>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : recentResumes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentResumes.map((resume) => (
                <div
                  key={resume.id}
                  onClick={() => handleOpenResume(resume)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleOpenResume(resume); }}
                  className="flex flex-col text-left p-5 bg-white border border-slate-200 rounded-xl hover:shadow-md hover:border-slate-300 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between w-full mb-3">
                    <FileText className="w-8 h-8 text-blue-500" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(resume.id); }}
                      className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                      title="Delete Resume"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="font-semibold text-slate-900 truncate w-full mb-1">
                    {resume.title || "Untitled Resume"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Last updated {new Date(resume.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white border border-slate-200 rounded-xl">
              <p className="text-slate-500">You haven&apos;t created any resumes yet.</p>
            </div>
          )}
        </div>

      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Delete Resume?</h3>
            <p className="text-slate-500">
              Are you sure you want to delete this resume? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteResume} disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
