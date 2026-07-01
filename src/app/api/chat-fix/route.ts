import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/lib/gemini';

export const maxDuration = 60; // Allow up to 60 seconds for the AI response
import { Resume } from '@/types/resume';

const SYSTEM_PROMPT = `You are an elite Resume AI Assistant. The user is asking you to fix or improve their CV based on AI recommendations or their own requests.
You will receive the user's current CV data in JSON format, the current analysis step context (if any), and the conversation history.

Your objective is to:
1. Understand the user's request.
2. Provide a brief, conversational response to the user acknowledging the change.
3. Provide the specific, modified CV data that applies the requested changes.

You must return a JSON object matching this schema exactly:
{
  "thought": "Your step-by-step logical reasoning before making the fix.",
  "reply": "Your conversational response to the user.",
  "proposedChanges": {
     // A Partial Resume object containing the fields that were modified.
     // CRITICAL: If you modify ANY section, you MUST return the ENTIRE "sections" array containing ALL sections and ALL items, with your modifications applied. DO NOT delete or omit other items or sections!
     // MULTI-SECTION UPDATES: If the user's request (e.g. adding a keyword) requires modifying MULTIPLE sections (like both 'summary' and 'skills'), you MUST modify all relevant sections. Do not limit yourself to just one section!
     // If you modified personal info, return the FULL "personalInfo" object.
     // Only include top-level keys ("personalInfo", "sections") if they were modified.
  }
}
`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resume, messages, stepId } = body as { 
      resume: Resume; 
      messages: { role: 'user' | 'ai'; text: string }[];
      stepId: string | null;
    };

    // Strip out heavy/unnecessary UI settings to save tokens
    const sanitizedResume = {
      title: resume.title,
      personalInfo: resume.personalInfo,
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

    const prompt = `${SYSTEM_PROMPT}\n\n${stepContext}\n\n${memoryContextPrompt}\n\nCurrent CV JSON:\n${JSON.stringify(sanitizedResume, null, 2)}\n\nConversation History:\n${conversationContext}\n\nAI (Return JSON):`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        temperature: 0.4, 
        responseMimeType: "application/json",
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response from AI");
    }

    const parsed = JSON.parse(resultText);

    // Smart merge: if the AI returned fewer sections than the original, it likely only returned the modified ones.
    if (parsed.proposedChanges && Array.isArray(parsed.proposedChanges.sections)) {
      if (parsed.proposedChanges.sections.length > 0 && parsed.proposedChanges.sections.length < resume.sections.length) {
        // Merge them into the original sections array
        const mergedSections = resume.sections.map(originalSection => {
          const modifiedSection = parsed.proposedChanges.sections.find((s: any) => s.id === originalSection.id);
          if (modifiedSection) {
            // Also merge items if the AI only returned modified items
            if (Array.isArray(modifiedSection.items) && modifiedSection.items.length < originalSection.items.length) {
              const mergedItems = originalSection.items.map((originalItem: any) => {
                const modifiedItem = modifiedSection.items.find((i: any) => i.id === originalItem.id);
                return modifiedItem ? { ...originalItem, ...modifiedItem } : originalItem;
              });
              return { ...originalSection, ...modifiedSection, items: mergedItems };
            }
            return { ...originalSection, ...modifiedSection };
          }
          return originalSection;
        });
        parsed.proposedChanges.sections = mergedSections;
      }

      // Defensive pass: Ensure all items have a valid description array
      parsed.proposedChanges.sections.forEach((section: any) => {
        if (Array.isArray(section.items)) {
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

  } catch (error: any) {
    console.error("AI Fix Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate AI fix" },
      { status: 500 }
    );
  }
}
