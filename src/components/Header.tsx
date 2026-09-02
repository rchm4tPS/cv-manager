"use client";

import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useResumeStore } from "@/store/useResumeStore";
import { supabaseApi } from "@/lib/supabase-api";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Undo2, Redo2, Menu, FileText, Briefcase, Download, X, Home, Palette, LogOut, User } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const isEditor = pathname.startsWith("/editor");
  const { 
    resume, setResume, updateTitle, isDirty, setIsDirty, 
    undo, redo, pastStates, futureStates,
    setTailoringJob,
    appTheme, setAppTheme,
    syncResumeToList
  } = useResumeStore();
  const isLoadingTitle = params?.id && resume.id !== params.id;
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { user, signOut, initializeAuth } = useAuthStore();

  useEffect(() => {
    // eslint-disable-next-line
    setIsMounted(true);
    const unsubscribe = initializeAuth();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [initializeAuth]);

  const handleTitleSubmit = () => {
    if (tempTitle.trim()) {
      updateTitle(tempTitle.trim());
    }
    setIsEditingTitle(false);
  };

  useEffect(() => {
    if (!isEditor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z or Cmd+Z for Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Ctrl+Y, Cmd+Y, or Ctrl+Shift+Z, Cmd+Shift+Z for Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditor, undo, redo]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const savedData = await supabaseApi.saveResume(resume);
      
      if (resume.id === 'new' && savedData) {
        const newResume = {
          ...resume,
          id: savedData.id,
          createdAt: savedData.created_at,
          updatedAt: savedData.updated_at
        };
        setResume(newResume);
        syncResumeToList(newResume);
        // Important: Update the URL so we are no longer at /editor/new
        router.replace(`/editor/${savedData.id}`);
      } else if (savedData) {
        const updatedResume = {
          ...resume,
          updatedAt: savedData.updated_at
        };
        setResume(updatedResume);
        syncResumeToList(updatedResume);
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
        <Link href="/home" className="text-xl font-semibold tracking-tight hover:text-blue-600 transition-colors" onClick={() => setTailoringJob(null)}>
          CV Manager
        </Link>
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
            <div className="flex items-center gap-1 mr-4 bg-muted/30 rounded-lg p-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={undo}
                disabled={pastStates.length === 0}
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={redo}
                disabled={futureStates.length === 0}
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-4 h-4" />
              </Button>
            </div>
            
            <Button 
              size="sm" 
              onClick={handleSave} 
              disabled={isSaving || !isDirty}
              className={isDirty && !isSaving ? "animate-shake-zoom bg-blue-600 hover:bg-blue-700" : ""}
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </>
        )}
        
        <Button variant="outline" size="icon" className="w-8 h-8 ml-2" onClick={() => setIsMenuOpen(true)}>
          <Menu className="w-4 h-4" />
        </Button>
      </div>

      {/* Slide-in Drawer Portal */}
      {isMounted && document.body && createPortal(
        <>
          {/* Overlay */}
          <div 
            className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] transition-opacity duration-300 ${isMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            onClick={() => setIsMenuOpen(false)}
          />
          {/* Drawer */}
          <div 
            className={`fixed top-0 right-0 bottom-0 w-72 bg-white shadow-2xl z-[101] flex flex-col transition-transform duration-300 ease-in-out border-l ${isMenuOpen ? "translate-x-0" : "translate-x-full"}`}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <span className="font-bold text-lg text-slate-800">Menu</span>
              <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)}>
                <X className="w-5 h-5 text-slate-500" />
              </Button>
            </div>
            
            <div className="flex flex-col gap-2 p-4 flex-1">
              <Link href="/home" onClick={() => { setTailoringJob(null); setIsMenuOpen(false); }}>
                <Button variant="ghost" className="w-full justify-start h-12 text-md font-medium text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition-colors">
                  <Home className="w-5 h-5 mr-3 text-slate-500" /> Home
                </Button>
              </Link>
              <Link href="/editor/new" onClick={() => { setTailoringJob(null); setIsMenuOpen(false); }}>
                <Button variant={isEditor ? "secondary" : "ghost"} className="w-full justify-start h-12 text-md font-medium text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition-colors">
                  <FileText className="w-5 h-5 mr-3 text-slate-500" /> Editor (New Blank CV)
                </Button>
              </Link>
              <Link href="/jobs" onClick={() => { setTailoringJob(null); setIsMenuOpen(false); }}>
                <Button variant={pathname.startsWith("/jobs") ? "secondary" : "ghost"} className="w-full justify-start h-12 text-md font-medium text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition-colors">
                  <Briefcase className="w-5 h-5 mr-3 text-slate-500" /> Jobs Dashboard
                </Button>
              </Link>
              
              <div className="h-px bg-slate-200 my-2" />
              
              <Button 
                variant="ghost" 
                className="w-full justify-start h-12 text-md font-medium text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                onClick={() => setAppTheme(appTheme === 'default' ? 'anthropic' : 'default')}
              >
                <Palette className="w-5 h-5 mr-3 text-slate-500" /> 
                Theme: {appTheme === 'default' ? 'Slate Blue' : 'Anthropic'}
              </Button>
            </div>
            
            {user && (
              <div className="p-4 border-t bg-slate-50 flex flex-col gap-2">
                <div className="flex items-center gap-3 px-2 py-1 mb-2">
                  <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold overflow-hidden">
                    {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={user.user_metadata.avatar_url || user.user_metadata.picture} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {(user.user_metadata?.name || user.user_metadata?.full_name) && (
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {user.user_metadata.name || user.user_metadata.full_name}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={async () => {
                    try {
                      await signOut();
                    } catch (error) {
                      console.error("Logout error:", error);
                    }
                    setIsMenuOpen(false);
                    // Gunakan window.location.href untuk memaksa full page reload
                    // Ini memastikan Next.js Middleware mendeteksi hilangnya cookie sesi dengan benar
                    window.location.href = '/login';
                  }}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            )}

            {isEditor && (
              <div className="p-4 border-t bg-slate-50">
                <Button 
                  variant="default" 
                  className="w-full h-12 text-md shadow-md bg-slate-800 hover:bg-slate-700" 
                  onClick={() => { window.dispatchEvent(new Event('print-resume')); setIsMenuOpen(false); }}
                >
                  <Download className="w-5 h-5 mr-2" /> Export to PDF
                </Button>
              </div>
            )}
          </div>
        </>,
        document.body
      )}
    </header>
  );
}
