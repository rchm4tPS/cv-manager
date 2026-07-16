/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect } from "react";
import { EditorPane } from "@/components/EditorPane";
import { PreviewPane } from "@/components/PreviewPane";
import { AnalysisPane } from "@/components/AnalysisPane";
import { SettingsPane } from "@/components/SettingsPane";
import { AiChatPane } from "@/components/AiChatPane";
import { EditorSidebar } from "@/components/EditorSidebar";
import { ResizablePane } from "@/components/ui/resizable-pane";
import { useResumeStore } from "@/store/useResumeStore";
import { supabaseApi } from "@/lib/supabase-api";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/useAuthStore";

type TabType = "editor" | "analysis" | "settings";

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("editor");
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { setResume, initBlankResume, isChatOpen, setIsChatOpen, setTailoringJob } = useResumeStore();
  const { user } = useAuthStore();

  useEffect(() => {
    async function loadResume() {
      if (!params.id) return;
      
      if (params.id === 'new') {
        const metadata = user ? { ...user.user_metadata, email: user.email } : undefined;
        initBlankResume(user!.id, metadata);
        setIsLoading(false);
        return;
      }

      try {
        const data = await supabaseApi.getResumeById(params.id as string, user!.id);
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

    loadResume();
  }, [params.id, setResume, initBlankResume, router, toast, setTailoringJob, user]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (isMounted) localStorage.setItem("cv_activeTab", tab);
  };
  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center bg-background">Loading CV...</div>;
  }

  return (
    <div className="flex flex-1 overflow-hidden bg-background">
      <EditorSidebar 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
        isChatOpen={isChatOpen} 
        onChatToggle={() => setIsChatOpen(!isChatOpen)} 
      />

      <ResizablePane 
        id="cv_leftPaneWidth" 
        defaultWidth={600}
        maxWidth={() => window.innerWidth * (1/3)}
      >
        {activeTab === "editor" && <EditorPane />}
        {activeTab === "analysis" && <AnalysisPane />}
        {activeTab === "settings" && <SettingsPane />}
      </ResizablePane>
      
      {isChatOpen && (
        <ResizablePane 
          id="cv_middlePaneWidth" 
          defaultWidth={400} 
          maxWidth={() => window.innerWidth * (1/3)}
        >
          <AiChatPane />
        </ResizablePane>
      )}
      
      <PreviewPane showRuler={activeTab === "settings"} />
    </div>
  );
}
