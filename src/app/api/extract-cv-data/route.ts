import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/lib/gemini';
import { createClient } from '@/lib/supabase-server';

export const maxDuration = 60; // Allow up to 60 seconds for the AI response

const SYSTEM_PROMPT = `You are an expert CV Parser AI. Your task is to extract information from the following unstructured raw text (from a PDF) and convert it into a strictly structured JSON format matching our application's Resume data structure.

The target JSON structure has two main parts: "personalInfo" and "sections".

Target JSON Schema:
{
  "personalInfo": {
    "name": "Full Name",
    "jobTitle": "Target or Current Job Title (leave empty if not found)",
    "email": "email@example.com (leave empty if not found)",
    "phone": "Phone Number (leave empty if not found)",
    "location": "City, Country (Example: Bandung, Indonesia. leave empty if not found)",
    "linkedin": "LinkedIn URL (leave empty if not found)",
    "website": "Website URL (leave empty if not found)",
    "github": "Github URL (leave empty if not found)"
  },
  "sections": [
    {
      "id": "uuid-string (generate a random standard format uuid)",
      "type": "one of: experience, education, skills, projects, summary, custom",
      "title": "Section Title (e.g. Work Experience)",
      "order": 1,
      "items": [
        {
          "id": "uuid-string",
          "title": "Item Title (e.g. Job Title or Degree)",
          "subtitle": "Subtitle (e.g. Company or University)",
          "startDate": "Start Date (e.g. Jan 2020) (optional)",
          "endDate": "End Date (e.g. Present or Dec 2022) (optional)",
          "location": "Location (optional)",
          "description": [
            "Bullet point 1",
            "Bullet point 2"
          ],
          "order": 1
        }
      ]
    }
  ]
}

Instructions:
1. Extract the primary personal information into the 'personalInfo' object. If the value is missing, leave it as an empty string.
2. Categorize the rest into appropriate sections (experience, education, skills, projects, summary). If there are sections that don't fit these categories (like certifications, hobbies, awards, publications, etc.), capture them completely as sections with type "custom". DO NOT skip any valid custom sections present in the CV!
3. Format dates into clean string representations where possible. Set the 'order' field sequentially starting from 1 for both sections and items.
4. Generate valid UUID-like strings (e.g. '123e4567-e89b-12d3-a456-426614174000') for section ids and item ids.
5. DO NOT summarize, truncate, paraphrase, or omit ANY details from the original text! Keep the original wording completely intact, and format descriptions into clear bullet points (array of strings).
6. For the "summary" section, create an item with title "Professional Summary" and put the summary text as a single string in the description array.
7. For "skills", you can group them under a single item or multiple items depending on the CV format.
8. CRITICAL: Identify the original language of the CV (e.g., Indonesian, English). All extracted text MUST strictly remain in that original language. Do not translate the content.
9. Return strictly a valid JSON object without any markdown formatting. Do not wrap in \`\`\`json.
`;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { text } = body as { text: string };

    if (!text || text.trim() === '') {
      return NextResponse.json(
        { error: "No text provided to parse" },
        { status: 400 }
      );
    }

    const prompt = `${SYSTEM_PROMPT}\n\nHere is the raw text extracted from the CV to parse:\n"""\n${text}\n"""`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        temperature: 0.1, // Low temperature for factual extraction
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
      }
    });

    const responseText = response.text;
    
    if (!responseText) {
      throw new Error("No response text from Gemini");
    }
    
    const parsedData = JSON.parse(responseText);

    return NextResponse.json({ success: true, data: parsedData });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('CV Parse Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to parse CV text' },
      { status: 500 }
    );
  }
}
