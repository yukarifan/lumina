import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Analyze this conversation between User and AI. Create a brief summary (20 words max) that highlights:
1. The main topic or concept being discussed
2. Specifically identify what the user was confused about or asked for clarification on
3. The key conclusion or explanation provided

Example format:
"Topic: [main topic]. User confusion: [specific confusion]. Resolution: [key conclusion]"

Conversation:
${text}`,
        },
      ],
      max_tokens: 50,
    });

    return NextResponse.json({ 
      summary: response.choices[0]?.message?.content || "No summary available" 
    });
    
  } catch (error) {
    console.error('Error in summarize API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to summarize text', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
} 