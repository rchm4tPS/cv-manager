"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, ExternalLink, Calendar as CalendarIcon, FileText } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { supabaseApi } from "@/lib/supabase-api";
import { useResumeStore } from "@/store/useResumeStore";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Resume } from "@/types/resume";

export interface Job {
  id: string;
  company: string;
  position: string;
  location: string;
  status: string;
  link: string;
  dateAdded: string;
  dateApplied?: string;
  description: string;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [formData, setFormData] = useState({
    company: "", position: "", location: "", status: "saved", link: "", description: "", dateApplied: undefined as Date | undefined
  });

  // Delete Overlay State
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);

  // Expandable Rows State
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());

  // Tailor Modal State
  const [tailorModalJob, setTailorModalJob] = useState<Job | null>(null);
  const [recentResumes, setRecentResumes] = useState<Resume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(false);

  const router = useRouter();
  const { setTailoringJob } = useResumeStore();
  const { toast } = useToast();

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
    loadJobs(true);
  }, []);

  const openAddModal = () => {
    setEditingJob(null);
    setFormData({ company: "", position: "", location: "", status: "saved", link: "", description: "", dateApplied: undefined });
    setIsModalOpen(true);
  };

  const openEditModal = (job: Job) => {
    setEditingJob(job);
    setFormData({ 
      company: job.company, position: job.position, location: job.location || "", 
      status: job.status, link: job.link || "", description: job.description || "",
      dateApplied: job.dateApplied ? new Date(job.dateApplied) : undefined
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.company || !formData.position) {
      toast({ title: "Error", description: "Company and Position are required", variant: "destructive" });
      return;
    }

    try {
      const { dateApplied, ...restFormData } = formData;
      const jobToSave = {
        id: editingJob ? editingJob.id : `temp-${Date.now()}`,
        dateAdded: editingJob ? editingJob.dateAdded : new Date().toLocaleDateString(),
        dateApplied: dateApplied ? dateApplied.toISOString() : undefined,
        ...restFormData
      };
      
      await supabaseApi.saveJob(jobToSave);
      toast({ title: "Success", description: "Job saved successfully!" });
      setIsModalOpen(false);
      loadJobs();
    } catch {
      toast({ title: "Error", description: "Failed to save job", variant: "destructive" });
    }
  };

  const executeDelete = async () => {
    if (!jobToDelete) return;
    try {
      await supabaseApi.deleteJob(jobToDelete);
      toast({ title: "Success", description: "Job deleted!" });
      setJobToDelete(null);
      loadJobs();
    } catch {
      toast({ title: "Error", description: "Failed to delete job", variant: "destructive" });
      setJobToDelete(null);
    }
  };

  const handleTailor = async (job: Job) => {
    setTailorModalJob(job);
    setLoadingResumes(true);
    try {
      const data = await supabaseApi.getResumes();
      if (data) setRecentResumes(data);
    } catch (error) {
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

  return (
    <div className="flex-1 p-8 bg-muted/10 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Job Applications</h1>
            <p className="text-muted-foreground mt-1">Manage your applications and tailor your CV for each role.</p>
          </div>
          <Button onClick={openAddModal}>+ Add Job</Button>
        </div>

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

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-background rounded-lg shadow-xl w-[500px] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-muted/30">
              <h2 className="font-semibold text-lg">{editingJob ? "Edit Job" : "Add Job"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Company</label>
                  <input 
                    type="text" className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                    value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Position</label>
                  <input 
                    type="text" className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                    value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Location</label>
                  <input 
                    type="text" className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                    value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Status</label>
                  <select 
                    className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="saved">Saved</option>
                    <option value="applied">Applied</option>
                    <option value="interviewed">Interviewed</option>
                    <option value="offered">Offered</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Source Link</label>
                  <input 
                    type="url" className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                    placeholder="https://..."
                    value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Date Applied</label>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger render={
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full h-9 justify-start text-left font-normal px-3",
                          !formData.dateApplied && "text-muted-foreground"
                        )}
                      />
                    }>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.dateApplied ? format(formData.dateApplied, "PPP") : <span>Pick a date</span>}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.dateApplied}
                        onSelect={(date) => {
                          setFormData({...formData, dateApplied: date});
                          setIsCalendarOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Job Description</label>
                <textarea 
                  className="w-full h-32 rounded-md border bg-background p-3 text-sm resize-none"
                  placeholder="Paste the job description here for the AI to tailor against..."
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
            </div>

            <div className="p-4 border-t bg-muted/30 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>Save Job</Button>
            </div>
          </div>
        </div>
      )}

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
