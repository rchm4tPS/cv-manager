/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect } from "react";
import { EditorPane } from "@/components/EditorPane";
import { PreviewPane } from "@/components/PreviewPane";
import { AnalysisPane } from "@/components/AnalysisPane";
import { SettingsPane } from "@/components/SettingsPane";
import { AiChatPane } from "@/components/AiChatPane";
import { useResumeStore } from "@/store/useResumeStore";
import { supabaseApi } from "@/lib/supabase-api";

import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

type TabType = "editor" | "analysis" | "settings";

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("editor");
  const [leftPaneWidth, setLeftPaneWidth] = useState(600);
  const [middlePaneWidth, setMiddlePaneWidth] = useState(400);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { setResume, initBlankResume, isChatOpen, setIsChatOpen, setTailoringJob } = useResumeStore();

  useEffect(() => {
    async function loadResume() {
      if (!params.id) return;
      
      if (params.id === 'new') {
        initBlankResume();
        setIsLoading(false);
        return;
      }

      try {
        const data = await supabaseApi.getResumeById(params.id as string);
        if (data) {
          setResume(data);
          if (data.tailoringJob) {
            setTailoringJob(data.tailoringJob);
          }
          setIsLoading(false);
        } else {
          toast({
            title: "Not Found",
            description: "The requested resume could not be found.",
            variant: "destructive"
          });
          router.push('/home');
        }
      } catch (error) {
        console.error("Failed to load resume:", error);
        toast({
          title: "Error",
          description: "Failed to load resume.",
          variant: "destructive"
        });
        router.push('/home');
      }
    }
    
    setIsMounted(true);
    const savedTab = localStorage.getItem("cv_activeTab") as TabType;
    if (savedTab) setActiveTab(savedTab);
    const savedWidth = localStorage.getItem("cv_leftPaneWidth");
    if (savedWidth) setLeftPaneWidth(parseInt(savedWidth, 10));
    const savedMiddleWidth = localStorage.getItem("cv_middlePaneWidth");
    if (savedMiddleWidth) setMiddlePaneWidth(parseInt(savedMiddleWidth, 10));

    loadResume();
  }, [params.id, setResume, initBlankResume, router, toast, setTailoringJob]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (isMounted) localStorage.setItem("cv_activeTab", tab);
  };

  const handleDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftPaneWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      let newWidth = startWidth + (moveEvent.clientX - startX);
      const minW = 250;
      const maxW = window.innerWidth * (2/3);
      newWidth = Math.max(minW, Math.min(newWidth, maxW));
      setLeftPaneWidth(newWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'default';
      setLeftPaneWidth(finalWidth => {
        localStorage.setItem("cv_leftPaneWidth", finalWidth.toString());
        return finalWidth;
      });
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
  };

  const handleMiddleDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = middlePaneWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      let newWidth = startWidth + (moveEvent.clientX - startX);
      const minW = 250;
      const maxW = 800;
      newWidth = Math.max(minW, Math.min(newWidth, maxW));
      setMiddlePaneWidth(newWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'default';
      setMiddlePaneWidth(finalWidth => {
        localStorage.setItem("cv_middlePaneWidth", finalWidth.toString());
        return finalWidth;
      });
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
  };

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center bg-background">Loading CV...</div>;
  }

  return (
    <div className="flex flex-1 overflow-hidden bg-background">
      {/* Left Navigation Sub-Menu */}
      <div className="w-14 border-r bg-muted/20 flex flex-col items-center py-4 gap-4 z-20">
        <button 
          onClick={() => handleTabChange("editor")}
          className={`p-2 rounded-md transition-colors ${activeTab === 'editor' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
          title="Editor"
        >
          📝
        </button>
        <button 
          onClick={() => handleTabChange("analysis")}
          className={`p-2 rounded-md transition-colors ${activeTab === 'analysis' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
          title="Analysis"
        >
          📊
        </button>
        <button 
          onClick={() => handleTabChange("settings")}
          className={`p-2 rounded-md transition-colors ${activeTab === 'settings' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
          title="Settings"
        >
          ⚙️
        </button>
        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`p-2 rounded-md transition-colors mt-auto mb-4 ${isChatOpen ? 'bg-blue-100 text-blue-600 outline outline-1 outline-blue-400' : 'text-blue-500 hover:bg-blue-50'}`}
          title="AI Assistant"
        >
          ✨
        </button>
      </div>

      <div 
        className="flex flex-col relative bg-white border-r z-10 shrink-0 overflow-hidden @container" 
        style={{ width: isMounted ? leftPaneWidth : 600 }}
      >
        <div 
          className="flex flex-col h-full"
          style={{
            width: isMounted && leftPaneWidth < 400 ? 400 : '100%',
            zoom: isMounted && leftPaneWidth < 400 ? leftPaneWidth / 400 : 1
          }}
        >
          {activeTab === "editor" && <EditorPane />}
          {activeTab === "analysis" && <AnalysisPane />}
          {activeTab === "settings" && <SettingsPane />}
        </div>

        {/* Drag Handle */}
        <div 
          className="absolute right-[-4px] top-0 bottom-0 w-[8px] cursor-col-resize hover:bg-blue-500/50 transition-colors z-50 group flex items-center justify-center"
          onMouseDown={handleDrag}
        >
          <div className="w-[2px] h-8 bg-slate-300 group-hover:bg-blue-600 rounded-full" />
        </div>
      </div>
      
      {/* 3rd Pane: AI Chat */}
      {isChatOpen && (
        <div className="relative shrink-0 h-full bg-white z-0 overflow-hidden border-r" style={{ width: isMounted ? middlePaneWidth : 400 }}>
          <div
            className="flex flex-col h-full"
            style={{
              width: isMounted && middlePaneWidth < 400 ? 400 : '100%',
              zoom: isMounted && middlePaneWidth < 400 ? middlePaneWidth / 400 : 1
            }}
          >
            <AiChatPane />
          </div>
          {/* Drag Handle for Middle Pane */}
          <div 
            className="absolute right-[-4px] top-0 bottom-0 w-[8px] cursor-col-resize hover:bg-blue-500/50 transition-colors z-50 group flex items-center justify-center"
            onMouseDown={handleMiddleDrag}
          >
            <div className="w-[2px] h-8 bg-slate-300 group-hover:bg-blue-600 rounded-full" />
          </div>
        </div>
      )}
      
      <PreviewPane showRuler={activeTab === "settings"} />
    </div>
  );
}
