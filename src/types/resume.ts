export interface Resume {
  id: string;
  userId: string;
  title: string;
  personalInfo: PersonalInfo;
  sections: Section[];
  settings: DocumentSettings;
  analysisResult?: AnalysisResult;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalInfo {
  name: string;
  jobTitle?: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  website?: string;
  github?: string;
  photoUrl?: string;
}

export type SectionType = "experience" | "education" | "skills" | "projects" | "custom" | "summary";

export interface Section {
  id: string;
  type: SectionType;
  title: string;
  items: ResumeItem[];
  order: number;
}

export interface ResumeItem {
  id: string;
  title: string;          // e.g., Job Title, Degree
  subtitle?: string;      // e.g., Company, University
  startDate?: string;
  endDate?: string;
  location?: string;
  description: string[];  // Bullet points
  order: number;
}

export interface DocumentSettings {
  pageSize?: "A4" | "Letter" | "Legal";
  linkOppositeMargins?: boolean;
  showRulers?: boolean;
  itemLayout?: "inline" | "separateRow";
  photoPosition?: "left" | "right";
  margin: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  typography: {
    fontFamily: string;
    fontSize: number;
    titleSize?: number;
    headingSize?: number;
    bodySize?: number;
    lineHeight: number;
    textAlign?: "left" | "justify";
  };
  spacing?: {
    nameGap: number;       // Space between name and job title
    headerGap: number;     // Space below Personal Info
    sectionGap: number;    // Space between major sections
    titleGap: number;      // Space between a Section Title and its items
    itemGap: number;       // Space between items within a section
    lineGap: number;       // Space between line 1 and line 2 of an item
    bulletGap: number;     // Space between description bullet points
  };
}

export type AnalysisMode = 'inactive' | 'overview' | 'step-detail' | 'chat';

export interface AnalysisRecommendation {
  title: string;
  whatToImprove: string;
  whyAndHowToFix: string;
}

export interface AnalysisStep {
  id: string; // 'contact' | 'summary' | 'experiences' | 'format'
  title: string;
  status: string; // e.g., '1 recommended improvement'
  overallAssessment: string;
  workingWell: string[];
  recommendations: AnalysisRecommendation[];
}

export interface AnalysisResult {
  score: number;
  steps: AnalysisStep[];
}
