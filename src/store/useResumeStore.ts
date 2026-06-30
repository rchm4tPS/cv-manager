import { create } from 'zustand';
import { Resume, DocumentSettings, Section, AnalysisResult, AnalysisMode, ChatMessage } from '@/types/resume';

interface ResumeStore {
  resume: Resume;
  tailoringJob: { id: string; company: string; position: string; description: string } | null;
  setResume: (resume: Resume) => void;
  setTailoringJob: (job: { id: string; company: string; position: string; description: string } | null) => void;
  updatePersonalInfo: (info: Partial<Resume['personalInfo']>) => void;
  updateSettings: (settings: Partial<DocumentSettings>) => void;
  addSection: (section: Section) => void;
  updateSection: (sectionId: string, data: Partial<Section>) => void;
  deleteSection: (sectionId: string) => void;
  reorderSections: (sections: Section[]) => void;
  initBlankResume: () => void;
  updateTitle: (title: string) => void;
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
  // AI Analysis State
  analysisResult: AnalysisResult | null;
  setAnalysisResult: (result: AnalysisResult | null) => void;
  analysisMode: AnalysisMode;
  setAnalysisMode: (mode: AnalysisMode) => void;
  activeAnalysisStep: string | null;
  setActiveAnalysisStep: (stepId: string | null) => void;
  isChatOpen: boolean;
  setIsChatOpen: (isOpen: boolean) => void;
  pendingChanges: Partial<Resume> | null;
  setPendingChanges: (changes: Partial<Resume> | null) => void;
  showOriginal: boolean;
  setShowOriginal: (show: boolean) => void;
  chatMessages: ChatMessage[];
  setChatMessages: (messages: ChatMessage[]) => void;
  applyPendingChanges: () => void;
  discardPendingChanges: () => void;
}

const defaultResume: Resume = {
  id: 'new',
  userId: 'local-user',
  title: 'Untitled Resume',
  personalInfo: {
    name: 'John Doe',
    jobTitle: 'Front End Developer',
    email: 'john.doe@gmail.com',
    phone: 'Enter phone number here',
    location: 'Indonesia',
    linkedin: 'https://www.linkedin.com/in/#',
    website: 'https://portfolio',
    github: 'https://github.com/',
  },
  sections: [],
  settings: {
    pageSize: 'Letter',
    margin: { top: 1, bottom: 1, left: 1, right: 1 },
    typography: { fontFamily: "'Times New Roman', Times, serif", fontSize: 11, titleSize: 28, headingSize: 14, bodySize: 13, lineHeight: 1.5, textAlign: 'left' },
    spacing: { nameGap: 12, headerGap: 16, sectionGap: 16, titleGap: 8, itemGap: 12, lineGap: 4, bulletGap: 4 },
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const blankResume: Resume = {
  id: 'new',
  userId: 'local-user',
  title: 'Untitled Resume',
  personalInfo: {
    name: '',
    jobTitle: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    website: '',
    github: '',
  },
  sections: [],
  settings: {
    pageSize: 'Letter',
    margin: { top: 1, bottom: 1, left: 1, right: 1 },
    typography: { fontFamily: "'Times New Roman', Times, serif", fontSize: 11, titleSize: 28, headingSize: 14, bodySize: 13, lineHeight: 1.5 },
    spacing: { nameGap: 12, headerGap: 16, sectionGap: 16, titleGap: 8, itemGap: 12, lineGap: 4, bulletGap: 4 },
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const useResumeStore = create<ResumeStore>((set) => ({
  resume: defaultResume,
  tailoringJob: null,
  isDirty: false,
  setIsDirty: (dirty) => set({ isDirty: dirty }),
  setResume: (resume) => set({ 
    resume, 
    isDirty: false, 
    analysisResult: resume.analysisResult || null,
    analysisMode: 'inactive',
    activeAnalysisStep: null,
    isChatOpen: false,
    pendingChanges: null,
    showOriginal: false,
    chatMessages: [
      { role: "ai", text: "Hi there! I can help you improve your resume. Ask me for feedback or improvements, and I can directly edit your resume." }
    ]
  }),
  setTailoringJob: (job) => set({ tailoringJob: job }),
  // AI Analysis Init
  analysisResult: null,
  setAnalysisResult: (result) => set((state) => ({ 
    analysisResult: result,
    resume: { ...state.resume, analysisResult: result || undefined },
    isDirty: true
  })),
  analysisMode: 'inactive',
  setAnalysisMode: (mode) => set({ analysisMode: mode }),
  activeAnalysisStep: null,
  setActiveAnalysisStep: (stepId) => set({ activeAnalysisStep: stepId }),
  isChatOpen: false,
  setIsChatOpen: (isOpen) => set({ isChatOpen: isOpen }),
  pendingChanges: null,
  setPendingChanges: (changes) => set({ pendingChanges: changes, showOriginal: false }),
  showOriginal: false,
  setShowOriginal: (show) => set({ showOriginal: show }),
  chatMessages: [
    { role: "ai", text: "Hi there! I can help you improve your resume. Ask me for feedback or improvements, and I can directly edit your resume." }
  ],
  setChatMessages: (messages) => set({ chatMessages: messages }),
  applyPendingChanges: () => set((state) => {
    if (!state.pendingChanges) return state;
    
    // Mark last AI message as accepted
    const newMessages = [...state.chatMessages];
    if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'ai') {
      newMessages[newMessages.length - 1] = { ...newMessages[newMessages.length - 1], status: 'accepted' };
    }
    
    return {
      resume: {
        ...state.resume,
        ...state.pendingChanges
      },
      pendingChanges: null,
      showOriginal: false,
      isDirty: true,
      chatMessages: newMessages
    };
  }),
  discardPendingChanges: () => set((state) => {
    // Mark last AI message as rejected
    const newMessages = [...state.chatMessages];
    if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'ai') {
      newMessages[newMessages.length - 1] = { ...newMessages[newMessages.length - 1], status: 'rejected' };
    }
    return { pendingChanges: null, showOriginal: false, chatMessages: newMessages };
  }),
  // Methods
  updatePersonalInfo: (info) =>
    set((state) => ({
      resume: {
        ...state.resume,
        personalInfo: { ...state.resume.personalInfo, ...info },
      },
      isDirty: true,
    })),
  updateSettings: (settings) =>
    set((state) => ({
      resume: {
        ...state.resume,
        settings: { ...state.resume.settings, ...settings },
      },
      isDirty: true,
    })),
  addSection: (section) =>
    set((state) => ({
      resume: {
        ...state.resume,
        sections: [...state.resume.sections, section],
      },
      isDirty: true,
    })),
  updateSection: (sectionId, data) =>
    set((state) => ({
      resume: {
        ...state.resume,
        sections: state.resume.sections.map((s) =>
          s.id === sectionId ? { ...s, ...data } : s
        ),
      },
      isDirty: true,
    })),
  deleteSection: (sectionId) =>
    set((state) => ({
      resume: {
        ...state.resume,
        sections: state.resume.sections.filter((s) => s.id !== sectionId),
      },
      isDirty: true,
    })),
  reorderSections: (sections) =>
    set((state) => ({
      resume: {
        ...state.resume,
        sections,
      },
      isDirty: true,
    })),
  initBlankResume: () => set({ resume: blankResume, isDirty: false }),
  updateTitle: (title) =>
    set((state) => ({
      resume: {
        ...state.resume,
        title,
      },
      isDirty: true,
    })),
}));
