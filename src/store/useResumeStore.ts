import { create } from 'zustand';
import { Resume, DocumentSettings, Section, AnalysisResult, AnalysisMode, ChatMessage, EditorSuggestion } from '@/types/resume';

interface ResumeStore {
  resume: Resume;
  tailoringJob: { id: string; company: string; position: string; description?: string } | null;
  setResume: (resume: Resume) => void;
  setTailoringJob: (job: { id: string; company: string; position: string; description?: string } | null) => void;
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
  recordSuggestionDecision: (suggestionText: string, decision: 'accepted' | 'rejected') => void;
  removeSuggestionDecision: (index: number, decision: 'accepted' | 'rejected') => void;
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
  pendingAiMessage: string | null;
  setPendingAiMessage: (message: string | null) => void;
  activeSuggestionIdForChat: string | null;
  setActiveSuggestionIdForChat: (id: string | null) => void;
  applyPendingChanges: () => void;
  discardPendingChanges: () => void;
  acceptAiChanges: () => void;
  discardAiChanges: () => void;
  // AI Suggestions Checklist
  editorSuggestions: EditorSuggestion[];
  setEditorSuggestions: (suggestions: EditorSuggestion[]) => void;
  updateSuggestionStatus: (id: string, status: 'accepted' | 'rejected') => void;
  analysisCooldownUntil: number | null;
  setAnalysisCooldownUntil: (time: number | null) => void;
  // History State
  pastStates: Resume[];
  futureStates: Resume[];
  undo: () => void;
  redo: () => void;
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

const getInitialTailoringJob = () => {
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem('tailoringJob');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
  return null;
};

export const useResumeStore = create<ResumeStore>((set, get) => {
  let debounceTimeout: NodeJS.Timeout;
  let lastSnapshot: Resume | null = null;

  const setWithHistory = (updater: (state: ResumeStore) => Partial<ResumeStore>) => {
    const currentState = get();
    if (!lastSnapshot) lastSnapshot = currentState.resume;
    
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      const s = get();
      // Only push to pastStates if the resume actually changed
      if (JSON.stringify(lastSnapshot) !== JSON.stringify(s.resume)) {
        set((prevState) => ({
          pastStates: [...prevState.pastStates, lastSnapshot!].slice(-20),
          futureStates: []
        }));
      }
      lastSnapshot = null;
    }, 1000);
    
    set(updater(currentState));
  };

  return {
  resume: defaultResume,
  tailoringJob: getInitialTailoringJob(),
  isDirty: false,
  setIsDirty: (dirty) => set({ isDirty: dirty }),
  setResume: (resume) => {
    const newSuggestions: any[] = [];
    if (resume.analysisResult && resume.analysisResult.steps) {
      resume.analysisResult.steps.forEach((step: any) => {
        step.recommendations.forEach((rec: any) => {
          if (!rec.suggestionId) {
            rec.suggestionId = Math.random().toString(36).substring(2, 9);
          }
          newSuggestions.push({
            id: rec.suggestionId,
            stepId: step.id,
            targetSection: rec.targetSection || 'global',
            title: rec.title,
            whatToImprove: rec.whatToImprove,
            whyAndHowToFix: rec.whyAndHowToFix,
            status: rec.status || 'pending'
          });
        });
      });
    }

    set({ 
      resume, 
      isDirty: false, 
      analysisResult: resume.analysisResult || null,
      editorSuggestions: newSuggestions,
      analysisMode: 'inactive',
      activeAnalysisStep: null,
      isChatOpen: false,
      pendingChanges: null,
      showOriginal: false,
      chatMessages: [
        { role: "ai", text: "Hi there! I can help you improve your resume. Ask me for feedback or improvements, and I can directly edit your resume." }
      ],
      pendingAiMessage: null,
      activeSuggestionIdForChat: null
    });
  },
  setTailoringJob: (job) => {
    if (typeof window !== 'undefined') {
      if (job) {
        sessionStorage.setItem('tailoringJob', JSON.stringify(job));
      } else {
        sessionStorage.removeItem('tailoringJob');
      }
    }
    set({ tailoringJob: job });
  },

  recordSuggestionDecision: (suggestionText: string, decision: 'accepted' | 'rejected') => {
    set((state) => {
      const resume = state.resume;
      if (!resume) return {};
      
      const updatedResume = { ...resume };
      
      if (decision === 'accepted') {
        updatedResume.acceptedSuggestions = [...(resume.acceptedSuggestions || []), suggestionText];
      } else {
        updatedResume.rejectedSuggestions = [...(resume.rejectedSuggestions || []), suggestionText];
      }
      
      return {
        resume: updatedResume,
        isDirty: true
      };
    });
  },

  removeSuggestionDecision: (index: number, decision: 'accepted' | 'rejected') => {
    set((state) => {
      const resume = state.resume;
      if (!resume) return {};
      
      const updatedResume = { ...resume };
      
      if (decision === 'accepted' && updatedResume.acceptedSuggestions) {
        updatedResume.acceptedSuggestions = updatedResume.acceptedSuggestions.filter((_, i) => i !== index);
      } else if (decision === 'rejected' && updatedResume.rejectedSuggestions) {
        updatedResume.rejectedSuggestions = updatedResume.rejectedSuggestions.filter((_, i) => i !== index);
      }
      
      return {
        resume: updatedResume,
        isDirty: true
      };
    });
  },

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
  pendingAiMessage: null,
  setPendingAiMessage: (message) => set({ pendingAiMessage: message }),
  activeSuggestionIdForChat: null,
  setActiveSuggestionIdForChat: (id) => set({ activeSuggestionIdForChat: id }),
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
      pastStates: [...state.pastStates, state.resume].slice(-20),
      futureStates: [],
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
  // AI Suggestions Checklist
  editorSuggestions: [],
  setEditorSuggestions: (suggestions) => set({ editorSuggestions: suggestions }),
  updateSuggestionStatus: (id, status) => set((state) => {
    const newSuggestions = state.editorSuggestions.map(s => s.id === id ? { ...s, status } : s);
    
    // Also update the status inside resume.analysisResult to persist it
    let newAnalysisResult = state.resume.analysisResult;
    if (newAnalysisResult && newAnalysisResult.steps) {
      const newSteps = newAnalysisResult.steps.map(step => ({
        ...step,
        recommendations: step.recommendations.map(rec => 
          rec.suggestionId === id ? { ...rec, status } : rec
        )
      }));
      newAnalysisResult = { ...newAnalysisResult, steps: newSteps };
    }

    // If all suggestions are non-pending, trigger cooldown
    if (newSuggestions.length > 0 && newSuggestions.every(s => s.status !== 'pending')) {
      return { 
        editorSuggestions: newSuggestions,
        resume: { ...state.resume, analysisResult: newAnalysisResult },
        analysisResult: newAnalysisResult,
        isDirty: true,
        analysisCooldownUntil: Date.now() + 60000 // 1 minute cooldown
      };
    }
    return { 
      editorSuggestions: newSuggestions,
      resume: { ...state.resume, analysisResult: newAnalysisResult },
      analysisResult: newAnalysisResult,
      isDirty: true
    };
  }),
  analysisCooldownUntil: null,
  setAnalysisCooldownUntil: (time) => set({ analysisCooldownUntil: time }),

  // Methods
  updatePersonalInfo: (info) =>
    setWithHistory((state) => ({
      resume: {
        ...state.resume,
        personalInfo: { ...state.resume.personalInfo, ...info },
      },
      isDirty: true,
    })),
  updateSettings: (settings) =>
    setWithHistory((state) => ({
      resume: {
        ...state.resume,
        settings: { ...state.resume.settings, ...settings },
      },
      isDirty: true,
    })),
  addSection: (section) =>
    setWithHistory((state) => ({
      resume: {
        ...state.resume,
        sections: [...state.resume.sections, section],
      },
      isDirty: true,
    })),
  updateSection: (sectionId, data) =>
    setWithHistory((state) => ({
      resume: {
        ...state.resume,
        sections: state.resume.sections.map((s) =>
          s.id === sectionId ? { ...s, ...data } : s
        ),
      },
      isDirty: true,
    })),
  deleteSection: (sectionId) =>
    setWithHistory((state) => ({
      resume: {
        ...state.resume,
        sections: state.resume.sections.filter((s) => s.id !== sectionId),
      },
      isDirty: true,
    })),
  reorderSections: (sections) =>
    setWithHistory((state) => ({
      resume: {
        ...state.resume,
        sections,
      },
      isDirty: true,
    })),
  initBlankResume: () => set({ resume: blankResume, isDirty: false, pastStates: [], futureStates: [] }),
  updateTitle: (title) =>
    setWithHistory((state) => ({
      resume: {
        ...state.resume,
        title,
      },
      isDirty: true,
    })),

  acceptAiChanges: () => set((state) => {
    // Record decisions for all AI messages since the last divider
    let updatedResume = { ...state.resume };
    let updatedChatMessages = [...state.chatMessages];
    for (let i = updatedChatMessages.length - 1; i >= 0; i--) {
      const msg = updatedChatMessages[i];
      if (msg.type === 'divider') break;
      if (msg.role === 'ai') {
        const suggestionText = msg.thought || msg.text;
        // Ignore the initial greeting message
        if (suggestionText && !suggestionText.includes("Hi there! I can help you improve your resume")) {
          const accepted = updatedResume.acceptedSuggestions || [];
          if (!accepted.includes(suggestionText)) {
            updatedResume = { ...updatedResume, acceptedSuggestions: [...accepted, suggestionText] };
          }
        }
        // Update the visual status in the chat pane
        updatedChatMessages[i] = { ...msg, status: 'accepted' };
      }
    }

    // Apply pending changes
    if (state.pendingChanges) {
      updatedResume = { ...updatedResume, ...state.pendingChanges };
    }

    // Update active suggestion if needed
    let updatedSuggestions = state.editorSuggestions;
    if (state.activeSuggestionIdForChat) {
      updatedSuggestions = state.editorSuggestions.map((s) => 
        s.id === state.activeSuggestionIdForChat ? { ...s, status: 'accepted' as const } : s
      );
    }

    return {
      resume: updatedResume,
      pendingChanges: null,
      showOriginal: false,
      editorSuggestions: updatedSuggestions,
      activeSuggestionIdForChat: null,
      chatMessages: [
        ...updatedChatMessages,
        { role: "system", type: "divider", text: "Changes accepted. Context cleared." }
      ],
      isDirty: true
    };
  }),

  discardAiChanges: () => set((state) => {
    // Record decisions for all AI messages since the last divider
    let updatedResume = { ...state.resume };
    let updatedChatMessages = [...state.chatMessages];
    for (let i = updatedChatMessages.length - 1; i >= 0; i--) {
      const msg = updatedChatMessages[i];
      if (msg.type === 'divider') break;
      if (msg.role === 'ai') {
        const suggestionText = msg.thought || msg.text;
        // Ignore the initial greeting message
        if (suggestionText && !suggestionText.includes("Hi there! I can help you improve your resume")) {
          const rejected = updatedResume.rejectedSuggestions || [];
          if (!rejected.includes(suggestionText)) {
            updatedResume = { ...updatedResume, rejectedSuggestions: [...rejected, suggestionText] };
          }
        }
        // Update the visual status in the chat pane
        updatedChatMessages[i] = { ...msg, status: 'rejected' };
      }
    }

    // Update active suggestion if needed
    let updatedSuggestions = state.editorSuggestions;
    if (state.activeSuggestionIdForChat) {
      updatedSuggestions = state.editorSuggestions.map((s) => 
        s.id === state.activeSuggestionIdForChat ? { ...s, status: 'rejected' as const } : s
      );
    }

    return {
      resume: updatedResume,
      pendingChanges: null,
      showOriginal: false,
      editorSuggestions: updatedSuggestions,
      activeSuggestionIdForChat: null,
      chatMessages: [
        ...updatedChatMessages,
        { role: "system", type: "divider", text: "Changes discarded. Context cleared." }
      ],
      isDirty: true // technically we just mutated rejectedSuggestions so it is dirty
    };
  }),
  
  // History Methods
  pastStates: [],
  futureStates: [],
  undo: () => set((state) => {
    if (state.pastStates.length === 0) return state;
    // Commit any pending debounced change if we undo
    if (lastSnapshot) {
      clearTimeout(debounceTimeout);
      lastSnapshot = null;
    }
    const previous = state.pastStates[state.pastStates.length - 1];
    return {
      resume: previous,
      pastStates: state.pastStates.slice(0, -1),
      futureStates: [state.resume, ...state.futureStates],
      isDirty: true
    };
  }),
  redo: () => set((state) => {
    if (state.futureStates.length === 0) return state;
    if (lastSnapshot) {
      clearTimeout(debounceTimeout);
      lastSnapshot = null;
    }
    const next = state.futureStates[0];
    return {
      resume: next,
      pastStates: [...state.pastStates, state.resume],
      futureStates: state.futureStates.slice(1),
      isDirty: true
    };
  })
};
});
