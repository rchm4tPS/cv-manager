"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useResumeStore } from "@/store/useResumeStore";
import { Loader2, ChevronRight, ArrowLeft, Target, CheckCircle2, Lightbulb, CheckSquare, Eye, ArrowRight, ChevronLeft, Sparkles, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
    setTailoringJob
  } = useResumeStore();
  const { toast } = useToast();
  const [analyzing, setAnalyzing] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Update timer for cooldown every second
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isCooldownActive = analysisCooldownUntil ? now < analysisCooldownUntil : false;
  const cooldownRemaining = analysisCooldownUntil ? Math.ceil((analysisCooldownUntil - now) / 1000) : 0;
  const hasPendingSuggestions = editorSuggestions.some(s => s.status === 'pending');
  const hasMinimalData = !!(resume.personalInfo.name?.trim()) &&
    resume.sections.some(s => s.type === 'summary' && s.items.length > 0) &&
    resume.sections.some(s => (s.type === 'experience' || s.type === 'projects') && s.items.length > 0);
  const analyzeDisabled = analyzing || isCooldownActive || hasPendingSuggestions || !hasMinimalData;

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/analyze-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, tailoringJob })
      });
      const data = await res.json();
      if (data.success) {
        setAnalysisResult(data.data);
        
        // Parse bulk analysis into actionable suggestions for the EditorPane
        const newSuggestions: any[] = [];
        data.data.steps.forEach((step: any) => {
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
      case 'experiences': return <CheckSquare className="w-5 h-5 text-blue-500" />;
      case 'format': return <Eye className="w-5 h-5 text-indigo-500" />;
      case 'keywords': return <Sparkles className="w-5 h-5 text-purple-500" />;
      case 'summary-match': return <Target className="w-5 h-5 text-emerald-500" />;
      case 'experience-match': return <CheckSquare className="w-5 h-5 text-blue-500" />;
      default: return <Target className="w-5 h-5" />;
    }
  };

  const getStepIconBg = (id: string) => {
    switch (id) {
      case 'contact': return "bg-orange-50";
      case 'summary': return "bg-emerald-50";
      case 'experiences': return "bg-blue-50";
      case 'format': return "bg-indigo-50";
      case 'keywords': return "bg-purple-50";
      case 'summary-match': return "bg-emerald-50";
      case 'experience-match': return "bg-blue-50";
      default: return "bg-slate-50";
    }
  };

  const TailoringBanner = tailoringJob ? (
    <div className="bg-blue-50 text-blue-700 text-xs px-3 py-1.5 rounded-full inline-flex font-medium mb-4 border border-blue-100 flex items-center justify-center shrink-0 mx-auto max-w-fit">
      ✨ Tailoring for {tailoringJob.position}
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
            className="w-full py-6 rounded-xl text-md" 
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
                    : (tailoringJob ? "Analyze for this Job" : "Analyze CV")}
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
                  {step.recommendations.map((rec: any, i: number) => {
                    const status = editorSuggestions.find(s => (rec.suggestionId && s.id === rec.suggestionId) || (s.stepId === step.id && s.title === rec.title))?.status || 'pending';
                    const isDone = status === 'accepted';
                    const isDismissed = status === 'rejected';
                    
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
      <div className="bg-white rounded-3xl p-4 md:p-6 border shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-4">
          <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 shrink-0">
            <Lightbulb className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
              {resume.personalInfo.jobTitle && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 ml-[-8px] px-2 py-0.5 rounded-full shrink-0">
                  {resume.personalInfo.jobTitle}
                </span>
              )}
            </div>
            {/* <h2 className="text-xl font-bold text-slate-800 break-words leading-tight mb-1">{resume.personalInfo.name} analysis</h2> */}
            <h2 className="text-xl font-bold text-slate-800 break-words leading-tight mb-1">Your CV analysis</h2>
            <p className="text-sm text-slate-500">
              {100 - analysisResult.score} points needed to reach a 100 score.
            </p>
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-3 shrink-0">
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
              strokeDashoffset={(2 * Math.PI * 40) - (analysisResult.score / 100) * (2 * Math.PI * 40)}
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-blue-600 leading-none">{analysisResult.score}</span>
            <span className="text-[10px] font-bold text-blue-400">/100</span>
          </div>
        </div>
        </div>
      </div>

      <div className="pt-4 border-t border-b pb-4">
        <Button 
          className="w-full py-6 rounded-xl text-md" 
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
                  : (tailoringJob ? "Re-Analyze for Job" : "Re-Analyze CV")}
        </Button>
      </div>

      <div className="text-center max-w-md mx-auto px-2">
        <h3 className="text-lg md:text-2xl font-bold text-slate-800 mb-2">Steps to increase your score</h3>
        <p className="text-xs md:text-sm text-slate-500">
          Here are some recruiter checks that are bringing your score down. Click into each to learn where you went wrong and how to improve your score.
        </p>
      </div>

      <div className="space-y-4 pb-4">
        {analysisResult.steps.map((step, i) => (
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
                {/* <div className={`w-12 h-12 rounded-2xl ${getStepIconBg(step.id)} hidden md:flex items-center justify-center shrink-0`}>
                  {getStepIcon(step.id)}
                </div> */}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 ml-[-6px] mb-1.5">
                  {/* <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                    Step {i + 1}
                  </span> */}
                  
                  {step.recommendations.length === 0 ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                      Looks good
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                      {step.recommendations.length} recommended improvements
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
        ))}
      </div>
      
      {/*  */}
    </aside>
  );
}
