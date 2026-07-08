"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseApi } from "@/lib/supabase-api";
import { Resume } from "@/types/resume";
import { Button } from "@/components/ui/button";
import { Plus, Upload } from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import { CvUploadOverlay } from "@/components/CvUploadOverlay";
import { RecentResumesList } from "@/components/RecentResumesList";
import { DocumentSettings } from "@/types/resume";
import { useToast } from "@/hooks/use-toast";

export default function HomePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { setTailoringJob, resumeList, isListLoading, fetchResumeList, deleteResumeFromList } = useResumeStore();
  
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadOverlayOpen, setIsUploadOverlayOpen] = useState(false);

  useEffect(() => {
    fetchResumeList(true);
  }, [fetchResumeList]);

  const handleCreateNew = () => {
    router.push("/editor/new");
  };

  const handleOpenResume = (resume: Resume) => {
    setTailoringJob(null);
    router.push(`/editor/${resume.id}`);
  };

  const handleDeleteResume = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    const success = await deleteResumeFromList(deleteConfirmId);
    setIsDeleting(false);
    if (success) {
      setDeleteConfirmId(null);
      toast({ title: "Deleted", description: "Resume deleted successfully." });
    } else {
      toast({ title: "Error", description: "Failed to delete resume.", variant: "destructive" });
    }
  };

  const handleUploadSuccess = async (parsedData: Partial<Resume>, filename: string) => {
    try {
      const defaultSettings: DocumentSettings = {
        pageSize: 'Letter',
        margin: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
        typography: { fontFamily: "'Times New Roman', Times, serif", fontSize: 11, titleSize: 28, headingSize: 14, bodySize: 13, lineHeight: 1.5, textAlign: 'left' },
        spacing: { nameGap: 12, headerGap: 16, sectionGap: 16, titleGap: 8, itemGap: 12, lineGap: 4, bulletGap: 4 },
      };

      const title = filename.replace(/\.pdf$/i, '');

      const newResume: Resume = {
        id: "new",
        userId: "local-user",
        title: title,
        personalInfo: parsedData.personalInfo || { name: "", email: "", phone: "", location: "" },
        sections: parsedData.sections || [],
        settings: defaultSettings,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const savedResume = await supabaseApi.saveResume(newResume);
      setIsUploadOverlayOpen(false);
      router.push(`/editor/${savedResume.id}`);
    } catch (error) {
      console.error("Failed to save imported resume:", error);
      toast({
        title: "Import Failed",
        description: "Failed to save imported resume. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex-1 bg-muted/10 flex flex-col p-8 md:p-12 overflow-auto">
      <div className="max-w-6xl w-full mx-auto space-y-10">
        
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Welcome to CV Manager</h1>
          <p className="text-muted-foreground text-lg">Create, manage, and tailor your professional resumes.</p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button 
            onClick={handleCreateNew}
            className="flex flex-col items-center justify-center p-8 bg-white border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 rounded-xl transition-all group text-center"
          >
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Create New CV</h3>
            <p className="text-sm text-slate-500">Start with a completely blank canvas</p>
          </button>

          <button 
            onClick={() => setIsUploadOverlayOpen(true)}
            className="flex flex-col items-center justify-center p-8 bg-white border-2 border-slate-200 hover:border-slate-300 hover:shadow-md rounded-xl transition-all group text-center"
          >
            <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Upload Existing CV</h3>
            <p className="text-sm text-slate-500">Extract data from a PDF using AI</p>
          </button>
        </div>

        {/* History Section */}
        <RecentResumesList 
          recentResumes={resumeList}
          isLoading={isListLoading}
          onOpen={handleOpenResume}
          onDeleteClick={setDeleteConfirmId}
        />

      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Delete Resume?</h3>
            <p className="text-slate-500">
              Are you sure you want to delete this resume? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteResume} disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <CvUploadOverlay 
        open={isUploadOverlayOpen} 
        onOpenChange={setIsUploadOverlayOpen} 
        onSuccess={handleUploadSuccess} 
      />
    </div>
  );
}
