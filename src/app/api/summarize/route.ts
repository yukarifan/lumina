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
          content: `Summarize the following analysis in 20 words or less, keep core terms and phrases: "${text}"`,
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