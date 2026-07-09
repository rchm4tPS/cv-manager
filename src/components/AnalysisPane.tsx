"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useResumeStore } from "@/store/useResumeStore";
import { Loader2, ChevronRight, ArrowLeft, Target, CheckCircle2, Lightbulb, CheckSquare, Eye, ArrowRight, ChevronLeft, Sparkles, Check, X, Briefcase, GraduationCap, FolderDot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TailorJobModal } from "./TailorJobModal";
import { useRouter } from "next/navigation";
import { supabaseApi } from "@/lib/supabase-api";
import { useJobStore } from "@/store/useJobStore";

export function AnalysisPane() {
  const { 
    resume, 
    analysisResult, 
    setAnalysisResult, 
    analysisMode, 
    setAnalysisMode,
    activeAnalysisStep,
    setActiveAnalysisStep,
    setIsChatOpen,
    editorSuggestions,
    setEditorSuggestions,
    analysisCooldownUntil,
    setPendingAiMessage,
    setActiveSuggestionIdForChat,
    tailoringJob,
    removeSuggestionDecision
  } = useResumeStore();
  const { toast } = useToast();
  const [analyzing, setAnalyzing] = useState(false);
  const [now, setNow] = useState(0);
  const [isTailorModalOpen, setIsTailorModalOpen] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const router = useRouter();
  
  const { jobs, fetchJobs } = useJobStore();

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const currentTailoringJob = tailoringJob ? {
    ...tailoringJob,
    ...(jobs.find(j => j.id === tailoringJob.id) || {})
  } : null;

  // Update timer for cooldown every second
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isCooldownActive = analysisCooldownUntil ? now < analysisCooldownUntil : false;
  const cooldownRemaining = analysisCooldownUntil ? Math.ceil((analysisCooldownUntil - now) / 1000) : 0;
  const hasPendingSuggestions = editorSuggestions.some(s => s.status === 'pending');
  const hasMinimalData = !!(resume.personalInfo.name?.trim()) &&
    resume.sections.some(s => s.type === 'summary' && s.items.length > 0) &&
    resume.sections.some(s => (s.type === 'experience' || s.type === 'projects') && s.items.length > 0);
  const analyzeDisabled = analyzing || isCooldownActive || !hasMinimalData;

  const isPerfect = !!(analysisResult && analysisResult.steps.every(s => s.recommendations.length === 0));
  const isFullyTailored = !!(currentTailoringJob && isPerfect);
  const isFullyOptimized = !!(!currentTailoringJob && isPerfect);
  const displayScore = isPerfect && analysisResult ? 100 : (analysisResult?.score || 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleTailorToJob = async (job: any) => {
    setIsDuplicating(true);
    try {
      // 1. Create duplicated resume object with id 'new' and tailoringJob attached
      const duplicatedResume = {
        ...resume,
        id: 'new', // Instructs supabaseApi.saveResume to let DB generate new UUID
        title: `${job.position} ${new Date().getFullYear()} - ${job.company}`,
        analysisResult: undefined,
        acceptedSuggestions: undefined,
        rejectedSuggestions: undefined,
        tailoringJob: {
          id: job.id,
          company: job.company,
          position: job.position,
          description: job.description
        }
      };

      // 2. Save to Supabase to get the generated UUID
      const savedResume = await supabaseApi.saveResume(duplicatedResume);
      
      // 3. Close modal and redirect to new editor instance
      setIsTailorModalOpen(false);
      toast({
        title: "CV Tailored Successfully",
        description: "Redirecting to your new tailored CV...",
      });
      router.push(`/editor/${savedResume.id}`);
    } catch (error: unknown) {
      console.error("Failed to tailor CV:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create tailored CV",
        variant: "destructive"
      });
    } finally {
      setIsDuplicating(false);
    }
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/analyze-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, tailoringJob: currentTailoringJob })
      });
      const data = await res.json();
      if (data.success) {
        setAnalysisResult(data.data);
        
        // Parse bulk analysis into actionable suggestions for the EditorPane
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newSuggestions: any[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.data.steps.forEach((step: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          step.recommendations.forEach((rec: any) => {
            const newId = Math.random().toString(36).substring(2, 9);
            rec.suggestionId = newId;
            newSuggestions.push({
              id: newId,
              stepId: step.id,
              targetSection: rec.targetSection || 'global',
              title: rec.title,
              whatToImprove: rec.whatToImprove,
              whyAndHowToFix: rec.whyAndHowToFix,
              status: 'pending'
            });
          });
        });
        setEditorSuggestions(newSuggestions);
        
        setAnalysisMode('overview');
      } else {
        throw new Error(data.error);
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze CV",
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getStepIcon = (id: string) => {
    switch (id) {
      case 'contact': return <Target className="w-5 h-5 text-orange-500" />;
      case 'summary': return <Lightbulb className="w-5 h-5 text-emerald-500" />;
      case 'experience': return <Briefcase className="w-5 h-5 text-blue-500" />;
      case 'projects': return <FolderDot className="w-5 h-5 text-amber-500" />;
      case 'education': return <GraduationCap className="w-5 h-5 text-indigo-500" />;
      case 'skills': return <Sparkles className="w-5 h-5 text-purple-500" />;
      case 'format': return <Eye className="w-5 h-5 text-indigo-500" />;
      case 'keywords': return <Sparkles className="w-5 h-5 text-purple-500" />;
      case 'summary-match': return <Target className="w-5 h-5 text-emerald-500" />;
      case 'experience-match': return <CheckSquare className="w-5 h-5 text-blue-500" />;
      case 'projects-match': return <FolderDot className="w-5 h-5 text-amber-500" />;
      case 'education-match': return <GraduationCap className="w-5 h-5 text-indigo-500" />;
      default: return <Target className="w-5 h-5" />;
    }
  };

  const getStepIconBg = (id: string) => {
    switch (id) {
      case 'contact': return "bg-orange-50";
      case 'summary': return "bg-emerald-50";
      case 'experience': return "bg-blue-50";
      case 'projects': return "bg-amber-50";
      case 'education': return "bg-indigo-50";
      case 'skills': return "bg-purple-50";
      case 'format': return "bg-indigo-50";
      case 'keywords': return "bg-purple-50";
      case 'summary-match': return "bg-emerald-50";
      case 'experience-match': return "bg-blue-50";
      case 'projects-match': return "bg-amber-50";
      case 'education-match': return "bg-indigo-50";
      default: return "bg-slate-50";
    }
  };

  const TailoringBanner = currentTailoringJob ? (
    <div className="bg-blue-50 text-blue-700 text-xs px-3 py-1.5 rounded-full inline-flex font-medium mb-4 border border-blue-100 flex items-center justify-center shrink-0 mx-auto max-w-fit">
      ✨ Tailoring for {currentTailoringJob.position} at {currentTailoringJob.company}
    </div>
  ) : null;

  if (!analysisResult) {
    return (
      <aside className="w-full h-full bg-slate-50/50 p-6 overflow-y-auto flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-2xl border shadow-sm max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lightbulb className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Resume Analysis</h2>
          
          {TailoringBanner}

          <p className="text-sm text-slate-500 mb-8">
            Get an ATS score and actionable AI feedback to improve your CV instantly.
          </p>
          <Button 
            className="w-full h-auto py-4 rounded-xl text-md whitespace-normal" 
            onClick={runAnalysis} 
            disabled={analyzeDisabled}
          >
            {analyzing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            {analyzing 
              ? "Analyzing with AI..." 
              : !hasMinimalData
                ? "Add Profile, Summary & Experience first"
                : hasPendingSuggestions 
                  ? "Review inline suggestions first" 
                  : isCooldownActive 
                    ? `Wait ${cooldownRemaining}s before re-analyzing` 
                    : (currentTailoringJob ? "Analyze for this Job" : "Analyze CV")}
          </Button>
        </div>
      </aside>
    );
  }

  // Detail View
  if (activeAnalysisStep && analysisMode === 'step-detail') {
    const step = analysisResult.steps.find(s => s.id === activeAnalysisStep);
    if (!step) return null;

    const currentIndex = analysisResult.steps.findIndex(s => s.id === activeAnalysisStep);
    const prevStep = currentIndex > 0 ? analysisResult.steps[currentIndex - 1] : null;
    const nextStep = currentIndex < analysisResult.steps.length - 1 ? analysisResult.steps[currentIndex + 1] : null;

    return (
      <aside className="w-full h-full bg-slate-50/50 p-4 md:p-6 flex flex-col overflow-hidden min-h-0 min-w-0">
        
        {TailoringBanner}

        {/* Header Header */}
        <div className="flex items-start md:items-center gap-2 md:gap-4 mb-4 shrink-0 min-w-0">
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-xl w-10 h-10 shrink-0 bg-white hover:bg-slate-50 mt-1 md:mt-0"
            disabled={!prevStep}
            onClick={() => prevStep && setActiveAnalysisStep(prevStep.id)}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <div className="bg-white rounded-2xl border p-3 flex-1 flex flex-col md:flex-row items-start md:items-center shadow-sm min-w-0 gap-3 md:gap-0 min-h-[90px] md:min-h-[90px]">
            <div className="flex items-center shrink-0">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold mr-3 shrink-0">
                {currentIndex + 1}
              </div>
              <div className={`w-8 h-8 rounded-full ${getStepIconBg(step.id)} flex items-center justify-center md:mr-3 shrink-0`}>
                {getStepIcon(step.id)}
              </div>
            </div>
            
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-xs font-semibold text-blue-600 shrink-0 w-full">Step {currentIndex + 1}</div>
                <h3 className="font-semibold text-sm md:text-base leading-tight break-words">{step.title}</h3>
              </div>
            </div>
          </div>

          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-xl w-10 h-10 shrink-0 bg-white hover:bg-slate-50 mt-1 md:mt-0"
            disabled={!nextStep}
            onClick={() => nextStep && setActiveAnalysisStep(nextStep.id)}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Back Button */}
        <div className="flex justify-center mb-4 shrink-0">
          <Button 
            variant="outline" 
            className="bg-white rounded-full text-xs shadow-sm hover:bg-slate-50 transition-colors"
            onClick={() => {
              setActiveAnalysisStep(null);
              setAnalysisMode('overview');
            }}
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-2" />
            Back
          </Button>
        </div>

        {/* Content - SCROLLABLE AREA */}
        <div className="bg-white rounded-3xl border shadow-sm flex-1 flex flex-col overflow-hidden relative min-h-0">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-emerald-400 shrink-0 z-10" />
          
          <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
            <div className="mb-8 mt-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <Target className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-semibold text-slate-800">Overall Assessment</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed break-words whitespace-normal">
                {step.overallAssessment}
              </p>
            </div>

            <div className="mb-8">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="font-semibold text-slate-800">What&apos;s Working Well</h3>
                </div>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full shrink-0">
                  • {step.workingWell.length} Found
                </span>
              </div>
              <div className="space-y-2">
                {step.workingWell.map((good, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 border rounded-xl bg-slate-50/30">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-600 break-words whitespace-normal">{good}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h3 className="font-semibold text-slate-800">Recommendations</h3>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full shrink-0">
                  {step.recommendations.length} for this section
                </span>
              </div>
              
              {step.recommendations.length === 0 ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                  <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-emerald-500 mb-3 shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <p className="text-sm text-emerald-800 font-medium">Nothing to fix here — this section already looks great.</p>
                </div>
              ) : (
                <div className="space-y-4 pb-4">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {step.recommendations.map((rec: any, i: number) => {
                    const status = editorSuggestions.find(s => (rec.suggestionId && s.id === rec.suggestionId) || (s.stepId === step.id && s.title === rec.title))?.status || 'pending';
                    const isDone = status === 'accepted';
                    const isDismissed = status === 'rejected';
                    const isPartial = status === 'partially_accepted';
                    
                    return (
                    <div key={i} className="border border-blue-100 bg-blue-50/30 rounded-2xl p-4 md:p-5 relative group overflow-hidden">
                      {isDone && (
                        <div className="absolute inset-0 bg-green-500/90 z-20 flex items-center justify-center backdrop-blur-[1px]">
                          <Check className="w-20 h-20 text-white drop-shadow-md" strokeWidth={3} />
                        </div>
                      )}
                      {isDismissed && (
                        <div className="absolute inset-0 bg-red-500/90 z-20 flex items-center justify-center backdrop-blur-[1px]">
                          <X className="w-20 h-20 text-white drop-shadow-md" strokeWidth={3} />
                        </div>
                      )}
                      {isPartial && (
                        <div className="absolute inset-0 bg-amber-500/90 z-20 flex items-center justify-center backdrop-blur-[1px]">
                          <div className="flex flex-col items-center">
                            <Check className="w-16 h-16 text-white drop-shadow-md mb-1 opacity-90" strokeWidth={3} />
                            <span className="text-white font-bold tracking-widest drop-shadow-md uppercase text-xs">Partially Accepted</span>
                          </div>
                        </div>
                      )}
                      <div className="flex flex-col @[400px]:flex-row justify-between items-start gap-3 mb-4">
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-white border ml-[-6px] px-2 py-0.5 rounded-full mb-2 inline-block shrink-0">
                            Suggestion
                          </span>
                          <h4 className="font-bold text-slate-800 text-base md:text-lg break-words leading-tight">{rec.title}</h4>
                        </div>
                        <Button 
                          className="rounded-full bg-blue-600 hover:bg-blue-700 shadow-sm transition-all shrink-0 w-full @[400px]:w-auto"
                          onClick={() => {
                            const suggestionId = rec.suggestionId || editorSuggestions.find(s => s.stepId === step.id && s.title === rec.title)?.id;
                            if (suggestionId) setActiveSuggestionIdForChat(suggestionId);
                            setPendingAiMessage(`Please help me fix this issue: ${rec.whatToImprove}\nSuggestion: ${rec.whyAndHowToFix}`);
                            setIsChatOpen(true);
                          }}
                        >
                          Fix with AI <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                      <div className="flex flex-col @[500px]:flex-row gap-4">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex-1 min-w-0">
                          <h5 className="text-[10px] font-bold uppercase text-slate-400 mb-2">What to improve</h5>
                          <p className="text-sm text-slate-600 whitespace-pre-wrap break-words">{rec.whatToImprove}</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-xl shadow-sm border border-blue-100 flex-1 min-w-0">
                          <h5 className="text-[10px] font-bold uppercase text-blue-500 mb-2">Why and how to fix</h5>
                          <p className="text-sm text-blue-800 whitespace-pre-wrap break-words">{rec.whyAndHowToFix}</p>
                        </div>
                      </div>
                    </div>
                  )})}
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // Overview Mode (Screenshot 1)
  return (
    <aside className="w-full h-full bg-slate-50/50 p-4 md:p-6 overflow-y-auto space-y-6 md:space-y-8 overflow-x-hidden">
      <div className="flex justify-center">
        {TailoringBanner}
      </div>

      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-4 md:p-6 border shadow-sm grid grid-cols-[auto_1fr] md:grid-cols-[auto_1fr_auto] gap-x-4 md:gap-x-6 gap-y-1 md:gap-y-0 items-center">
        
        {/* Left: Lightbulb (Spans both rows on desktop) */}
        <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 shrink-0 md:row-span-2 place-self-center">
          <Lightbulb className="w-6 h-6" />
        </div>

        {/* Top Right: Job Title (Spans across Text and Circle columns on desktop) */}
        {resume.personalInfo.jobTitle ? (
          <div className="col-start-2 md:col-span-2 flex items-center justify-start ml-[-8px] mb-3 self-end pt-1 md:pt-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded-lg max-w-full break-words whitespace-normal text-left inline-block">
              {resume.personalInfo.jobTitle}
            </span>
          </div>
        ) : (
          <div className="hidden md:block col-start-2 md:col-span-2"></div>
        )}

        {/* Bottom Middle: Text */}
        <div className="col-start-1 col-span-2 md:col-start-2 md:col-span-1 min-w-0 self-start mt-3 md:mt-0 text-center md:text-left">
          <h2 className="text-xl font-bold text-slate-800 break-words leading-tight mb-1">Your CV analysis</h2>
          <p className="text-sm text-slate-500">
            {100 - analysisResult.score} points needed to reach a 100 score.
          </p>
        </div>
        
        {/* Bottom Right: Circle */}
        <div className="col-start-1 col-span-2 md:col-start-3 md:col-span-1 flex flex-col items-center justify-center shrink-0 self-start mt-4 md:mt-0">
          <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle className="text-slate-100 stroke-current" strokeWidth="12" cx="50" cy="50" r="40" fill="transparent" />
              <circle
                className="text-blue-600 stroke-current"
                strokeWidth="12"
                strokeLinecap="round"
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 40}
                strokeDashoffset={(2 * Math.PI * 40) - (displayScore / 100) * (2 * Math.PI * 40)}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-blue-600 leading-none">{displayScore}</span>
              <span className="text-[10px] font-bold text-blue-400">/100</span>
            </div>
          </div>
        </div>
      </div>

      {isFullyTailored && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 flex items-start gap-3 shadow-sm">
          <div className="bg-emerald-100 p-2 rounded-full text-emerald-600 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-emerald-800">Fully Tailored!</h4>
            <p className="text-sm text-emerald-700 mt-0.5 leading-relaxed">
              This CV perfectly matches the job description. There are no more AI recommendations to improve your score.
            </p>
          </div>
        </div>
      )}

      {isFullyOptimized && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex items-start gap-3 shadow-sm">
          <div className="bg-blue-100 p-2 rounded-full text-blue-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-blue-800">Fully Optimized!</h4>
            <p className="text-sm text-blue-700 mt-0.5 leading-relaxed">
              Your CV looks flawless. There are no more AI recommendations to improve your score.
            </p>
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-b pb-4">
        <Button 
          className="w-full h-auto py-4 rounded-xl text-md whitespace-normal" 
          onClick={runAnalysis} 
          disabled={analyzeDisabled}
        >
          {analyzing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
          {analyzing 
            ? "Analyzing with AI..." 
            : !hasMinimalData
              ? "Add Profile, Summary & Experience first"
              : hasPendingSuggestions 
                ? "Review inline suggestions first" 
                : isCooldownActive 
                  ? `Wait ${cooldownRemaining}s before re-analyzing` 
                  : (currentTailoringJob ? "Re-Analyze for Job" : "Re-Analyze CV")}
        </Button>
      </div>

      <div className="text-center max-w-md mx-auto px-2">
        <h3 className="text-lg md:text-2xl font-bold text-slate-800 mb-2">Steps to increase your score</h3>
        <p className="text-xs md:text-sm text-slate-500">
          Here are some recruiter checks that are bringing your score down. Click into each to learn where you went wrong and how to improve your score.
        </p>
      </div>

      <div className="space-y-4 pb-4">
        {analysisResult.steps.map((step, i) => {
          const stepSuggestions = editorSuggestions.filter(s => s.stepId === step.id);
          const totalCount = stepSuggestions.length;
          const pendingCount = stepSuggestions.filter(s => s.status === 'pending').length;
          const acceptedCount = stepSuggestions.filter(s => s.status === 'accepted').length;
          const rejectedCount = stepSuggestions.filter(s => s.status === 'rejected').length;
          const isFullyResolved = totalCount > 0 && pendingCount === 0;

          return (
          <div 
            key={step.id}
            onClick={() => {
              setActiveAnalysisStep(step.id);
              setAnalysisMode('step-detail');
            }}
            className="bg-white border rounded-3xl p-4 flex flex-col @md:flex-row items-start @md:items-center justify-between cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group gap-4 min-w-0"
          >
            <div className="flex items-start md:items-center gap-3 md:gap-4 flex-1 min-w-0 w-full">
              <div className="flex items-center justify-center flex-col">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shadow-sm shrink-0">
                  {i + 1}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 ml-[-6px] mb-1.5">
                  {step.recommendations.length === 0 ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                      Looks good
                    </span>
                  ) : isFullyResolved ? (
                    rejectedCount === totalCount ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap flex items-center gap-1">
                        <X className="w-3 h-3" />
                        Recommendations Dismissed
                      </span>
                    ) : acceptedCount === totalCount ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Recommendations Accepted
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Recommendations Partially Addressed
                      </span>
                    )
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                      {pendingCount} recommended {pendingCount === 1 ? 'improvement' : 'improvements'}
                    </span>
                  )}
                </div>
                <h4 className="font-bold text-slate-800 text-base md:text-lg leading-tight break-words mb-1">{step.title}</h4>
                <p className="text-xs md:text-sm text-slate-500 pr-0 md:pr-4 break-words whitespace-normal line-clamp-3 md:line-clamp-2">{step.overallAssessment}</p>
              </div>
            </div>
            
            <div className="w-full @md:w-auto flex justify-end">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shrink-0">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          </div>
          );
        })}

        {!currentTailoringJob && (
          <div 
            onClick={() => setIsTailorModalOpen(true)}
            className="bg-white border rounded-3xl p-4 flex flex-col @md:flex-row items-start @md:items-center justify-between cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group gap-4 min-w-0"
          >
            <div className="flex items-start md:items-center gap-3 md:gap-4 flex-1 min-w-0 w-full">
              <div className="flex items-center justify-center flex-col">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shadow-sm shrink-0">
                  {(analysisResult?.steps?.length || 0) + 1}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 ml-[-6px] mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                    Optional
                  </span>
                </div>
                <h4 className="font-bold text-slate-800 text-base md:text-lg leading-tight break-words mb-1">Tailor this CV to a Job</h4>
                <p className="text-xs md:text-sm text-slate-500 pr-0 md:pr-4 break-words whitespace-normal line-clamp-3 md:line-clamp-2">Duplicate this master CV and optimize it for a specific job application to boost your chances.</p>
              </div>
            </div>
            
            <div className="w-full @md:w-auto flex justify-end">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shrink-0">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          </div>
        )}
      </div>

      {(resume.acceptedSuggestions?.length || resume.rejectedSuggestions?.length || resume.partiallyAcceptedSuggestions?.length) ? (
        <div className="mt-8 border-t pt-8 pb-4">
          <div className="text-center max-w-md mx-auto px-2 mb-6">
            <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-2">Suggestion History</h3>
            <p className="text-xs md:text-sm text-slate-500">
              The AI remembers your decisions to provide better recommendations in the future.
            </p>
          </div>
          
          <div className="space-y-6">
            {resume.acceptedSuggestions && resume.acceptedSuggestions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-green-700 flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4" />
                  Accepted Changes ({resume.acceptedSuggestions.length})
                </h4>
                <div className="space-y-2">
                  {resume.acceptedSuggestions.map((text, i) => (
                    <div key={`acc-${i}`} className="bg-green-50/50 border border-green-100 rounded-lg p-3 text-xs text-slate-600 flex justify-between items-start group">
                      <div className="flex-1 pr-2">{text}</div>
                      <button 
                        onClick={() => removeSuggestionDecision(i, 'accepted')}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity flex-shrink-0"
                        title="Remove from memory"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {resume.partiallyAcceptedSuggestions && resume.partiallyAcceptedSuggestions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-amber-700 flex items-center gap-2 mb-3">
                  <Check className="w-4 h-4" />
                  Partially Accepted Changes ({resume.partiallyAcceptedSuggestions.length})
                </h4>
                <div className="space-y-2">
                  {resume.partiallyAcceptedSuggestions.map((text, i) => (
                    <div key={`part-${i}`} className="bg-amber-50/50 border border-amber-100 rounded-lg p-3 text-xs text-slate-600 flex justify-between items-start group">
                      <div className="flex-1 pr-2">{text}</div>
                      <button 
                        onClick={() => removeSuggestionDecision(i, 'partially_accepted')}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity flex-shrink-0"
                        title="Remove from memory"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {resume.rejectedSuggestions && resume.rejectedSuggestions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-red-700 flex items-center gap-2 mb-3">
                  <X className="w-4 h-4" />
                  Dismissed Changes ({resume.rejectedSuggestions.length})
                </h4>
                <div className="space-y-2">
                  {resume.rejectedSuggestions.map((text, i) => (
                    <div key={`rej-${i}`} className="bg-red-50/50 border border-red-100 rounded-lg p-3 text-xs text-slate-600 line-through opacity-70 flex justify-between items-start group">
                      <div className="flex-1 pr-2">{text}</div>
                      <button 
                        onClick={() => removeSuggestionDecision(i, 'rejected')}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity flex-shrink-0"
                        title="Remove from memory"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
      
      <TailorJobModal
        isOpen={isTailorModalOpen}
        onClose={() => setIsTailorModalOpen(false)}
        onSelectJob={handleTailorToJob}
        isDuplicating={isDuplicating}
      />
    </aside>
  );
}
