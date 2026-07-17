import { create } from 'zustand';
import { Resume, DocumentSettings, Section, AnalysisResult, AnalysisMode, ChatMessage, EditorSuggestion } from '@/types/resume';
import { supabaseApi } from '@/lib/supabase-api';

export type DescIndex = number | { oldVal?: string, newVal?: string, index?: number };
export type UserMetadata = { name?: string; full_name?: string; email?: string; avatar_url?: string; picture?: string; [key: string]: unknown };

interface ResumeStore {
  resume: Resume;
  appTheme: 'default' | 'anthropic';
  setAppTheme: (theme: 'default' | 'anthropic') => void;
  tailoringJob: { id: string; company: string; position: string; description?: string } | null;
  setResume: (resume: Resume) => void;
  setTailoringJob: (job: { id: string; company: string; position: string; description?: string } | null) => void;
  updatePersonalInfo: (info: Partial<Resume['personalInfo']>) => void;
  updateSettings: (settings: Partial<DocumentSettings>) => void;
  addSection: (section: Section) => void;
  updateSection: (sectionId: string, data: Partial<Section>) => void;
  deleteSection: (sectionId: string) => void;
  reorderSections: (sections: Section[]) => void;
  initBlankResume: (userId: string, userMetadata?: UserMetadata) => void;
  updateTitle: (title: string) => void;
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
  recordSuggestionDecision: (suggestionText: string, decision: 'accepted' | 'rejected') => void;
  removeSuggestionDecision: (index: number, decision: 'accepted' | 'rejected' | 'partially_accepted') => void;
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
  acceptPartialChange: (sectionId: string, itemId: string, fieldType: 'title'|'subtitle'|'location'|'startDate'|'endDate'|'description'|'deleted_section'|'deleted_item'|'new_section'|'new_item', descIndex?: DescIndex) => { isComplete: boolean, finalStatus?: string } | void;
  rejectPartialChange: (sectionId: string, itemId: string, fieldType: 'title'|'subtitle'|'location'|'startDate'|'endDate'|'description'|'deleted_section'|'deleted_item'|'new_section'|'new_item', descIndex?: DescIndex) => { isComplete: boolean, finalStatus?: string } | void;
  partialDecisions: { accepted: number; rejected: number };
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
  // Dashboard List State
  resumeList: Resume[];
  isListLoading: boolean;
  hasLoadedList: boolean;
  fetchResumeList: (userId: string, force?: boolean) => Promise<void>;
  deleteResumeFromList: (id: string) => Promise<boolean>;
  syncResumeToList: (resume: Resume) => void;
}

const createBlankResume = (userId: string, userMetadata?: UserMetadata): Resume => ({
  id: 'new',
  userId: userId,
  title: 'Untitled Resume',
  personalInfo: {
    name: userMetadata?.name || userMetadata?.full_name || '',
    jobTitle: '',
    email: userMetadata?.email || '',
    phone: '',
    location: '',
    linkedin: '',
    website: '',
    github: '',
    photoUrl: userMetadata?.avatar_url || userMetadata?.picture || undefined,
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
});

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

const getInitialTheme = (): 'default' | 'anthropic' => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('appTheme');
      if (stored === 'anthropic' || stored === 'default') {
        return stored;
      }
    } catch {
      return 'default';
    }
  }
  return 'default';
};

function hasPendingChangesRemaining(resume: Resume, pendingChanges: Partial<Resume> | null): boolean {
   if (!pendingChanges) return false;
   
   if (pendingChanges.personalInfo) {
      const keys: (keyof typeof resume.personalInfo)[] = ['name', 'jobTitle', 'email', 'phone', 'location', 'linkedin', 'website', 'github'];
      for (const key of keys) {
         if (pendingChanges.personalInfo[key] !== undefined && pendingChanges.personalInfo[key] !== resume.personalInfo[key]) {
            return true;
         }
      }
   }

   if (pendingChanges.sections) {
      for (const rs of resume.sections) {
         const ps = pendingChanges.sections.find(s => s.id === rs.id);
         if (!ps) return true;
         
         if (ps.title !== undefined && ps.title !== rs.title) return true;

         for (const ri of rs.items) {
            const pi = ps.items.find(i => i.id === ri.id);
            if (!pi) return true;
            
            if (pi.title !== undefined && pi.title !== ri.title) return true;
            if (pi.subtitle !== undefined && pi.subtitle !== ri.subtitle) return true;
            if (pi.location !== undefined && pi.location !== ri.location) return true;
            if (pi.startDate !== undefined && pi.startDate !== ri.startDate) return true;
            if (pi.endDate !== undefined && pi.endDate !== ri.endDate) return true;
            
            if (pi.description) {
               if (pi.description.length !== ri.description.length) return true;
               for (let i = 0; i < pi.description.length; i++) {
                  if (pi.description[i] !== ri.description[i]) return true;
               }
            }
         }
         
         for (const pi of ps.items) {
            const ri = rs.items.find(i => i.id === pi.id);
            if (!ri) return true;
         }
      }
      
      for (const ps of pendingChanges.sections) {
         const rs = resume.sections.find(s => s.id === ps.id);
         if (!rs) return true;
      }
   }
   
   return false;
}

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
  resume: createBlankResume(""),
  tailoringJob: getInitialTailoringJob(),
  isDirty: false,
  setIsDirty: (dirty) => set({ isDirty: dirty }),
  setResume: (resume) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newSuggestions: any[] = [];
    if (resume.analysisResult && resume.analysisResult.steps) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resume.analysisResult.steps.forEach((step: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  removeSuggestionDecision: (index, decision) => setWithHistory((state) => {
    const resume = { ...state.resume };
    if (decision === 'accepted' && resume.acceptedSuggestions) {
      resume.acceptedSuggestions = resume.acceptedSuggestions.filter((_, i) => i !== index);
    } else if (decision === 'rejected' && resume.rejectedSuggestions) {
      resume.rejectedSuggestions = resume.rejectedSuggestions.filter((_, i) => i !== index);
    } else if (decision === 'partially_accepted' && resume.partiallyAcceptedSuggestions) {
      resume.partiallyAcceptedSuggestions = resume.partiallyAcceptedSuggestions.filter((_, i) => i !== index);
    }
    return { resume, isDirty: true };
  }),

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
  setPendingChanges: (changes) => set({ pendingChanges: changes, showOriginal: false, partialDecisions: { accepted: 0, rejected: 0 } }),
  showOriginal: false,
  setShowOriginal: (show) => set({ showOriginal: show }),
  chatMessages: [
    { role: "ai", text: "Hi there! I can help you improve your resume. Ask me for feedback or improvements, and I can directly edit your resume." }
  ],
  setChatMessages: (messages) => set({ chatMessages: messages }),
  pendingAiMessage: null,
  setPendingAiMessage: (message) => set({ pendingAiMessage: message }),
  activeSuggestionIdForChat: null,
  setActiveSuggestionIdForChat: (id) => set({ activeSuggestionIdForChat: id, partialDecisions: { accepted: 0, rejected: 0 } }),
  partialDecisions: { accepted: 0, rejected: 0 },
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

  appTheme: getInitialTheme(),
  setAppTheme: (theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('appTheme', theme);
    }
    set({ appTheme: theme });
  },

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
  initBlankResume: (userId: string, userMetadata?: UserMetadata) => set({ 
    resume: createBlankResume(userId, userMetadata), 
    isDirty: false, 
    pastStates: [], 
    futureStates: [],
    analysisResult: null,
    editorSuggestions: [],
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
  }),
  updateTitle: (title) =>
    setWithHistory((state) => ({
      resume: {
        ...state.resume,
        title,
      },
      isDirty: true,
    })),

  acceptAiChanges: () => setWithHistory((state) => {
    // Record decisions for all AI messages since the last divider
    let updatedResume = { ...state.resume };
    const updatedChatMessages = [...state.chatMessages];
    let updatedLatestAiMsg = false;
    for (let i = updatedChatMessages.length - 1; i >= 0; i--) {
      const msg = updatedChatMessages[i];
      if (msg.type === 'divider') break;
      if (msg.role === 'ai') {
        const suggestionText = msg.thought || msg.text;
        // Ignore the initial greeting message
        if (suggestionText && !suggestionText.includes("Hi there! I can help you improve your resume")) {
          if (!updatedLatestAiMsg) {
            const isPartial = state.partialDecisions.rejected > 0;
            if (isPartial) {
              const partials = updatedResume.partiallyAcceptedSuggestions || [];
              if (!partials.includes(suggestionText)) {
                updatedResume = { ...updatedResume, partiallyAcceptedSuggestions: [...partials, suggestionText] };
              }
            } else {
              const accepted = updatedResume.acceptedSuggestions || [];
              if (!accepted.includes(suggestionText)) {
                updatedResume = { ...updatedResume, acceptedSuggestions: [...accepted, suggestionText] };
              }
            }
            // Update the visual status in the chat pane
            updatedChatMessages[i] = { ...msg, status: isPartial ? 'partially_accepted' : 'accepted' };
            updatedLatestAiMsg = true;
          }
        }
      }
    }

    // Apply pending changes
    if (state.pendingChanges) {
      updatedResume = { ...updatedResume, ...state.pendingChanges };
    }

    // Update active suggestion if needed
    let updatedSuggestions = state.editorSuggestions;
    if (state.activeSuggestionIdForChat) {
      updatedSuggestions = state.editorSuggestions.map((s) => {
        if (s.id === state.activeSuggestionIdForChat) {
          const isPartial = state.partialDecisions.rejected > 0;
          return { ...s, status: isPartial ? 'partially_accepted' : 'accepted' };
        }
        return s;
      });
    }

    // Sync status back to analysisResult so it gets saved
    let newAnalysisResult = updatedResume.analysisResult;
    if (state.activeSuggestionIdForChat && newAnalysisResult && newAnalysisResult.steps) {
      newAnalysisResult = {
        ...newAnalysisResult,
        steps: newAnalysisResult.steps.map(step => ({
          ...step,
          recommendations: step.recommendations.map(rec => 
            rec.suggestionId === state.activeSuggestionIdForChat ? { ...rec, status: (state.partialDecisions.rejected > 0 ? 'partially_accepted' : 'accepted') } : rec
          )
        }))
      };
      updatedResume = { ...updatedResume, analysisResult: newAnalysisResult };
    }

    return {
      resume: updatedResume,
      analysisResult: newAnalysisResult,
      pendingChanges: null,
      showOriginal: false,
      editorSuggestions: updatedSuggestions,
      activeSuggestionIdForChat: null,
      chatMessages: [
        ...updatedChatMessages,
        { role: "system", type: "divider", text: state.partialDecisions.rejected > 0 ? "Partially accepted. Context cleared." : "Changes accepted. Context cleared." }
      ],
      isDirty: true
    };
  }),

  discardAiChanges: () => set((state) => {
    // Record decisions for all AI messages since the last divider
    let updatedResume = { ...state.resume };
    const updatedChatMessages = [...state.chatMessages];
    let updatedLatestAiMsg = false;
    for (let i = updatedChatMessages.length - 1; i >= 0; i--) {
      const msg = updatedChatMessages[i];
      if (msg.type === 'divider') break;
      if (msg.role === 'ai') {
        const suggestionText = msg.thought || msg.text;
        // Ignore the initial greeting message
        if (suggestionText && !suggestionText.includes("Hi there! I can help you improve your resume")) {
          if (!updatedLatestAiMsg) {
            const isPartial = state.partialDecisions.accepted > 0;
            if (isPartial) {
              const partials = updatedResume.partiallyAcceptedSuggestions || [];
              if (!partials.includes(suggestionText)) {
                updatedResume = { ...updatedResume, partiallyAcceptedSuggestions: [...partials, suggestionText] };
              }
            } else {
              const rejected = updatedResume.rejectedSuggestions || [];
              if (!rejected.includes(suggestionText)) {
                updatedResume = { ...updatedResume, rejectedSuggestions: [...rejected, suggestionText] };
              }
            }
            // Update the visual status in the chat pane
            updatedChatMessages[i] = { ...msg, status: isPartial ? 'partially_accepted' : 'rejected' };
            updatedLatestAiMsg = true;
          }
        }
      }
    }

    // Update active suggestion if needed
    let updatedSuggestions = state.editorSuggestions;
    if (state.activeSuggestionIdForChat) {
      updatedSuggestions = state.editorSuggestions.map((s) => {
        if (s.id === state.activeSuggestionIdForChat) {
          const isPartial = state.partialDecisions.accepted > 0;
          return { ...s, status: isPartial ? 'partially_accepted' : 'rejected' };
        }
        return s;
      });
    }

    // Sync status back to analysisResult so it gets saved
    let newAnalysisResult = updatedResume.analysisResult;
    if (state.activeSuggestionIdForChat && newAnalysisResult && newAnalysisResult.steps) {
      newAnalysisResult = {
        ...newAnalysisResult,
        steps: newAnalysisResult.steps.map(step => ({
          ...step,
          recommendations: step.recommendations.map(rec => 
            rec.suggestionId === state.activeSuggestionIdForChat ? { ...rec, status: (state.partialDecisions.accepted > 0 ? 'partially_accepted' : 'rejected') } : rec
          )
        }))
      };
      updatedResume = { ...updatedResume, analysisResult: newAnalysisResult };
    }

    return {
      resume: updatedResume,
      analysisResult: newAnalysisResult,
      pendingChanges: null,
      showOriginal: false,
      editorSuggestions: updatedSuggestions,
      activeSuggestionIdForChat: null,
      chatMessages: [
        ...updatedChatMessages,
        { role: "system", type: "divider", text: state.partialDecisions.accepted > 0 ? "Partially accepted. Context cleared." : "Changes discarded. Context cleared." }
      ],
      isDirty: true // technically we just mutated rejectedSuggestions so it is dirty
    };
  }),

  acceptPartialChange: (sectionId, itemId, fieldType, descIndex) => {
    setWithHistory((state) => {
    if (!state.pendingChanges) return state;
    
    const newResume = { ...state.resume };
    const newSections = [...newResume.sections];
    const newPendingChanges = { ...state.pendingChanges };
    const newPendingSections = [...(newPendingChanges.sections || [])];

    let changeApplied = false;

    if (sectionId === 'personalInfo') {
      const field = fieldType as keyof typeof newResume.personalInfo;
      const pendingValue = newPendingChanges.personalInfo?.[field];
      if (pendingValue !== undefined) {
        newResume.personalInfo = {
          ...newResume.personalInfo,
          [field]: pendingValue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
        // Update pendingChanges to match the accepted state so isComplete triggers properly
        newPendingChanges.personalInfo = {
          ...newPendingChanges.personalInfo,
          [field]: pendingValue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
        changeApplied = true;
      }
    } else if (fieldType === 'deleted_section') {
      const targetSectionIdx = newSections.findIndex(s => s.id === sectionId);
      if (targetSectionIdx !== -1) {
        newSections.splice(targetSectionIdx, 1);
        newResume.sections = newSections;
        changeApplied = true;
      }
    } else if (fieldType === 'new_section') {
      const pendingSection = newPendingSections.find(s => s.id === sectionId);
      if (pendingSection) {
        newSections.push({ ...pendingSection });
        newResume.sections = newSections;
        changeApplied = true;
      }
    } else if (fieldType === 'new_item') {
      const targetSectionIdx = newSections.findIndex(s => s.id === sectionId);
      const pendingSection = newPendingSections.find(s => s.id === sectionId);
      if (pendingSection) {
        const pendingItem = pendingSection.items.find(i => i.id === itemId);
        if (pendingItem) {
          if (targetSectionIdx !== -1) {
            const newSection = { ...newSections[targetSectionIdx] };
            const newItems = [...newSection.items];
            newItems.push({ ...pendingItem });
            newSection.items = newItems;
            newSections[targetSectionIdx] = newSection;
          } else {
            // If the section doesn't exist yet, create it with just this item
            newSections.push({ ...pendingSection, items: [{ ...pendingItem }] });
          }
          newResume.sections = newSections;
          changeApplied = true;
        }
      }
    } else if (fieldType === 'deleted_item') {
      const targetSectionIdx = newSections.findIndex(s => s.id === sectionId);
      if (targetSectionIdx !== -1) {
        const newSection = { ...newSections[targetSectionIdx] };
        const newItems = [...newSection.items];
        const targetItemIdx = newItems.findIndex(i => i.id === itemId);
        if (targetItemIdx !== -1) {
          newItems.splice(targetItemIdx, 1);
          newSection.items = newItems;
          newSections[targetSectionIdx] = newSection;
          newResume.sections = newSections;
          changeApplied = true;
        }
      }
    } else {
      const targetSectionIdx = newSections.findIndex(s => s.id === sectionId);
      const pendingSectionIdx = newPendingSections.findIndex(s => s.id === sectionId);
      
      if (targetSectionIdx !== -1 && pendingSectionIdx !== -1) {
        const newSection = { ...newSections[targetSectionIdx] };
        const pendingSection = { ...newPendingSections[pendingSectionIdx] };

        if (itemId === '') {
          if (fieldType === 'title') {
            newSection.title = pendingSection.title;
          }
          newSections[targetSectionIdx] = newSection;
          newResume.sections = newSections;
          changeApplied = true;
        } else {
          const newItems = [...newSection.items];
          const targetItemIdx = newItems.findIndex(i => i.id === itemId);
          const pendingItems = [...pendingSection.items];
          const pendingItemIdx = pendingItems.findIndex(i => i.id === itemId);

          if (targetItemIdx !== -1 && pendingItemIdx !== -1) {
            const newItem = { ...newItems[targetItemIdx] };
            const pendingItem = { ...pendingItems[pendingItemIdx] };

            if (fieldType === 'description' && descIndex !== undefined) {
              const newDesc = [...newItem.description];
              const pendingDesc = [...pendingItem.description];
              if (typeof descIndex === 'object') {
                 const { oldVal, newVal, index } = descIndex as { oldVal?: string, newVal?: string, index?: number };
                 if (oldVal !== undefined && newVal !== undefined) {
                    const idx = newDesc.indexOf(oldVal);
                    if (idx !== -1) newDesc[idx] = newVal;
                    else if (index !== undefined) newDesc[index] = newVal;
                 } else if (oldVal !== undefined && newVal === undefined) {
                    const idx = newDesc.indexOf(oldVal);
                    if (idx !== -1) newDesc.splice(idx, 1);
                 } else if (oldVal === undefined && newVal !== undefined) {
                    const idxInPending = pendingDesc.indexOf(newVal);
                    newDesc.splice(idxInPending, 0, newVal);
                 }
              } else {
                 if (descIndex < pendingDesc.length) {
                   newDesc[descIndex as number] = pendingDesc[descIndex as number];
                 } else {
                   newDesc.splice(descIndex as number, 1);
                 }
              }
              newItem.description = newDesc;
            } else {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (newItem as any)[fieldType] = (pendingItem as any)[fieldType];
            }

            newItems[targetItemIdx] = newItem;
            newSection.items = newItems;
            newSections[targetSectionIdx] = newSection;
            newResume.sections = newSections;

            pendingItems[pendingItemIdx] = pendingItem;
            pendingSection.items = pendingItems;
            newPendingSections[pendingSectionIdx] = pendingSection;
            newPendingChanges.sections = newPendingSections;
            changeApplied = true;
          }
        }
      }
    }

    if (!changeApplied) return state;

    const isComplete = !hasPendingChangesRemaining(newResume, newPendingChanges);
    
    let updatedChatMessages = state.chatMessages;
    let partialDecisions = { ...state.partialDecisions, accepted: state.partialDecisions.accepted + 1 };
    
    if (isComplete) {
       updatedChatMessages = [...state.chatMessages];
       let updatedLatestAiMsg = false;
       
       let finalStatus: 'accepted' | 'rejected' | 'partially_accepted' | 'superseded' = 'partially_accepted';
       let finalMessage = "Partially accepted. Context cleared.";
       
       if (partialDecisions.rejected === 0) {
           finalStatus = 'accepted';
           finalMessage = "Changes accepted. Context cleared.";
       }
       
       for (let i = updatedChatMessages.length - 1; i >= 0; i--) {
         const msg = updatedChatMessages[i];
         if (msg.type === 'divider') break;
         if (msg.role === 'ai') {
           const suggestionText = msg.thought || msg.text;
           if (suggestionText && !suggestionText.includes("Hi there! I can help you improve your resume")) {
             if (!updatedLatestAiMsg) {
               updatedChatMessages[i] = { ...msg, status: finalStatus };
               updatedLatestAiMsg = true;
             }
           }
         }
       }
       updatedChatMessages.push({ role: "system", type: "divider", text: finalMessage });
       partialDecisions = { accepted: 0, rejected: 0 };
    }
    
    let updatedSuggestions = state.editorSuggestions;
    if (isComplete && state.activeSuggestionIdForChat) {
      updatedSuggestions = state.editorSuggestions.map((s) => {
        if (s.id === state.activeSuggestionIdForChat) {
          const finalStatus = state.partialDecisions.rejected === 0 ? 'accepted' : 'partially_accepted';
          return { ...s, status: finalStatus };
        }
        return s;
      });
    }

    let newAnalysisResult = newResume.analysisResult;
    if (isComplete && state.activeSuggestionIdForChat && newAnalysisResult && newAnalysisResult.steps) {
      const finalStatus = state.partialDecisions.rejected === 0 ? 'accepted' : 'partially_accepted';
      newAnalysisResult = {
        ...newAnalysisResult,
        steps: newAnalysisResult.steps.map(step => ({
          ...step,
          recommendations: step.recommendations.map(rec => 
            rec.suggestionId === state.activeSuggestionIdForChat ? { ...rec, status: finalStatus } : rec
          )
        }))
      };
      newResume.analysisResult = newAnalysisResult;
    }

    return {
      resume: newResume,
      analysisResult: newAnalysisResult,
      pendingChanges: isComplete ? null : newPendingChanges,
      partialDecisions,
      ...(isComplete ? { chatMessages: updatedChatMessages, activeSuggestionIdForChat: null, editorSuggestions: updatedSuggestions } : {}),
      isDirty: true
    };
    });
    const state = get();
    if (!state.pendingChanges) {
        const lastMsg = state.chatMessages[state.chatMessages.length - 1];
        const text = lastMsg?.text || "";
        let status = 'partially_accepted';
        if (text.includes("Changes accepted")) status = 'accepted';
        return { isComplete: true, finalStatus: status };
    }
    return { isComplete: false };
  },

  rejectPartialChange: (sectionId, itemId, fieldType, descIndex) => {
    setWithHistory((state) => {
    if (!state.pendingChanges) return state;
    
    const newPendingChanges = { ...state.pendingChanges };
    const newPendingSections = [...(newPendingChanges.sections || [])];
    
    let changeApplied = false;

    if (sectionId === 'personalInfo') {
      const field = fieldType as keyof typeof state.resume.personalInfo;
      if (newPendingChanges.personalInfo) {
        newPendingChanges.personalInfo = {
          ...newPendingChanges.personalInfo,
          [field]: state.resume.personalInfo[field]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
        changeApplied = true;
      }
    } else if (fieldType === 'deleted_section') {
      const targetSection = state.resume.sections.find(s => s.id === sectionId);
      if (targetSection) {
        const originalIdx = state.resume.sections.findIndex(s => s.id === sectionId);
        newPendingSections.splice(originalIdx, 0, targetSection);
        newPendingChanges.sections = newPendingSections;
        changeApplied = true;
      }
    } else if (fieldType === 'new_section') {
      const pendingIdx = newPendingSections.findIndex(s => s.id === sectionId);
      if (pendingIdx !== -1) {
        newPendingSections.splice(pendingIdx, 1);
        newPendingChanges.sections = newPendingSections;
        changeApplied = true;
      }
    } else if (fieldType === 'new_item') {
      const pendingSectionIdx = newPendingSections.findIndex(s => s.id === sectionId);
      if (pendingSectionIdx !== -1) {
        const pendingSection = { ...newPendingSections[pendingSectionIdx] };
        const pendingItems = [...pendingSection.items];
        const pendingItemIdx = pendingItems.findIndex(i => i.id === itemId);
        if (pendingItemIdx !== -1) {
          pendingItems.splice(pendingItemIdx, 1);
          pendingSection.items = pendingItems;
          newPendingSections[pendingSectionIdx] = pendingSection;
          newPendingChanges.sections = newPendingSections;
          changeApplied = true;
        }
      }
    } else if (fieldType === 'deleted_item') {
      const targetSection = state.resume.sections.find(s => s.id === sectionId);
      const targetItem = targetSection?.items.find(i => i.id === itemId);
      
      if (targetSection && targetItem) {
        const pendingSectionIdx = newPendingSections.findIndex(s => s.id === sectionId);
        if (pendingSectionIdx !== -1) {
           const pendingSection = { ...newPendingSections[pendingSectionIdx] };
           const pendingItems = [...pendingSection.items];
           const originalItemIdx = targetSection.items.findIndex(i => i.id === itemId);
           pendingItems.splice(originalItemIdx, 0, targetItem);
           pendingSection.items = pendingItems;
           newPendingSections[pendingSectionIdx] = pendingSection;
           newPendingChanges.sections = newPendingSections;
           changeApplied = true;
        }
      }
    } else {
      const targetSection = state.resume.sections.find(s => s.id === sectionId);
      const targetItem = targetSection?.items.find(i => i.id === itemId);
      const pendingSectionIdx = newPendingSections.findIndex(s => s.id === sectionId);
      
      if (targetSection && pendingSectionIdx !== -1) {
        const pendingSection = { ...newPendingSections[pendingSectionIdx] };

        if (itemId === '') {
          if (fieldType === 'title') {
            pendingSection.title = targetSection.title;
          }
          newPendingSections[pendingSectionIdx] = pendingSection;
          newPendingChanges.sections = newPendingSections;
          changeApplied = true;
        } else if (targetItem) {
          const pendingItems = [...pendingSection.items];
          const pendingItemIdx = pendingItems.findIndex(i => i.id === itemId);

          if (pendingItemIdx !== -1) {
            const pendingItem = { ...pendingItems[pendingItemIdx] };

            if (fieldType === 'description' && descIndex !== undefined) {
              const newPendingDesc = [...pendingItem.description];
              const resumeDesc = [...state.resume.sections.find(s => s.id === sectionId)!.items.find(i => i.id === itemId)!.description];
              if (typeof descIndex === 'object') {
                 const { oldVal, newVal } = descIndex as { oldVal?: string, newVal?: string };
                 if (oldVal !== undefined && newVal !== undefined) {
                    const idx = newPendingDesc.indexOf(newVal);
                    if (idx !== -1) newPendingDesc[idx] = oldVal;
                 } else if (oldVal !== undefined && newVal === undefined) {
                    const idxInResume = resumeDesc.indexOf(oldVal);
                    newPendingDesc.splice(idxInResume, 0, oldVal);
                 } else if (oldVal === undefined && newVal !== undefined) {
                    const idx = newPendingDesc.indexOf(newVal);
                    if (idx !== -1) newPendingDesc.splice(idx, 1);
                 }
              } else {
                 if (descIndex < resumeDesc.length) {
                   newPendingDesc[descIndex as number] = resumeDesc[descIndex as number];
                 } else {
                   newPendingDesc.splice(descIndex as number, 1);
                 }
              }
              pendingItem.description = newPendingDesc;
            } else {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (pendingItem as any)[fieldType] = (targetItem as any)[fieldType];
            }

            pendingItems[pendingItemIdx] = pendingItem;
            pendingSection.items = pendingItems;
            newPendingSections[pendingSectionIdx] = pendingSection;
            newPendingChanges.sections = newPendingSections;
            changeApplied = true;
          }
        }
      }
    }

    if (!changeApplied) return state;

    const isComplete = !hasPendingChangesRemaining(state.resume, newPendingChanges);
    
    let updatedChatMessages = state.chatMessages;
    let partialDecisions = { ...state.partialDecisions, rejected: state.partialDecisions.rejected + 1 };
    
    if (isComplete) {
       updatedChatMessages = [...state.chatMessages];
       let updatedLatestAiMsg = false;
       
       let finalStatus: 'accepted' | 'rejected' | 'partially_accepted' | 'superseded' = 'partially_accepted';
       let finalMessage = "Partially accepted. Context cleared.";
       
       if (partialDecisions.accepted === 0) {
           finalStatus = 'rejected';
           finalMessage = "Changes rejected. Context cleared.";
       }
       
       for (let i = updatedChatMessages.length - 1; i >= 0; i--) {
         const msg = updatedChatMessages[i];
         if (msg.type === 'divider') break;
         if (msg.role === 'ai') {
           const suggestionText = msg.thought || msg.text;
           if (suggestionText && !suggestionText.includes("Hi there! I can help you improve your resume")) {
             if (!updatedLatestAiMsg) {
               updatedChatMessages[i] = { ...msg, status: finalStatus };
               updatedLatestAiMsg = true;
             }
           }
         }
       }
       updatedChatMessages.push({ role: "system", type: "divider", text: finalMessage });
       partialDecisions = { accepted: 0, rejected: 0 };
    }
    
    let updatedSuggestions = state.editorSuggestions;
    if (isComplete && state.activeSuggestionIdForChat) {
      updatedSuggestions = state.editorSuggestions.map((s) => {
        if (s.id === state.activeSuggestionIdForChat) {
          const finalStatus = state.partialDecisions.accepted === 0 ? 'rejected' : 'partially_accepted';
          return { ...s, status: finalStatus };
        }
        return s;
      });
    }

    let newAnalysisResult = state.resume.analysisResult;
    if (isComplete && state.activeSuggestionIdForChat && newAnalysisResult && newAnalysisResult.steps) {
      const finalStatus = state.partialDecisions.accepted === 0 ? 'rejected' : 'partially_accepted';
      newAnalysisResult = {
        ...newAnalysisResult,
        steps: newAnalysisResult.steps.map(step => ({
          ...step,
          recommendations: step.recommendations.map(rec => 
            rec.suggestionId === state.activeSuggestionIdForChat ? { ...rec, status: finalStatus } : rec
          )
        }))
      };
    }

    return {
      ...(isComplete && newAnalysisResult ? { resume: { ...state.resume, analysisResult: newAnalysisResult }, analysisResult: newAnalysisResult } : {}),
      pendingChanges: isComplete ? null : newPendingChanges,
      partialDecisions,
      ...(isComplete ? { chatMessages: updatedChatMessages, activeSuggestionIdForChat: null, editorSuggestions: updatedSuggestions } : {}),
      isDirty: isComplete
    };
    });
    const state = get();
    if (!state.pendingChanges) {
        const lastMsg = state.chatMessages[state.chatMessages.length - 1];
        const text = lastMsg?.text || "";
        let status = 'partially_accepted';
        if (text.includes("Changes rejected")) status = 'rejected';
        return { isComplete: true, finalStatus: status };
    }
    return { isComplete: false };
  },
  
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
  }),
  
  // Dashboard List Methods
  resumeList: [],
  isListLoading: false,
  hasLoadedList: false,
  fetchResumeList: async (userId, force = false) => {
    const { hasLoadedList, isListLoading } = get();
    if (isListLoading) return;
    if (hasLoadedList && !force) return;

    if (!hasLoadedList) set({ isListLoading: true });
    try {
      const data = await supabaseApi.getResumes(userId);
      if (data) {
        set({ resumeList: data, hasLoadedList: true });
      }
    } catch (error) {
      console.error('Failed to fetch resume list:', error);
    } finally {
      set({ isListLoading: false });
    }
  },
  deleteResumeFromList: async (id: string) => {
    const previousList = get().resumeList;
    set((state) => ({ resumeList: state.resumeList.filter(r => r.id !== id) }));
    
    try {
      const success = await supabaseApi.deleteResume(id);
      if (!success) {
        set({ resumeList: previousList });
        return false;
      }
      return true;
    } catch (error) {
      console.error('Failed to delete resume:', error);
      set({ resumeList: previousList });
      return false;
    }
  },
  syncResumeToList: (resume) => set((state) => {
    const list = state.resumeList;
    const exists = list.some(r => r.id === resume.id);
    if (exists) {
      return { resumeList: list.map(r => r.id === resume.id ? resume : r) };
    } else {
      return { resumeList: [resume, ...list] };
    }
  })
};
});
