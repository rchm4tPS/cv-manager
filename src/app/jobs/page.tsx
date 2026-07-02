"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, ExternalLink, Calendar as CalendarIcon, ChevronUp, TrendingUp, TrendingDown, Briefcase, BarChart3 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { supabaseApi } from "@/lib/supabase-api";
import { useResumeStore } from "@/store/useResumeStore";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Resume } from "@/types/resume";
import { AddJobModal, Job } from "@/components/AddJobModal";
import { cn } from "@/lib/utils";

export default function JobsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { setTailoringJob } = useResumeStore();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);

  const [tailorModalJob, setTailorModalJob] = useState<Job | null>(null);
  const [recentResumes, setRecentResumes] = useState<Resume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(false);

  // Dashboard State
  const [isDashboardOpen, setIsDashboardOpen] = useState(true);

  const loadJobs = async (isInitial = false) => {
    if (!isInitial) setLoading(true);
    try {
      const data = await supabaseApi.getJobs();
      setJobs(data as Job[]);
    } catch (error) {
      console.error("Failed to load jobs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
    loadJobs(true);
  }, []);

  // Dashboard Metrics Calculation
  const metrics = React.useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = lastMonthDate.getMonth();
    const lastMonthYear = lastMonthDate.getFullYear();

    let appliedCount = 0;
    let interviewCount = 0;
    let offerCount = 0;
    let rejectedCount = 0;

    let currentMonthApplied = 0;
    let lastMonthApplied = 0;

    jobs.forEach(job => {
      if (job.status === 'applied') appliedCount++;
      else if (job.status === 'interviewed') interviewCount++;
      else if (job.status === 'offered') offerCount++;
      else if (job.status === 'rejected') rejectedCount++;

      if (job.status !== 'saved' && job.dateApplied) {
        const d = new Date(job.dateApplied);
        if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
          currentMonthApplied++;
        } else if (d.getFullYear() === lastMonthYear && d.getMonth() === lastMonth) {
          lastMonthApplied++;
        }
      }
    });

    let momGrowth = 0;
    if (lastMonthApplied > 0) {
      momGrowth = Math.round(((currentMonthApplied - lastMonthApplied) / lastMonthApplied) * 100);
    } else if (currentMonthApplied > 0) {
      momGrowth = 100;
    }

    return {
      appliedCount,
      interviewCount,
      offerCount,
      rejectedCount,
      currentMonthApplied,
      lastMonthApplied,
      momGrowth,
      totalActive: appliedCount + interviewCount
    };
  }, [jobs]);

  const openAddModal = () => {
    setEditingJob(null);
    setIsModalOpen(true);
  };

  const openEditModal = (job: Job) => {
    setEditingJob(job);
    setIsModalOpen(true);
  };

  const executeDelete = async () => {
    if (!jobToDelete) return;
    try {
      await supabaseApi.deleteJob(jobToDelete);
      setJobs(jobs.filter(j => j.id !== jobToDelete));
      toast({ title: "Success", description: "Job deleted!" });
    } catch {
      toast({ title: "Error", description: "Failed to delete job", variant: "destructive" });
    } finally {
      setJobToDelete(null);
    }
  };

  const handleTailor = async (job: Job) => {
    setTailorModalJob(job);
    setLoadingResumes(true);
    try {
      const data = await supabaseApi.getResumes();
      if (data) setRecentResumes(data);
    } catch {
      toast({ title: "Error", description: "Failed to load resumes", variant: "destructive" });
    } finally {
      setLoadingResumes(false);
    }
  };

  const handleSelectResumeForTailoring = async (resumeId: string) => {
    if (!tailorModalJob) return;
    
    try {
      // 1. Fetch original resume
      const original = await supabaseApi.getResumeById(resumeId);
      if (!original) throw new Error("Resume not found");

      // 2. Duplicate it
      const duplicate: Resume = {
        ...original,
        id: 'new',
        title: `${original.title || 'Untitled'} - Tailored for ${tailorModalJob.company}`,
        analysisResult: undefined, // Wipe out generic analysis!
        acceptedSuggestions: undefined,
        rejectedSuggestions: undefined,
        tailoringJob: {
          id: tailorModalJob.id,
          company: tailorModalJob.company,
          position: tailorModalJob.position,
          description: tailorModalJob.description
        }
      };

      // 3. Save duplicate
      const saved = await supabaseApi.saveResume(duplicate);

      // 4. Set context and navigate
      setTailoringJob({
        id: tailorModalJob.id, company: tailorModalJob.company, position: tailorModalJob.position, description: tailorModalJob.description || ""
      });
      router.push(`/editor/${saved.id}`);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to prepare tailored resume", variant: "destructive" });
    }
  };

  const toggleExpand = (jobId: string) => {
    const newExpanded = new Set(expandedJobs);
    if (newExpanded.has(jobId)) {
      newExpanded.delete(jobId);
    } else {
      newExpanded.add(jobId);
    }
    setExpandedJobs(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'saved': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'applied': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'interviewed': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'offered': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'rejected': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  if (!isMounted) return null;

  return (
    <div className="flex-1 p-8 bg-muted/10 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Job Applications</h1>
            <p className="text-muted-foreground mt-1">Manage your applications and tailor your CV for each role.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsDashboardOpen(!isDashboardOpen)}>
              {isDashboardOpen ? <><ChevronUp className="w-4 h-4 mr-2" /> Hide Dashboard</> : <><BarChart3 className="w-4 h-4 mr-2" /> Show Dashboard</>}
            </Button>
            <Button onClick={openAddModal}>+ Add Job</Button>
          </div>
        </div>

        {/* Dashboard Section */}
        {isDashboardOpen && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            
            {/* Status Card */}
            <div className="bg-white border rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-500" /> Pipeline Status
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                <div>
                  <div className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">Applied</div>
                  <div className="text-2xl font-bold text-blue-600">{metrics.appliedCount}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">Interview</div>
                  <div className="text-2xl font-bold text-purple-600">{metrics.interviewCount}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">Offer</div>
                  <div className="text-2xl font-bold text-emerald-600">{metrics.offerCount}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">Rejected</div>
                  <div className="text-2xl font-bold text-red-600">{metrics.rejectedCount}</div>
                </div>
              </div>
            </div>

            {/* Current Month Card */}
            <div className="bg-white border rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-emerald-500" /> This Month
                  </h3>
                </div>
                <div className="text-slate-500 text-sm mt-1">Total applications submitted in {format(new Date(), "MMMM yyyy")}</div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-black text-slate-800">{metrics.currentMonthApplied}</span>
                <span className="text-slate-500 font-medium">jobs</span>
              </div>
            </div>

            {/* MoM Comparison Card */}
            <div className="bg-white border rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-orange-500" /> Momentum
                  </h3>
                </div>
                <div className="text-slate-500 text-sm mt-1">Compared to {format(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), "MMMM")} ({metrics.lastMonthApplied} jobs)</div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                {metrics.momGrowth > 0 ? (
                  <div className="bg-emerald-100 text-emerald-700 flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-sm">
                    <TrendingUp className="w-4 h-4" /> <span>+{metrics.momGrowth}%</span>
                  </div>
                ) : metrics.momGrowth < 0 ? (
                  <div className="bg-red-100 text-red-700 flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-sm">
                    <TrendingDown className="w-4 h-4" /> <span>{metrics.momGrowth}%</span>
                  </div>
                ) : (
                  <div className="bg-slate-100 text-slate-700 flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-sm">
                    <span className="w-4 h-4 flex items-center justify-center">-</span> <span>0%</span>
                  </div>
                )}
                <span className="text-sm font-medium text-slate-500">month-over-month</span>
              </div>
            </div>

          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-muted-foreground">Loading jobs...</div>
        ) : (
          <div className="border rounded-md bg-background shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b">
                <tr>
                  <th className="px-6 py-4 font-medium">Position</th>
                  <th className="px-6 py-4 font-medium">Company</th>
                  <th className="px-6 py-4 font-medium">Location</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Date Applied</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      No job applications found. Click &quot;+ Add Job&quot; to get started!
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <React.Fragment key={job.id}>
                      <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-primary">{job.position}</td>
                        <td className="px-6 py-4">{job.company}</td>
                        <td className="px-6 py-4">{job.location || "-"}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-[10px] rounded-full uppercase font-bold tracking-wider border ${getStatusColor(job.status)}`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {job.dateApplied ? format(new Date(job.dateApplied), "MMM d, yyyy") : "-"}
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2 items-center">
                          {job.link && (
                            <a href={job.link} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-8 px-2 text-blue-600")}>
                              <ExternalLink className="w-3 h-3 mr-1" />
                              View Posting
                            </a>
                          )}
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => toggleExpand(job.id)}>
                            {expandedJobs.has(job.id) ? "▲" : "▼"}
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 text-xs font-semibold" onClick={() => handleTailor(job)}>
                            ✨ Tailor
                          </Button>
                          <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => openEditModal(job)} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setJobToDelete(job.id)} title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                      {expandedJobs.has(job.id) && (
                        <tr className="border-b bg-muted/20">
                          <td colSpan={6} className="px-6 py-6">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Job Description</h4>
                            <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/80 max-w-4xl">
                              {job.description || <span className="italic text-muted-foreground">No description provided.</span>}
                            </p>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddJobModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        job={editingJob}
        onSaved={() => loadJobs()}
      />

      {/* Delete Confirmation Overlay */}
      {jobToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-background rounded-lg shadow-xl w-96 overflow-hidden flex flex-col p-6 text-center gap-4">
            <h2 className="font-semibold text-lg text-foreground">Delete Job Application?</h2>
            <p className="text-sm text-muted-foreground">This action cannot be undone. Are you sure you want to permanently delete this application?</p>
            <div className="flex justify-center gap-3 mt-4">
              <Button variant="outline" onClick={() => setJobToDelete(null)}>Cancel</Button>
              <Button variant="destructive" onClick={executeDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* Tailor Selection Modal */}
      {tailorModalJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 flex flex-col max-h-[80vh]">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Tailor for {tailorModalJob.company}</h3>
            <p className="text-slate-500 mb-4 text-sm">Select a resume to begin tailoring it for the {tailorModalJob.position} role.</p>
            
            <div className="flex-1 overflow-y-auto space-y-2 mb-6">
              {loadingResumes ? (
                <div className="text-center text-slate-500 py-4">Loading resumes...</div>
              ) : recentResumes.length > 0 ? (
                recentResumes.map(resume => {
                  const isTailored = !!resume.tailoringJob;
                  return (
                    <button
                      key={resume.id}
                      onClick={() => !isTailored && handleSelectResumeForTailoring(resume.id)}
                      disabled={isTailored}
                      className={`w-full text-left p-4 border rounded-lg transition-colors flex justify-between items-center group ${
                        isTailored 
                          ? 'bg-slate-50/50 border-slate-100 opacity-60 cursor-not-allowed' 
                          : 'bg-slate-50 hover:bg-blue-50 border-slate-200 hover:border-blue-300 cursor-pointer'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="font-semibold text-slate-900">{resume.title || "Untitled Resume"}</h4>
                          {isTailored && (
                            <span className="text-[9px] font-bold uppercase bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded">
                              Tailored
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">Last updated: {new Date(resume.updatedAt).toLocaleDateString()}</p>
                      </div>
                      {!isTailored && (
                        <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">Select →</span>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="text-center text-slate-500 py-4">No resumes found. Please create one first!</div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 shrink-0">
              <Button variant="outline" onClick={() => setTailorModalJob(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
