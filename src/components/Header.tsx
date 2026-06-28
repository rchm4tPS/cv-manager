"use client";

import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useResumeStore } from "@/store/useResumeStore";
import { supabaseApi } from "@/lib/supabase-api";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const isEditor = pathname.startsWith("/editor");
  const { resume, setResume, updateTitle, isDirty, setIsDirty } = useResumeStore();
  const isLoadingTitle = params?.id && resume.id !== params.id;
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState("");

  const handleTitleSubmit = () => {
    if (tempTitle.trim()) {
      updateTitle(tempTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const savedData = await supabaseApi.saveResume(resume);
      
      if (resume.id === 'new' && savedData) {
        setResume({
          ...resume,
          id: savedData.id,
          createdAt: savedData.created_at,
          updatedAt: savedData.updated_at
        });
        // Important: Update the URL so we are no longer at /editor/new
        router.replace(`/editor/${savedData.id}`);
      } else {
        // Just clear dirty flag if updating existing
        setIsDirty(false);
      }
      
      toast({
        title: "Success",
        description: "Resume saved to database.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to save resume.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <header className="flex h-14 items-center px-6 bg-card shrink-0 relative border-b">
      <div className="flex items-center gap-4 flex-1">
        <Link href="/home" className="text-xl font-semibold tracking-tight hover:text-blue-600 transition-colors">
          CV Manager
        </Link>
        <nav className="hidden md:flex gap-4 ml-6">
          <Link href="/editor/new">
            <Button variant={isEditor ? "default" : "ghost"} size="sm">Editor</Button>
          </Link>
          <Link href="/jobs">
            <Button variant={pathname.startsWith("/jobs") ? "default" : "ghost"} size="sm">Jobs</Button>
          </Link>
        </nav>
      </div>

      {isEditor && !isLoadingTitle && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
          {isEditingTitle ? (
            <input
              autoFocus
              className="h-8 text-sm font-medium border border-blue-400 rounded px-2 w-64 outline-none ring-2 ring-blue-100 text-center"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
            />
          ) : (
            <div 
              className="flex items-center gap-2 hover:bg-slate-100 px-4 py-1 rounded cursor-pointer max-w-[400px]"
              onClick={() => {
                setTempTitle(resume.title || "");
                setIsEditingTitle(true);
              }}
              title="Click to rename"
            >
              <span className="h-6 text-sm font-bold flex items-center truncate">
                {resume.title || "Untitled CV"}
              </span>
              {isDirty && (
                <span className="text-[10px] uppercase font-bold tracking-wider bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded shrink-0">
                  Unsaved
                </span>
              )}
            </div>
          )}
        </div>
      )}
      
      <div className="flex items-center gap-2 flex-1 justify-end">
        {isEditor && (
          <>
            <Button variant="outline" size="sm">Export PDF</Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving || !isDirty}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
