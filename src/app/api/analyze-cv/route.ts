import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/lib/gemini';
import { Resume } from '@/types/resume';

const SYSTEM_PROMPT = `You are an elite Executive Recruiter and ATS (Applicant Tracking System) Specialist. Your objective is to critically analyze the provided CV and provide actionable, high-impact feedback to maximize the candidate's chances of landing interviews.

You will receive the CV data in a structured JSON format. 

Perform a rigorous review based on the following criteria:
1. Contact & Profile Completeness: Checks for consistency and completeness of contact information and personal details.
2. Summary: Analyzes summary for impact, clarity, and the inclusion of quantifiable achievements.
3. Experiences: Reviews work experience, projects, and volunteering sections for impact, clarity, and improvement opportunities (e.g. use of the XYZ formula).
4. Format & Structure: Checks for consistent formatting, skills, education, and a clear visual layout to ensure readability.

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
          "whyAndHowToFix": "<Concrete explanation on how to improve this specific part>"
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
      "id": "experiences",
      "title": "Experiences",
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

Make sure there are exactly 4 steps with IDs: "contact", "summary", "experiences", "format".
If a section looks perfect, the "recommendations" array should be empty [].`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resume } = body as { resume: Resume };

    // Strip out heavy/unnecessary UI settings to save tokens and focus the AI
    const sanitizedResume = {
      title: resume.title,
      personalInfo: resume.personalInfo,
      sections: resume.sections,
    };
    
    let targetRolePrompt = "";
    if (resume.personalInfo.jobTitle && resume.personalInfo.jobTitle.trim() !== "") {
      targetRolePrompt = `The candidate is specifically targeting the role of: "${resume.personalInfo.jobTitle}". Tailor your analysis and suggestions to maximize ATS compatibility and impact for this specific role.`;
    } else {
      targetRolePrompt = `The candidate has not specified a target role. Please analyze the CV generally as it would be perceived by an ATS, and infer the target industry/role based on the majority of their work experience and skills.`;
    }

    const currentDate = new Date();
    const currentMonthYear = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    const dateContextPrompt = `CRITICAL CONTEXT: The current date is ${currentMonthYear}. Any dates up to and including ${currentMonthYear} are considered in the past or present. Do NOT flag them as future dates.`;

    const prompt = `${SYSTEM_PROMPT}\n\n${dateContextPrompt}\n\n${targetRolePrompt}\n\nHere is the CV JSON to analyze:\n${JSON.stringify(sanitizedResume, null, 2)}`;

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
  } catch (error: any) {
    console.error('CV Analysis Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to analyze CV' },
      { status: 500 }
    );
  }
}
