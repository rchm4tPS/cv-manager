import React, { useState, useEffect } from "react";
import { Clock, LayoutGrid, List, Sparkles, FileText, Trash2, Loader2 } from "lucide-react";
import { Resume } from "@/types/resume";
import { useJobStore } from "@/store/useJobStore";
import { useRequireUser } from "@/hooks/useRequireUser";

interface RecentResumesListProps {
  recentResumes: Resume[];
  isLoading: boolean;
  onOpen: (resume: Resume) => void;
  onDeleteClick: (id: string) => void;
}

export const RecentResumesList: React.FC<RecentResumesListProps> = ({
  recentResumes,
  isLoading,
  onOpen,
  onDeleteClick
}) => {
  const [filterType, setFilterType] = useState<'all' | 'master' | 'tailored'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  const { jobs, fetchJobs } = useJobStore();
  const user = useRequireUser();

  useEffect(() => {
    if (user?.id) fetchJobs(user.id);
    const stored = localStorage.getItem('resumeViewMode');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === 'table' || stored === 'grid') setViewMode(stored);
  }, [fetchJobs, user?.id]);

  const handleViewModeChange = (mode: 'grid' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('resumeViewMode', mode);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-400" />
          <h2 className="text-xl font-semibold text-slate-800">Recent Resumes</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => handleViewModeChange('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => handleViewModeChange('table')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${filterType === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              All
            </button>
            <button 
              onClick={() => setFilterType('master')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${filterType === 'master' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Master
            </button>
            <button 
              onClick={() => setFilterType('tailored')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${filterType === 'tailored' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Tailored
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : recentResumes.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentResumes
              .filter(r => {
                if (filterType === 'master') return !r.tailoringJob;
                if (filterType === 'tailored') return !!r.tailoringJob;
                return true;
              })
              .map((resume) => (
              <div
                key={resume.id}
                onClick={() => onOpen(resume)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') onOpen(resume); }}
                className="flex flex-col text-left p-5 bg-white border border-slate-200 rounded-xl hover:shadow-md hover:border-slate-300 transition-all cursor-pointer relative"
              >
                <div className="flex items-start justify-between w-full mb-3">
                  {resume.tailoringJob ? (
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                        Tailored
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <FileText className="w-8 h-8 text-blue-500" />
                      <span className="text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        Master
                      </span>
                    </div>
                  )}
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteClick(resume.id); }}
                    className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                    title="Delete Resume"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="font-semibold text-slate-900 truncate w-full mb-1">
                  {resume.title || "Untitled Resume"}
                </h3>
                {resume.tailoringJob && (
                  (() => {
                    const liveJob = jobs.find(j => j.id === resume.tailoringJob?.id);
                    const position = liveJob?.position || resume.tailoringJob.position;
                    const company = liveJob?.company || resume.tailoringJob.company;
                    return (
                      <p className="text-xs text-emerald-600 font-medium truncate mb-0.5">
                        {position} at {company}
                      </p>
                    );
                  })()
                )}
                <p className="text-[10px] text-slate-400 mt-auto pt-2">
                  Updated {new Date(resume.updatedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="border rounded-md bg-white shadow-sm overflow-x-auto w-full">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b whitespace-nowrap">
                <tr>
                  <th className="px-6 py-4 font-medium">Title</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Tailored For</th>
                  <th className="px-6 py-4 font-medium">Last Updated</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentResumes
                  .filter(r => {
                    if (filterType === 'master') return !r.tailoringJob;
                    if (filterType === 'tailored') return !!r.tailoringJob;
                    return true;
                  })
                  .map((resume) => (
                    <tr 
                      key={resume.id} 
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors align-middle cursor-pointer" 
                      onClick={() => onOpen(resume)}
                    >
                      <td className="px-6 py-4 font-semibold text-slate-900 whitespace-nowrap">
                        {resume.title || "Untitled Resume"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {resume.tailoringJob ? (
                          <span className="text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Tailored
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <FileText className="w-3 h-3" /> Master
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-emerald-600 font-medium whitespace-nowrap">
                        {resume.tailoringJob ? (() => {
                          const liveJob = jobs.find(j => j.id === resume.tailoringJob?.id);
                          const position = liveJob?.position || resume.tailoringJob.position;
                          const company = liveJob?.company || resume.tailoringJob.company;
                          return `${position} at ${company}`;
                        })() : '-'}
                      </td>
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                        {new Date(resume.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDeleteClick(resume.id); }}
                          className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors inline-block"
                          title="Delete Resume"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-xl">
          <p className="text-slate-500">You haven&apos;t created any resumes yet.</p>
        </div>
      )}
    </div>
  );
};
