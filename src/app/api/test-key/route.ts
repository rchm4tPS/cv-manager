import { NextResponse } from 'next/server';

export async function GET() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Key is missing" });
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key.trim()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Write a 5 word story." }] }]
      })
    });

    const data = await response.json();
    return NextResponse.json({ 
      status: response.status,
      data: data,
      keyLength: key.length,
      startsWithAQ: key.startsWith('AQ.')
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
