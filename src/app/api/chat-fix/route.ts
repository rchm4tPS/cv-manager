import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/lib/gemini';
import { createClient } from '@/lib/supabase-server';
import { Resume, ChatMessage } from '@/types/resume';

export const maxDuration = 60; // Allow up to 60 seconds for the AI response

const SYSTEM_PROMPT = `You are an elite Resume AI Assistant. The user is asking you to fix or improve their CV based on AI recommendations or their own requests.
You will receive the user's current CV data in JSON format, the current analysis step context (if any), and the conversation history.

Your objective is to:
1. Understand the user's request.
2. Provide a brief, conversational response to the user acknowledging the change.
3. Provide the specific, modified CV data that applies the requested changes.

CRITICAL LANGUAGE RULE: Smartly identify the primary language of the CV's written content (e.g., English, Indonesian). Do NOT merely rely upon the user's country or location in their profile. If the CV contains mixed languages (e.g. English descriptions but Indonesian proper nouns like company or university names), determine the language based STRICTLY on the professional descriptions, summaries, and bullet points. NEVER respond in Indonesian just because of Indonesian proper nouns. All your thoughts, replies, and modified CV content MUST be written in the exact same language as the CV's primary descriptions.

You must return a JSON object matching this schema exactly:
{
  "thought": "Your step-by-step logical reasoning before making the fix.",
  "reply": "Your conversational response to the user.",
  "proposedChanges": {
     // A Partial Resume object containing the fields that were modified.
     // CRITICAL: If you modify ANY section, you MUST return the ENTIRE "sections" array containing ALL sections and ALL items, with your modifications applied. DO NOT delete or omit other items or sections!
     // DELETION RULE: If the user asks you to delete or remove a section or an item, DO NOT simply omit it from your response! Instead, you MUST include it and add a "_deleted": true property to it (e.g. { "id": "exp1", "_deleted": true }).
     // MULTI-SECTION UPDATES: If the user's request (e.g. adding a keyword) requires modifying MULTIPLE sections (like both 'summary' and 'skills'), you MUST modify all relevant sections. Do not limit yourself to just one section!
     // If you modified personal info, return the FULL "personalInfo" object.
     // Only include top-level keys ("personalInfo", "sections") if they were modified.
  }
}
`;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { resume, messages, stepId } = body as { 
      resume: Resume; 
      messages: { role: 'user' | 'ai'; text: string }[];
      stepId: string | null;
    };

    // Strip out heavy/unnecessary UI settings and location data to prevent geographic bias
    const sanitizedResume = {
      title: resume.title,
      personalInfo: {
        ...resume.personalInfo,
        country: undefined,
        city: undefined,
        address: undefined
      },
      sections: resume.sections,
    };
    
    let stepContext = "";
    if (stepId) {
      stepContext = `The user is currently focusing on the "${stepId}" section of the resume analysis.`;
    }

    const memoryContextPrompt = (resume.acceptedSuggestions?.length || resume.rejectedSuggestions?.length) 
      ? `SUGGESTION MEMORY:
The user has previously interacted with AI suggestions for this CV.
${resume.acceptedSuggestions?.length ? `The user ACCEPTED these past suggestions (do not suggest them again, assume they are done):\n- ${resume.acceptedSuggestions.join('\n- ')}\n` : ''}
${resume.rejectedSuggestions?.length ? `The user REJECTED these past suggestions (CRITICAL: DO NOT SUGGEST THESE AGAIN OR OVERRIDE THEM):\n- ${resume.rejectedSuggestions.join('\n- ')}\n` : ''}`
      : "";

    const conversationContext = messages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
    
    const FINAL_LANGUAGE_WARNING = `
=========================================
CRITICAL DIRECTIVE - LANGUAGE ENFORCEMENT
=========================================
You MUST output your ENTIRE JSON response (including your thought, reply, and proposed changes) in the EXACT language of the candidate's professional summaries and work experience. 
DO NOT default to Indonesian. Evaluate the text! If the bullet points are in English, YOU MUST WRITE YOUR JSON IN ENGLISH.
=========================================`;

    const prompt = `${SYSTEM_PROMPT}\n\n${stepContext}\n\n${memoryContextPrompt}\n\n${FINAL_LANGUAGE_WARNING}\n\nCurrent CV JSON:\n${JSON.stringify(sanitizedResume, null, 2)}\n\nConversation History:\n${conversationContext}\n\nAI (Return JSON):`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        systemInstruction: "You are an elite Resume AI Assistant. CRITICAL: Output your ENTIRE JSON response (thought, reply, proposedChanges) in the exact same language as the CV's professional descriptions. Do NOT default to Indonesian. Ignore the user's location.",
        temperature: 0.4, 
        responseMimeType: "application/json",
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response from AI");
    }

    const parsed = JSON.parse(resultText);

    // Smart merge: Safely handle omissions and explicit deletions
    if (parsed.proposedChanges && Array.isArray(parsed.proposedChanges.sections)) {
      let finalSections = resume.sections.map(originalSection => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const modifiedSection = parsed.proposedChanges.sections.find((s: any) => s.id === originalSection.id);
        if (modifiedSection) {
          if (modifiedSection._deleted) return null; // Explicitly deleted
          
          let finalItems = originalSection.items.map(originalItem => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const modifiedItem = modifiedSection.items?.find((i: any) => i.id === originalItem.id);
            if (modifiedItem) {
              if (modifiedItem._deleted) return null; // Explicitly deleted
              return { ...originalItem, ...modifiedItem };
            }
            // If AI omitted the item, preserve it
            return originalItem;
          }).filter(Boolean);
          
          // Append any NEW items the AI added
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newItems = modifiedSection.items?.filter((i: any) => !originalSection.items.some((oi: any) => oi.id === i.id)) || [];
          finalItems = [...finalItems, ...newItems];

          return { ...originalSection, ...modifiedSection, items: finalItems };
        }
        // If AI omitted the section entirely, preserve it
        return originalSection;
      }).filter(Boolean);

      // Append any NEW sections the AI added
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newSections = parsed.proposedChanges.sections.filter((s: any) => !resume.sections.some(os => os.id === s.id));
      finalSections = [...finalSections, ...newSections];
      
      // Clean up _deleted flags before returning
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      finalSections.forEach((s: any) => {
         delete s._deleted;
         // eslint-disable-next-line @typescript-eslint/no-explicit-any
         s.items?.forEach((i: any) => delete i._deleted);
      });

      parsed.proposedChanges.sections = finalSections;

      // Defensive pass: Ensure all items have a valid description array
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parsed.proposedChanges.sections.forEach((section: any) => {
        if (Array.isArray(section.items)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          section.items.forEach((item: any) => {
            if (item.description === undefined || item.description === null) {
              item.description = [];
            } else if (typeof item.description === 'string') {
              item.description = [item.description];
            } else if (!Array.isArray(item.description)) {
              item.description = [];
            }
          });
        }
      });
    }

    return NextResponse.json({ success: true, data: parsed });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("AI Fix Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate AI fix" },
      { status: 500 }
    );
  }
}
