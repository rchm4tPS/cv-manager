import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/lib/gemini';
import { Resume } from '@/types/resume';

export const maxDuration = 60; // Allow up to 60 seconds for the AI response

const SYSTEM_PROMPT = `You are an elite Executive Recruiter and ATS (Applicant Tracking System) Specialist. Your objective is to critically analyze the provided CV and provide actionable, high-impact feedback to maximize the candidate's chances of landing interviews.

You will receive the CV data in a structured JSON format. 

Perform a rigorous review based on the following criteria:
1. Contact & Profile Completeness: Checks for consistency and completeness of contact information and personal details.
2. Summary: Analyzes summary for impact, clarity, and the inclusion of quantifiable achievements.
3. Work Experience: Reviews work experience for impact, clarity, and improvement opportunities (e.g. use of the XYZ formula).
4. Projects: Reviews projects for technical depth, impact, and clarity.
5. Education: Reviews education section for relevance and format.
6. Skills: Checks for keyword optimization and skill relevance.
7. Format & Structure: Checks for overall consistent formatting and a clear visual layout to ensure readability.

CRITICAL LANGUAGE RULE: Identify the original language of the CV (e.g., Indonesian, English). All your analysis, feedback, and recommendations MUST be written in the exact same language as the CV. If the CV is in Indonesian, you MUST reply in Indonesian.

Return your complete analysis strictly as a JSON object matching the following structure exactly (do not wrap in markdown code blocks like \`\`\`json, just return the raw JSON object):

{
  "score": <number 0-100 representing the overall strength of the CV>,
  "steps": [
    {
      "id": "contact",
      "title": "Contact & Profile Completeness",
      "status": "<e.g., 'Looks good' or '1 recommended improvement'>",
      "overallAssessment": "<A brief 2-3 sentence overall assessment for this specific section>",
      "workingWell": [
        "<Highlight a specific strength in this section>",
        "<Highlight another strength>"
      ],
      "recommendations": [
        {
          "title": "<Short actionable title>",
          "whatToImprove": "<Description of the specific flaw>",
          "whyAndHowToFix": "<Concrete explanation on how to improve this specific part>",
          "targetSection": "<Strictly one of: 'contact', 'summary', 'experience', 'projects', 'education', 'skills', 'custom'>"
        }
      ]
    },
    {
      "id": "summary",
      "title": "Summary",
      "status": "...",
      "overallAssessment": "...",
      "workingWell": [...],
      "recommendations": [...]
    },
    {
      "id": "experience",
      "title": "Work Experience",
      "status": "...",
      "overallAssessment": "...",
      "workingWell": [...],
      "recommendations": [...]
    },
    {
      "id": "projects",
      "title": "Projects",
      "status": "...",
      "overallAssessment": "...",
      "workingWell": [...],
      "recommendations": [...]
    },
    {
      "id": "education",
      "title": "Education",
      "status": "...",
      "overallAssessment": "...",
      "workingWell": [...],
      "recommendations": [...]
    },
    {
      "id": "skills",
      "title": "Skills",
      "status": "...",
      "overallAssessment": "...",
      "workingWell": [...],
      "recommendations": [...]
    },
    {
      "id": "format",
      "title": "Format & Structure",
      "status": "...",
      "overallAssessment": "...",
      "workingWell": [...],
      "recommendations": [...]
    }
  ]
}

Make sure there are exactly 7 steps with IDs: "contact", "summary", "experience", "projects", "education", "skills", "format".
If a section looks perfect, or if the user's CV does not contain that specific section (e.g. they have no projects), the "recommendations" array should be empty [].`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resume, tailoringJob } = body as { resume: Resume, tailoringJob?: { company: string, position: string, description: string } };

    // Strip out heavy/unnecessary UI settings to save tokens and focus the AI
    const sanitizedResume = {
      title: resume.title,
      personalInfo: resume.personalInfo,
      sections: resume.sections,
    };
    
    let prompt = "";
    const currentDate = new Date();
    const currentMonthYear = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    const dateContextPrompt = `CRITICAL CONTEXT: The current date is ${currentMonthYear}. Any dates up to and including ${currentMonthYear} are considered in the past or present. Do NOT flag them as future dates.`;

    const memoryContextPrompt = (resume.acceptedSuggestions?.length || resume.rejectedSuggestions?.length) 
      ? `SUGGESTION MEMORY:
The user has previously interacted with AI suggestions for this CV.
${resume.acceptedSuggestions?.length ? `The user ACCEPTED these past suggestions (do not suggest them again, assume they are done):\n- ${resume.acceptedSuggestions.join('\n- ')}\n` : ''}
${resume.rejectedSuggestions?.length ? `The user REJECTED these past suggestions (CRITICAL: DO NOT SUGGEST THESE AGAIN):\n- ${resume.rejectedSuggestions.join('\n- ')}\n` : ''}`
      : "";

    if (tailoringJob) {
      const TAILORING_PROMPT = `You are an elite Executive Recruiter and ATS (Applicant Tracking System) Specialist. Your objective is to exclusively TAILOR the provided CV to match the provided Job Description.

First, extract the most critical hard skills, soft skills, and keywords from the Job Description.
Then, evaluate how well the CV aligns with these extracted keywords.

Return your complete analysis strictly as a JSON object matching the following structure exactly (do not wrap in markdown code blocks like \`\`\`json, just return the raw JSON object):

{
  "score": <number 0-100 representing how well the CV currently matches the JD>,
  "steps": [
    {
      "id": "keywords",
      "title": "JD Keyword Analysis",
      "status": "<e.g., 'Missing 3 critical skills' or 'Highly aligned'>",
      "overallAssessment": "<List the core keywords from the JD and assess if the CV has them>",
      "workingWell": ["<keyword found in CV>", "<another found keyword>"],
      "recommendations": [
        {
          "title": "Add missing keyword: [Keyword]",
          "whatToImprove": "The JD requires [Keyword] but it is missing.",
          "whyAndHowToFix": "Add [Keyword] to your Skills or Summary section.",
          "targetSection": "skills"
        }
      ]
    },
    {
      "id": "summary-match",
      "title": "Summary Alignment",
      "status": "<e.g., 'Needs targeting'>",
      "overallAssessment": "<Assess how well the summary positions the candidate for this specific role>",
      "workingWell": [],
      "recommendations": []
    },
    {
      "id": "experience-match",
      "title": "Experience Alignment",
      "status": "<e.g., 'Highlight relevant experience'>",
      "overallAssessment": "<Assess how well the work experiences highlight the required skills for this role>",
      "workingWell": [],
      "recommendations": []
    },
    {
      "id": "projects-match",
      "title": "Projects Alignment",
      "status": "...",
      "overallAssessment": "<Assess how well projects demonstrate the required JD skills>",
      "workingWell": [],
      "recommendations": []
    },
    {
      "id": "education-match",
      "title": "Education Alignment",
      "status": "...",
      "overallAssessment": "<Assess how well education supports the JD requirements>",
      "workingWell": [],
      "recommendations": []
    }
  ]
}

Make sure there are exactly 5 steps with IDs: "keywords", "summary-match", "experience-match", "projects-match", "education-match".
If a section is perfectly aligned, or if the CV lacks it, the "recommendations" array should be empty [].`;

      const tailoringContext = `CRITICAL: The candidate is specifically tailoring their CV for the position of "${tailoringJob.position}" at "${tailoringJob.company}".\nHere is the Job Description:\n"""\n${tailoringJob.description}\n"""\nYou MUST cross-reference the CV with the Job Description. Highlight missing keywords, required skills, and suggest specific rewrites in the CV to directly match the Job Description requirements. Surface these missing keywords as high-priority actionable recommendations.`;
      
      prompt = `${TAILORING_PROMPT}\n\n${dateContextPrompt}\n\n${memoryContextPrompt}\n\n${tailoringContext}\n\nHere is the CV JSON to analyze:\n${JSON.stringify(sanitizedResume, null, 2)}`;
    } else {
      let targetRolePrompt = "";
      if (resume.personalInfo.jobTitle && resume.personalInfo.jobTitle.trim() !== "") {
        targetRolePrompt = `The candidate is specifically targeting the role of: "${resume.personalInfo.jobTitle}". Tailor your analysis and suggestions to maximize ATS compatibility and impact for this specific role.`;
      } else {
        targetRolePrompt = `The candidate has not specified a target role. Please analyze the CV generally as it would be perceived by an ATS, and infer the target industry/role based on the majority of their work experience and skills.`;
      }
      prompt = `${SYSTEM_PROMPT}\n\n${dateContextPrompt}\n\n${memoryContextPrompt}\n\n${targetRolePrompt}\n\nHere is the CV JSON to analyze:\n${JSON.stringify(sanitizedResume, null, 2)}`;
    }

    // Note: Assuming ai.models.generateContent is the correct method from @google/genai
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        temperature: 0.2, // Low temperature for more consistent, analytical output
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    
    if (!text) {
      throw new Error("No response text from Gemini");
    }
    
    const analysisResult = JSON.parse(text);

    return NextResponse.json({ success: true, data: analysisResult });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('CV Analysis Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to analyze CV' },
      { status: 500 }
    );
  }
}
