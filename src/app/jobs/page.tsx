"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabaseApi } from "@/lib/supabase-api";
import { useResumeStore } from "@/store/useResumeStore";
import { useToast } from "@/hooks/use-toast";

export interface Job {
  id: string;
  company: string;
  position: string;
  location: string;
  status: string;
  link: string;
  dateAdded: string;
  description: string;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [formData, setFormData] = useState({
    company: "", position: "", location: "", status: "saved", link: "", description: ""
  });

  // Delete Overlay State
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);

  // Expandable Rows State
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());

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
    setFormData({ company: "", position: "", location: "", status: "saved", link: "", description: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (job: Job) => {
    setEditingJob(job);
    setFormData({ 
      company: job.company, position: job.position, location: job.location || "", 
      status: job.status, link: job.link || "", description: job.description || "" 
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.company || !formData.position) {
      toast({ title: "Error", description: "Company and Position are required", variant: "destructive" });
      return;
    }

    try {
      const jobToSave = {
        id: editingJob ? editingJob.id : `temp-${Date.now()}`,
        dateAdded: editingJob ? editingJob.dateAdded : new Date().toLocaleDateString(),
        ...formData
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

  const handleTailor = (job: Job) => {
    setTailoringJob({
      id: job.id, company: job.company, position: job.position, description: job.description || ""
    });
    router.push("/");
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
                  <th className="px-6 py-4 font-medium">Date Added</th>
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
                        <td className="px-6 py-4 text-muted-foreground">{job.dateAdded || "-"}</td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
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
    </div>
  );
}
