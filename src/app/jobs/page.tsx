"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, ExternalLink, Calendar as CalendarIcon, ChevronUp, ChevronRight, TrendingUp, TrendingDown, Briefcase, BarChart3, Search, X, Filter, Paperclip } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { supabaseApi } from "@/lib/supabase-api";
import { useResumeStore } from "@/store/useResumeStore";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Resume } from "@/types/resume";
import { AddJobModal } from "@/components/AddJobModal";
import { Job, JOB_SOURCES, JOB_APPLIED_VIA, JOB_WORK_SETUPS } from "@/types/job";
import { useJobStore } from "@/store/useJobStore";
const JOB_STATUSES = ['saved', 'applied', 'assessment', 'interviewing', 'offered', 'rejected', 'withdrawn', 'closed'];
import { cn, formatSalaryString } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PopoverSelect } from "@/components/ui/popover-select";
import { InlineDatePicker, InlineStatusPicker, EditableText } from "@/components/ui/inline-editors";
import { useRequireUser } from "@/hooks/useRequireUser";
import { useDebounce } from "@/hooks/useDebounce";
export default function JobsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { setTailoringJob } = useResumeStore();
  const user = useRequireUser();

  const { jobs, fetchJobs, updateJob, deleteJobs, archiveJobs, isLoading } = useJobStore();
  const [isMounted, setIsMounted] = useState(false);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);

  const [tailorModalJob, setTailorModalJob] = useState<Job | null>(null);
  const [recentResumes, setRecentResumes] = useState<Resume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(false);

  // Dashboard State
  const [isDashboardOpen, setIsDashboardOpen] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Bulk Selection State
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 800);
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
    
    // For Month calculations (Calendar Month)
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = lastMonthDate.getMonth();
    const lastMonthYear = lastMonthDate.getFullYear();

    // For Day/Week calculations (Rolling)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const yesterdayStart = startOfToday - oneDayMs;
    const yesterdayEnd = startOfToday - 1;
    const thisWeekStart = startOfToday - (6 * oneDayMs);
    const lastWeekStart = thisWeekStart - (7 * oneDayMs);
    const lastWeekEnd = thisWeekStart - 1;

    let appliedCount = 0;
    let inProgressCount = 0;
    let offerCount = 0;
    let closedCount = 0;

    let archivedApplied = 0;
    let archivedInProgress = 0;
    let archivedOffer = 0;
    let archivedClosed = 0;

    let currentMonthApplied = 0;
    let lastMonthApplied = 0;
    let todayApplied = 0;
    let yesterdayApplied = 0;
    let thisWeekApplied = 0;
    let lastWeekApplied = 0;

    jobs.forEach(job => {
      if (job.status === 'applied') { appliedCount++; if (job.isArchived) archivedApplied++; }
      else if (job.status === 'assessment' || job.status === 'interviewing') { inProgressCount++; if (job.isArchived) archivedInProgress++; }
      else if (job.status === 'offered') { offerCount++; if (job.isArchived) archivedOffer++; }
      else if (job.status === 'rejected' || job.status === 'withdrawn' || job.status === 'closed') { closedCount++; if (job.isArchived) archivedClosed++; }

      if (job.status !== 'saved' && job.dateApplied) {
        const jobDate = new Date(job.dateApplied);
        const y = jobDate.getFullYear();
        const m = jobDate.getMonth();

        // Month tracking
        if (y === currentYear && m === currentMonth) {
          currentMonthApplied++;
        } else if (y === lastMonthYear && m === lastMonth) {
          lastMonthApplied++;
        }

        // Day tracking
        const jobMs = jobDate.getTime();
        if (jobMs >= startOfToday) {
          todayApplied++;
        } else if (jobMs >= yesterdayStart && jobMs <= yesterdayEnd) {
          yesterdayApplied++;
        }

        // Week tracking
        if (jobMs >= thisWeekStart) {
          thisWeekApplied++;
        } else if (jobMs >= lastWeekStart && jobMs <= lastWeekEnd) {
          lastWeekApplied++;
        }
      }
    });

    const calculateGrowth = (current: number, previous: number) => {
      if (previous > 0) return Math.round(((current - previous) / previous) * 100);
      if (current > 0) return 100;
      return 0;
    };

    const momGrowth = calculateGrowth(currentMonthApplied, lastMonthApplied);
    const wowGrowth = calculateGrowth(thisWeekApplied, lastWeekApplied);
    const dodGrowth = calculateGrowth(todayApplied, yesterdayApplied);

    return {
      appliedCount,
      inProgressCount,
      offerCount,
      closedCount,
      archivedApplied,
      archivedInProgress,
      archivedOffer,
      archivedClosed,
      currentMonthApplied,
      lastMonthApplied,
      momGrowth,
      wowGrowth,
      dodGrowth,
      todayApplied,
      yesterdayApplied,
      thisWeekApplied,
      lastWeekApplied,
      totalActive: appliedCount + inProgressCount
    };
  }, [jobs]);

  const filteredJobs = React.useMemo(() => {
    return jobs.filter((job) => {
      // Archive Filter
      if ((job.isArchived || false) !== showArchived) return false;

      // Search Box Match
      const sq = debouncedSearchQuery.toLowerCase();
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
        
        const jobDate = new Date(job.dateApplied);
        const jobDateStr = `${jobDate.getFullYear()}-${(jobDate.getMonth() + 1).toString().padStart(2, '0')}-${jobDate.getDate().toString().padStart(2, '0')}`;
        
        if (filterDateFrom && jobDateStr < filterDateFrom) return false;
        if (filterDateTo && jobDateStr > filterDateTo) return false;
      }

      return true;
    });
  }, [jobs, debouncedSearchQuery, filterDateFrom, filterDateTo, filterSource, filterAppliedVia, filterWorkSetup, filterStatuses, showArchived]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, filterDateFrom, filterDateTo, filterSource, filterAppliedVia, filterWorkSetup, filterStatuses, showArchived]);

  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const paginatedJobs = filteredJobs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const openAddModal = () => {
    setEditingJob(null);
    setIsModalOpen(true);
  };

  const openEditModal = (job: Job) => {
    setEditingJob(job);
    setIsModalOpen(true);
  };

  const handleViewCV = async (cvPath: string) => {
    try {
      const url = await supabaseApi.getCVSignedUrl(cvPath);
      if (url) {
        window.open(url, '_blank');
      } else {
        toast({ title: "Error", description: "Failed to open CV. It might have been deleted.", variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    }
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

  const handleBulkArchiveToggle = async () => {
    if (selectedJobIds.size === 0) return;
    const ids = Array.from(selectedJobIds);
    const success = await archiveJobs(ids, !showArchived);
    if (success) {
      setSelectedJobIds(new Set());
      toast({ title: showArchived ? "Unarchived" : "Archived", description: `${ids.length} job(s) ${showArchived ? 'unarchived' : 'archived'}.` });
    } else {
      toast({ title: "Error", description: "Failed to update jobs.", variant: "destructive" });
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

  const renderGrowthBadge = (growth: number) => {
    if (growth > 0) {
      return (
        <div className="bg-emerald-100 text-emerald-700 flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-sm">
          <TrendingUp className="w-4 h-4" /> <span>+{growth}%</span>
        </div>
      );
    } else if (growth < 0) {
      return (
        <div className="bg-red-100 text-red-700 flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-sm">
          <TrendingDown className="w-4 h-4" /> <span>{growth}%</span>
        </div>
      );
    }
    return (
      <div className="bg-slate-100 text-slate-700 flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-sm">
        <span className="w-4 h-4 flex items-center justify-center">-</span> <span>0%</span>
      </div>
    );
  };

  return (
    <div className="flex-1 p-8 md:p-12 bg-muted/10 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Job Applications</h1>
            <p className="text-muted-foreground mt-1">Manage your applications and tailor your CV for each role.</p>
          </div>
          <div className="flex gap-3 items-center">
            {selectedJobIds.size > 0 && (
              <Popover>
                <PopoverTrigger render={<Button variant="outline" className="gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200" />}>
                  Bulk Actions ({selectedJobIds.size})
                </PopoverTrigger>
                <PopoverContent align="start" className="w-48 p-2">
                  <div className="flex flex-col gap-1">
                    <Button 
                      variant="ghost" 
                      onClick={handleBulkArchiveToggle}
                      className="justify-start gap-2 text-slate-700"
                    >
                      {showArchived ? "Unarchive Selected" : "Archive Selected"}
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={handleBulkDelete}
                      className="justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Selected
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <Button variant="outline" onClick={() => setIsDashboardOpen(!isDashboardOpen)}>
              {isDashboardOpen ? <><ChevronUp className="w-4 h-4 mr-2" /> Hide Dashboard</> : <><BarChart3 className="w-4 h-4 mr-2" /> Show Dashboard</>}
            </Button>
            <Button onClick={openAddModal}>+ Add Job</Button>
          </div>
        </div>

        {/* Dashboard Section */}
        <div 
          className={cn(
            "grid transition-all duration-300 ease-in-out",
            isDashboardOpen ? "grid-rows-[1fr] opacity-100 mb-6" : "grid-rows-[0fr] opacity-0 mb-0"
          )}
        >
          <div className="overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-1">
              
              {/* Status Card */}
            <div className="bg-white border rounded-xl p-5 shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-blue-500" /> Pipeline Status
                  </h3>
                </div>
                <div className="text-slate-500 text-sm mt-1 mb-4">Summary of total jobs in each category</div>
              </div>
              <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                <div title={`${metrics.archivedApplied} archived`} className="cursor-help">
                  <div className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">Applied</div>
                  <div className="text-2xl font-bold text-blue-600">{metrics.appliedCount}</div>
                </div>
                <div title={`${metrics.archivedInProgress} archived`} className="cursor-help">
                  <div className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">In Progress</div>
                  <div className="text-2xl font-bold text-purple-600">{metrics.inProgressCount}</div>
                </div>
                <div title={`${metrics.archivedOffer} archived`} className="cursor-help">
                  <div className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">Offer</div>
                  <div className="text-2xl font-bold text-emerald-600">{metrics.offerCount}</div>
                </div>
                <div title={`${metrics.archivedClosed} archived`} className="cursor-help">
                  <div className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">Closed</div>
                  <div className="text-2xl font-bold text-slate-700">{metrics.closedCount}</div>
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
                <span className="text-5xl font-black text-slate-800">{metrics.currentMonthApplied}</span>
                <span className="text-xl text-slate-500 font-medium">jobs</span>
              </div>
            </div>

            {/* Comprehensive Momentum Card */}
            <div className="bg-white border rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-orange-500" /> Momentum Activity
                  </h3>
                </div>
                <div className="text-slate-500 text-sm mt-1 mb-4">Compared to previous periods</div>
              </div>
              <div className="flex flex-col gap-3 mt-auto">
                <div className="flex items-center gap-3">
                  {renderGrowthBadge(metrics.dodGrowth)}
                  <span className="text-sm font-medium text-slate-500">day-over-day (yesterday)</span>
                </div>
                <div className="flex items-center gap-3">
                  {renderGrowthBadge(metrics.wowGrowth)}
                  <span className="text-sm font-medium text-slate-500">week-over-week</span>
                </div>
                <div className="flex items-center gap-3">
                  {renderGrowthBadge(metrics.momGrowth)}
                  <span className="text-sm font-medium text-slate-500">month-over-month</span>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white border rounded-xl p-4 shadow-sm flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search by position, company, location or salary..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="flex bg-slate-100 rounded-lg p-1 border items-center">
            <button 
              onClick={() => { setShowArchived(false); setSelectedJobIds(new Set()); }}
              className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-all", !showArchived ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Active
            </button>
            <button 
              onClick={() => { setShowArchived(true); setSelectedJobIds(new Set()); }}
              className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-all", showArchived ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Archived
            </button>
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
            
            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <PopoverTrigger render={<Button variant="outline" className="gap-2 relative h-10" />}>
                <Filter className="w-4 h-4" /> 
                Filters
                {(filterDateFrom || filterDateTo || filterSource || filterAppliedVia || filterWorkSetup || filterStatuses.length > 0) && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
                )}
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-4 space-y-4 max-h-[85vh] overflow-y-auto">
                <div className="flex justify-between items-start border-b pb-3">
                  <div className="space-y-1.5">
                    <h4 className="font-semibold text-sm">Filter Jobs</h4>
                    <p className="text-xs text-muted-foreground">Narrow down your applications</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-1" onClick={() => setIsFilterOpen(false)}>
                    <X className="w-4 h-4 text-slate-500" />
                  </Button>
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
                  <PopoverSelect 
                    value={filterSource} 
                    onValueChange={setFilterSource} 
                    options={[{ label: "Any Source", value: "" }, ...JOB_SOURCES.map(s => ({ label: s, value: s }))]} 
                    placeholder="Any Source" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Applied Via</label>
                  <PopoverSelect 
                    value={filterAppliedVia} 
                    onValueChange={setFilterAppliedVia} 
                    options={[{ label: "Any Method", value: "" }, ...JOB_APPLIED_VIA.map(s => ({ label: s, value: s }))]} 
                    placeholder="Any Method" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Work Setup</label>
                  <PopoverSelect 
                    value={filterWorkSetup} 
                    onValueChange={setFilterWorkSetup} 
                    options={[{ label: "Any Setup", value: "" }, ...JOB_WORK_SETUPS.map(s => ({ label: s, value: s }))]} 
                    placeholder="Any Setup" 
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground">Loading jobs...</div>
        ) : (
          <div className="border rounded-md bg-white shadow-sm w-full">
            <div className="overflow-x-auto w-full">
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
                {paginatedJobs.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-8 text-center text-muted-foreground">
                      No job applications found. Click &quot;+ Add Job&quot; to get started!
                    </td>
                  </tr>
                ) : (
                  paginatedJobs.map((job) => {
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
                          <div className="flex items-center gap-1.5">
                            <button 
                              onClick={() => toggleExpand(job.id)}
                              className="text-muted-foreground hover:text-slate-700 transition-transform flex-shrink-0"
                              style={{ transform: expandedJobs.has(job.id) ? 'rotate(90deg)' : 'rotate(0deg)' }}
                              title="Toggle Job Description"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            <EditableText
                              value={job.position}
                              onSave={(val) => handleInlineEdit(job.id, 'position', val)}
                              multiline
                              className="w-max max-w-[280px] text-primary font-medium"
                            />
                            {job.cvUrl && (
                              <button 
                                onClick={() => handleViewCV(job.cvUrl!)} 
                                title="View CV PDF"
                                className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                              >
                                <Paperclip className="w-4 h-4" />
                              </button>
                            )}
                          </div>
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
                          <PopoverSelect 
                            value={job.source || ""} 
                            onValueChange={(val) => handleInlineEdit(job.id, 'source', val)} 
                            options={[{ label: "-", value: "" }, ...JOB_SOURCES.map(s => ({ label: s, value: s }))]} 
                            placeholder="-" 
                            className="h-8 bg-transparent border-transparent hover:border-input focus:border-input w-[120px] px-2 shadow-none"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <PopoverSelect 
                            value={job.appliedVia || ""} 
                            onValueChange={(val) => handleInlineEdit(job.id, 'appliedVia', val)} 
                            options={[{ label: "-", value: "" }, ...JOB_APPLIED_VIA.map(s => ({ label: s, value: s }))]} 
                            placeholder="-" 
                            className="h-8 bg-transparent border-transparent hover:border-input focus:border-input w-[130px] px-2 shadow-none"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <EditableText
                            value={formatSalaryString(job.salaryRange || "")}
                            onSave={(val) => handleInlineEdit(job.id, 'salaryRange', formatSalaryString(val))}
                            className="empty:before:content-['-'] empty:before:text-muted-foreground"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <PopoverSelect 
                            value={job.workSetup || ""} 
                            onValueChange={(val) => handleInlineEdit(job.id, 'workSetup', val)} 
                            options={[{ label: "-", value: "" }, ...JOB_WORK_SETUPS.map(s => ({ label: s, value: s }))]} 
                            placeholder="-" 
                            className="h-8 bg-transparent border-transparent hover:border-input focus:border-input w-[100px] px-2 shadow-none"
                          />
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2 items-center transition-colors">
                          {job.link && (
                            <a href={job.link} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-8 px-2 text-blue-600")}>
                              <ExternalLink className="w-3 h-3 mr-1" />
                              View Posting
                            </a>
                          )}
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
            
            {/* Pagination Controls */}
            {filteredJobs.length > 0 && (
              <div className="flex items-center justify-between px-6 py-3 border-t bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground hidden md:inline">
                    Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredJobs.length)} to {Math.min(currentPage * itemsPerPage, filteredJobs.length)} of {filteredJobs.length} entries
                  </span>
                  <Popover>
                    <PopoverTrigger render={
                      <Button variant="outline" size="sm" className="ml-0 md:ml-4 h-8 px-2 gap-2 text-sm text-slate-700 bg-white shadow-sm hover:bg-slate-50" />
                    }>
                      {itemsPerPage} / page
                      <ChevronUp className="w-3 h-3 rotate-180 opacity-50" />
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-[120px] p-1">
                      <div className="flex flex-col space-y-0.5">
                        {[10, 25, 50, 100].map(n => (
                          <button
                            key={n}
                            className={cn(
                              "text-left px-2 py-1.5 text-sm rounded-md transition-colors hover:bg-slate-100",
                              itemsPerPage === n ? "bg-slate-100 font-semibold text-slate-900" : "text-slate-600"
                            )}
                            onClick={() => {
                              setItemsPerPage(n);
                              setCurrentPage(1);
                            }}
                          >
                            {n} / page
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="text-sm font-medium mx-2 hidden sm:block">Page {currentPage} of {Math.max(1, totalPages)}</div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages || totalPages === 0}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
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
