"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, ExternalLink, Calendar as CalendarIcon, ChevronUp, TrendingUp, TrendingDown, Briefcase, BarChart3, Search, X, Filter } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { supabaseApi } from "@/lib/supabase-api";
import { useResumeStore } from "@/store/useResumeStore";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Resume } from "@/types/resume";
import { AddJobModal } from "@/components/AddJobModal";
import { Job, JOB_SOURCES, JOB_APPLIED_VIA, JOB_WORK_SETUPS } from "@/types/job";
import { useJobStore } from "@/store/useJobStore";
const JOB_STATUSES = ['saved', 'applied', 'interviewed', 'offered', 'rejected'];
import { cn, formatSalaryString } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { InlineDatePicker, InlineStatusPicker, EditableText } from "@/components/ui/inline-editors";
import { useAuthStore } from "@/store/useAuthStore";
export default function JobsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { setTailoringJob } = useResumeStore();
  const { user } = useAuthStore();

  const { jobs, fetchJobs, updateJob, deleteJobs, isLoading } = useJobStore();
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

  // Bulk Selection State
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterAppliedVia, setFilterAppliedVia] = useState("");
  const [filterWorkSetup, setFilterWorkSetup] = useState("");
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
    if (user?.id) {
      fetchJobs(user.id, true);
    }
  }, [fetchJobs, user?.id]);

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
        const dateStr = typeof job.dateApplied === 'string' 
          ? job.dateApplied.substring(0, 10) 
          : new Date(job.dateApplied).toISOString().substring(0, 10);
        
        const y = parseInt(dateStr.substring(0, 4));
        const m = parseInt(dateStr.substring(5, 7)) - 1;

        if (y === currentYear && m === currentMonth) {
          currentMonthApplied++;
        } else if (y === lastMonthYear && m === lastMonth) {
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

  const filteredJobs = React.useMemo(() => {
    return jobs.filter((job) => {
      // Search Box Match
      const sq = searchQuery.toLowerCase();
      const matchesSearch = !sq || 
        (job.position && job.position.toLowerCase().includes(sq)) ||
        (job.company && job.company.toLowerCase().includes(sq)) ||
        (job.location && job.location.toLowerCase().includes(sq)) ||
        (job.salaryRange && job.salaryRange.toLowerCase().includes(sq));

      if (!matchesSearch) return false;

      // Dropdown Filters
      if (filterSource && job.source !== filterSource) return false;
      if (filterAppliedVia && job.appliedVia !== filterAppliedVia) return false;
      if (filterWorkSetup && job.workSetup !== filterWorkSetup) return false;
      
      // Status Checkbox Filter
      if (filterStatuses.length > 0 && !filterStatuses.includes(job.status)) return false;

      // Date Applied Filter (Full Date)
      if (filterDateFrom || filterDateTo) {
        if (!job.dateApplied) return false;
        
        const jobDateStr = typeof job.dateApplied === 'string' 
          ? job.dateApplied.substring(0, 10) 
          : new Date(job.dateApplied).toISOString().substring(0, 10);
        
        if (filterDateFrom && jobDateStr < filterDateFrom) return false;
        if (filterDateTo && jobDateStr > filterDateTo) return false;
      }

      return true;
    });
  }, [jobs, searchQuery, filterDateFrom, filterDateTo, filterSource, filterAppliedVia, filterWorkSetup, filterStatuses]);

  const openAddModal = () => {
    setEditingJob(null);
    setIsModalOpen(true);
  };

  const openEditModal = (job: Job) => {
    setEditingJob(job);
    setIsModalOpen(true);
  };

  const handleBulkDelete = async () => {
    if (selectedJobIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedJobIds.size} job(s)?`)) return;

    const ids = Array.from(selectedJobIds);
    const success = await deleteJobs(ids);
    if (success) {
      setSelectedJobIds(new Set());
      toast({ title: "Deleted", description: `${ids.length} job(s) deleted.` });
    } else {
      toast({ title: "Error", description: "Failed to delete jobs.", variant: "destructive" });
    }
  };

  const executeDelete = async () => {
    if (!jobToDelete) return;
    const success = await deleteJobs([jobToDelete]);
    if (success) {
      toast({ title: "Deleted", description: "Job deleted." });
    } else {
      toast({ title: "Error", description: "Failed to delete job", variant: "destructive" });
    }
    setJobToDelete(null);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedJobIds(new Set(filteredJobs.map(j => j.id)));
    else setSelectedJobIds(new Set());
  };

  const handleSelectRow = (jobId: string, checked: boolean) => {
    const newSet = new Set(selectedJobIds);
    if (checked) newSet.add(jobId);
    else newSet.delete(jobId);
    setSelectedJobIds(newSet);
  };

  const handleTailor = async (job: Job) => {
    setTailorModalJob(job);
    setLoadingResumes(true);
    try {
      const data = await supabaseApi.getResumes(user!.id);
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
      const original = await supabaseApi.getResumeById(resumeId, user!.id);
      if (!original) throw new Error("Resume not found");

      // 2. Duplicate it
      const duplicate: Resume = {
        ...original,
        id: 'new',
        title: `${tailorModalJob.position} ${new Date().getFullYear()} - ${tailorModalJob.company}`,
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

  const handleInlineEdit = async (jobId: string, field: string, value: string | undefined) => {
    const success = await updateJob(jobId, { [field]: value });
    if (success) {
      toast({ title: "Updated", description: "Job updated successfully." });
    } else {
      toast({ title: "Error", description: "Failed to update job.", variant: "destructive" });
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

  if (!isMounted) return null;
  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center">Loading jobs...</div>;
  }

  return (
    <div className="flex-1 p-8 md:p-12 bg-muted/10 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Job Applications</h1>
            <p className="text-muted-foreground mt-1">Manage your applications and tailor your CV for each role.</p>
          </div>
          <div className="flex gap-3 items-center">
            {selectedJobIds.size > 0 && (
              <Button 
                variant="destructive" 
                onClick={handleBulkDelete}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected ({selectedJobIds.size})
              </Button>
            )}
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

        {/* Filter Bar */}
        <div className="bg-white border rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search by position, company, location or salary..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="flex items-center gap-2">
            {(searchQuery || filterDateFrom || filterDateTo || filterSource || filterAppliedVia || filterWorkSetup || filterStatuses.length > 0) && (
              <Button 
                variant="ghost" 
                title="Clear Filters"
                className="hover:bg-red-50 hover:text-red-600 text-muted-foreground hidden sm:flex"
                onClick={() => {
                  setSearchQuery("");
                  setFilterDateFrom("");
                  setFilterDateTo("");
                  setFilterSource("");
                  setFilterAppliedVia("");
                  setFilterWorkSetup("");
                  setFilterStatuses([]);
                }}
              >
                <X className="w-4 h-4 mr-1" /> Clear
              </Button>
            )}
            
            <Popover>
              <PopoverTrigger render={<Button variant="outline" className="gap-2 relative" />}>
                <Filter className="w-4 h-4" /> 
                Filters
                {(filterDateFrom || filterDateTo || filterSource || filterAppliedVia || filterWorkSetup || filterStatuses.length > 0) && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
                )}
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-4 space-y-4 max-h-[85vh] overflow-y-auto">
                <div className="space-y-1.5 border-b pb-3">
                  <h4 className="font-semibold text-sm">Filter Jobs</h4>
                  <p className="text-xs text-muted-foreground">Narrow down your applications</p>
                </div>

                

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Status</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {JOB_STATUSES.map(status => (
                      <label key={status} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 p-1.5 rounded-md -ml-1.5 transition-colors">
                        <input 
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                          checked={filterStatuses.includes(status)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilterStatuses(prev => [...prev, status]);
                            } else {
                              setFilterStatuses(prev => prev.filter(s => s !== status));
                            }
                          }}
                        />
                        <span className="capitalize">{status}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Date Applied</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">From</span>
                      <div>
                        <InlineDatePicker 
                          date={filterDateFrom} 
                          onSelect={setFilterDateFrom} 
                          className="w-full border-input border h-9 font-normal bg-white hover:bg-muted/50" 
                          placeholder="Pick date"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">To</span>
                      <div>
                        <InlineDatePicker 
                          date={filterDateTo} 
                          onSelect={setFilterDateTo} 
                          className="w-full border-input border h-9 font-normal bg-white hover:bg-muted/50" 
                          placeholder="Pick date"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Job Source</label>
                  <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="w-full text-sm border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary/50 bg-white">
                    <option value="">Any Source</option>
                    {JOB_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Applied Via</label>
                  <select value={filterAppliedVia} onChange={e => setFilterAppliedVia(e.target.value)} className="w-full text-sm border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary/50 bg-white">
                    <option value="">Any Application Method</option>
                    {JOB_APPLIED_VIA.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Work Setup</label>
                  <select value={filterWorkSetup} onChange={e => setFilterWorkSetup(e.target.value)} className="w-full text-sm border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary/50 bg-white">
                    <option value="">Any Setup</option>
                    {JOB_WORK_SETUPS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground">Loading jobs...</div>
        ) : (
          <div className="border rounded-md bg-white shadow-sm overflow-x-auto w-full">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b whitespace-nowrap">
                <tr>
                  <th className="px-6 py-4 font-medium w-12">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      checked={filteredJobs.length > 0 && selectedJobIds.size === filteredJobs.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th className="px-6 py-4 font-medium">Position</th>
                  <th className="px-6 py-4 font-medium">Company</th>
                  <th className="px-6 py-4 font-medium">Location</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Date Applied</th>
                  <th className="px-4 py-4 font-medium min-w-32">Source</th>
                  <th className="px-4 py-4 font-medium min-w-32">Applied Via</th>
                  <th className="px-4 py-4 font-medium min-w-32">Salary Range</th>
                  <th className="px-4 py-4 font-medium min-w-28">Work Setup</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-8 text-center text-muted-foreground">
                      No job applications found. Click &quot;+ Add Job&quot; to get started!
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job) => {
                    const isGhosted = job.status.toLowerCase() === 'applied' && job.dateApplied && (new Date().getTime() - new Date(job.dateApplied).getTime()) / (1000 * 3600 * 24) >= 14;
                    return (
                    <React.Fragment key={job.id}>
                      <tr className={cn("border-b last:border-0 hover:bg-muted/30 transition-colors align-middle", isGhosted && "bg-red-50/70 hover:bg-red-100/70")}>
                        <td className="px-6 py-2">
                          <input 
                            type="checkbox"
                            className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                            checked={selectedJobIds.has(job.id)}
                            onChange={(e) => handleSelectRow(job.id, e.target.checked)}
                          />
                        </td>
                        <td className="px-4 py-2 font-medium text-primary">
                          <EditableText
                            value={job.position}
                            onSave={(val) => handleInlineEdit(job.id, 'position', val)}
                            multiline
                            className="w-max max-w-[300px] text-primary font-medium"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <EditableText
                            value={job.company}
                            onSave={(val) => handleInlineEdit(job.id, 'company', val)}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <EditableText
                            value={job.location || ""}
                            onSave={(val) => handleInlineEdit(job.id, 'location', val)}
                            className="empty:before:content-['-'] empty:before:text-muted-foreground"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <InlineStatusPicker 
                            status={job.status} 
                            onSelect={(val) => handleInlineEdit(job.id, 'status', val)} 
                          />
                        </td>
                        <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                          <InlineDatePicker 
                            date={job.dateApplied} 
                            onSelect={(newDate) => handleInlineEdit(job.id, 'dateApplied', newDate)} 
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select 
                            className="bg-transparent border border-transparent hover:border-input focus:border-input rounded px-2 py-1 h-8 text-sm cursor-pointer"
                            value={job.source || ""}
                            onChange={(e) => handleInlineEdit(job.id, 'source', e.target.value)}
                          >
                            <option value="">-</option>
                            {JOB_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <select 
                            className="bg-transparent border border-transparent hover:border-input focus:border-input rounded px-2 py-1 h-8 text-sm cursor-pointer"
                            value={job.appliedVia || ""}
                            onChange={(e) => handleInlineEdit(job.id, 'appliedVia', e.target.value)}
                          >
                            <option value="">-</option>
                            {JOB_APPLIED_VIA.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <EditableText
                            value={formatSalaryString(job.salaryRange || "")}
                            onSave={(val) => handleInlineEdit(job.id, 'salaryRange', formatSalaryString(val))}
                            className="empty:before:content-['-'] empty:before:text-muted-foreground"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select 
                            className="bg-transparent border border-transparent hover:border-input focus:border-input rounded px-2 py-1 h-8 text-sm cursor-pointer"
                            value={job.workSetup || ""}
                            onChange={(e) => handleInlineEdit(job.id, 'workSetup', e.target.value)}
                          >
                            <option value="">-</option>
                            {JOB_WORK_SETUPS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2 items-center transition-colors">
                          {job.link && (
                            <a href={job.link} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-8 px-2 text-blue-600")}>
                              <ExternalLink className="w-3 h-3 mr-1" />
                              View Posting
                            </a>
                          )}
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => toggleExpand(job.id)}>
                            {expandedJobs.has(job.id) ? "▲" : "▼"}
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 text-xs font-semibold" onClick={() => handleTailor(job)} disabled={!job.description}>
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
                          <td colSpan={11} className="px-6 py-6">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Job Description</h4>
                            <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/80 max-w-4xl">
                              {job.description || <span className="italic text-muted-foreground">No description provided.</span>}
                            </p>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )})
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
        onSaved={() => user?.id && fetchJobs(user.id)}
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
