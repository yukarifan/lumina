import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { image } = await request.json();
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Please analyze this image from a PDF document and explain what you see. Be concise but informative." },
            {
              type: "image_url",
              image_url: {
                url: image,
                detail: "high"
              }
            }
          ],
        },
      ],
      max_tokens: 300,
    });

    return NextResponse.json({ 
      analysis: response.choices[0]?.message?.content || "No analysis available" 
    });
    
  } catch (error) {
    console.error('Error in analyze API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze image', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
} 