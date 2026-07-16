"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabaseApi } from "@/lib/supabase-api";
import { createPortal } from "react-dom";
import { useJobStore } from "@/store/useJobStore";
import { useAuthStore } from "@/store/useAuthStore";

import { Job, JobSource, JobAppliedVia, JobWorkSetup, JOB_SOURCES, JOB_APPLIED_VIA, JOB_WORK_SETUPS } from "@/types/job";

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job?: Job | null; // If null, it's add mode
  onSaved: () => void;
}

export function AddJobModal({ isOpen, onClose, job, onSaved }: AddJobModalProps) {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    company: "",
    position: "",
    location: "",
    status: "saved",
    link: "",
    dateApplied: null as Date | null,
    description: "",
    source: "" as JobSource | "",
    appliedVia: "" as JobAppliedVia | "",
    salaryRange: "",
    workSetup: "" as JobWorkSetup | ""
  });

  const [existingCompanies, setExistingCompanies] = useState<string[]>([]);
  const [isCompanyFocused, setIsCompanyFocused] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (job) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFormData({
          company: job.company,
          position: job.position,
          location: job.location,
          status: job.status,
          link: job.link || "",
          dateApplied: job.dateApplied ? new Date(job.dateApplied) : null,
          description: job.description || "",
          source: job.source || "",
          appliedVia: job.appliedVia || "",
          salaryRange: job.salaryRange || "",
          workSetup: job.workSetup || ""
        });
      } else {
        setFormData({
          company: "",
          position: "",
          location: "",
          status: "saved",
          link: "",
          dateApplied: null,
          description: "",
          source: "",
          appliedVia: "",
          salaryRange: "",
          workSetup: ""
        });
      }
      
      // Fetch existing companies for autocomplete
      if (user?.id) {
        supabaseApi.getJobs(user.id).then(jobs => {
          const companies = Array.from(new Set(jobs.map(j => j.company).filter(Boolean)));
          setExistingCompanies(companies);
        }).catch(console.error);
      }
    }
  }, [isOpen, job]);

  const handleSave = async () => {
    if (!formData.company || !formData.position) {
      toast({
        title: "Validation Error",
        description: "Company and Position are required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const { dateApplied, ...restFormData } = formData;
      const jobToSave = {
        id: job ? job.id : `temp-${Date.now()}`,
        userId: user?.id || "local-user",
        dateAdded: job ? job.dateAdded : new Date().toISOString(),
        dateApplied: dateApplied ? dateApplied.toISOString() : undefined,
        ...restFormData,
        source: restFormData.source === "" ? undefined : restFormData.source as JobSource,
        appliedVia: restFormData.appliedVia === "" ? undefined : restFormData.appliedVia as JobAppliedVia,
        workSetup: restFormData.workSetup === "" ? undefined : restFormData.workSetup as JobWorkSetup,
      };
      
      const jobStore = useJobStore.getState();
      if (job) {
        await jobStore.updateJob(job.id, jobToSave);
      } else {
        await jobStore.addJob(jobToSave);
      }
      
      toast({
        title: "Success",
        description: job ? "Job application updated!" : "New job application tracked!"
      });
      
      onSaved();
      onClose();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to save job application",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center">
      <div className="bg-background rounded-lg shadow-xl w-[500px] max-w-full overflow-hidden flex flex-col mx-4 animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b flex justify-between items-center bg-muted/30">
          <h2 className="font-semibold text-lg">{job ? "Edit Job" : "Add Job"}</h2>
          <button onClick={onClose} disabled={isSaving} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Company</label>
              <div className="relative">
                <input 
                  type="text" className="w-full h-9 rounded-md border bg-white px-3 text-sm"
                  value={formData.company || ""} onChange={e => {
                    setFormData({...formData, company: e.target.value});
                    setIsCompanyFocused(true);
                  }}
                  onFocus={() => setIsCompanyFocused(true)}
                  onBlur={() => setIsCompanyFocused(false)}
                  autoComplete="off"
                />
                {isCompanyFocused && existingCompanies.filter(c => c.toLowerCase().includes(formData.company.toLowerCase()) && c !== formData.company).length > 0 && (
                  <div className="absolute top-full left-0 mt-1 z-50 flex w-full max-h-48 overflow-y-auto flex-col rounded-lg bg-popover p-1 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 animate-in fade-in-0 zoom-in-95 duration-100">
                    {existingCompanies.filter(c => c.toLowerCase().includes(formData.company.toLowerCase()) && c !== formData.company).map(c => (
                      <div 
                        key={c}
                        className="px-2 py-1.5 text-sm rounded-md hover:bg-muted cursor-pointer transition-colors even:bg-muted/100"
                        onMouseDown={(e) => {
                          e.preventDefault(); // Prevents the input from losing focus
                          setFormData({...formData, company: c});
                          setIsCompanyFocused(false);
                        }}
                      >
                        {c}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Position</label>
              <input 
                type="text" className="w-full h-9 rounded-md border bg-white px-3 text-sm"
                value={formData.position || ""} onChange={e => setFormData({...formData, position: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Location</label>
              <input 
                type="text" className="w-full h-9 rounded-md border bg-white px-3 text-sm"
                value={formData.location || ""} onChange={e => setFormData({...formData, location: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Status</label>
              <select 
                className="w-full h-9 rounded-md border bg-white px-3 text-sm"
                value={formData.status || "saved"} onChange={e => setFormData({...formData, status: e.target.value})}
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
                type="url" className="w-full h-9 rounded-md border bg-white px-3 text-sm"
                placeholder="https://..."
                value={formData.link || ""} onChange={e => setFormData({...formData, link: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Date Applied</label>
              <div>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger render={
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full h-9 justify-start text-left font-normal px-3 flex items-center bg-white",
                        !formData.dateApplied && "text-muted-foreground"
                      )}
                    />
                  }>
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate flex-1">{formData.dateApplied ? format(formData.dateApplied, "PPP") : "Pick a date"}</span>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[10001]" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.dateApplied || undefined}
                      disabled={(date) => date > new Date()}
                      onSelect={(date) => {
                        if (date) {
                          setFormData({...formData, dateApplied: date});
                        }
                        setIsCalendarOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Source</label>
              <select 
                className="w-full h-9 rounded-md border bg-white px-3 text-sm"
                value={formData.source || ""} onChange={e => setFormData({...formData, source: e.target.value as JobSource})}
              >
                <option value="">Select source...</option>
                {JOB_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Applied Via</label>
              <select 
                className="w-full h-9 rounded-md border bg-white px-3 text-sm"
                value={formData.appliedVia || ""} onChange={e => setFormData({...formData, appliedVia: e.target.value as JobAppliedVia})}
              >
                <option value="">Select application method...</option>
                {JOB_APPLIED_VIA.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Salary Range</label>
              <input 
                type="text" className="w-full h-9 rounded-md border bg-white px-3 text-sm"
                placeholder="e.g. 5,000,000 - 7,000,000"
                value={formData.salaryRange || ""} onChange={e => setFormData({...formData, salaryRange: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Work Setup</label>
              <select 
                className="w-full h-9 rounded-md border bg-white px-3 text-sm"
                value={formData.workSetup || ""} onChange={e => setFormData({...formData, workSetup: e.target.value as JobWorkSetup})}
              >
                <option value="">Select work setup...</option>
                {JOB_WORK_SETUPS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Job Description</label>
            <textarea 
              className="w-full h-32 rounded-md border bg-white p-3 text-sm resize-none"
              placeholder="Paste the job description here for the AI to tailor against..."
              value={formData.description || ""} onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>
        </div>

        <div className="p-4 border-t bg-muted/30 flex justify-end gap-2 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Job'}</Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
