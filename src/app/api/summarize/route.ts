import { NextResponse } from 'next/server';

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

Example format:
"Topic: [main topic]. User confusion: [specific confusion]."

Conversation:
${text}`,
        },
      ],
      max_tokens: 50,
    });

    return NextResponse.json({ summary: mockSummary });
    
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