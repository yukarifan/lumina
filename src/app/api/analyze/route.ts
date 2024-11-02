import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Log the raw request body for debugging
    const rawBody = await request.text();
    // console.log('Raw request body:', rawBody);

    // Try to parse the body
    let body;
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json({ 
        error: 'Invalid JSON in request body',
        details: parseError instanceof Error ? parseError.message : String(parseError)
      }, { status: 400 });
    }

    const { image, question } = body;
    
    // Base message for image analysis
    const baseMessage = question 
      ? question 
      : "The picture is from user, a student. Please analyze this image from a PDF document, give a concise summary, and ask the user to clarify any confusion. Be concise but informative.";

    const messages = [
      // Include conversation history if available
      ...(history?.map(msg => ({
        role: msg.role as "assistant" | "user",
        content: msg.content
      })) || []),
      {
        role: "user",
        content: [
          { type: "text", text: baseMessage },
          ...(image ? [{
            type: "image_url",
            image_url: {
              url: image,
              detail: "high"
            }
          }] : [])
        ]
      },
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages as any,
      max_tokens: 500,
    });

    const analysis = processLatexDelimiters(response.choices[0].message.content || '');
    
  } catch (error) {
    console.error('Error in analyze route:', error);
    return NextResponse.json({ 
      error: 'Failed to analyze image',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 