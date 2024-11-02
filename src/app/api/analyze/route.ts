import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ChatMessage {
  role: "assistant" | "user";
  content: string;
}

// Helper function to process the response text
const processLatexDelimiters = (text: string) => {
  return text
    // Replace \( \) with $ $
    .replace(/\\\((.*?)\\\)/g, '$$$1$$')
    // Replace \[ \] with $ $
    .replace(/\\\[(.*?)\\\]/g, '$$$1$$')
    // Replace $$ $$ with $ $
    .replace(/\$\$(.*?)\$\$/g, '$$$1$$');
};

export async function POST(request: Request) {
  try {
    const { image, question, history }: { 
      image?: string; 
      question?: string; 
      history?: ChatMessage[];
    } = await request.json();
    
    // Base message for image analysis
    const baseMessage = question 
      ? question 
      : "Please analyze this image from a PDF document and explain what you see. Be concise but informative.";

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
    
    // console.log('Original response:', response.choices[0].message.content);
    // console.log('Processed response:', analysis);

    return new Response(JSON.stringify({ analysis }));
  } catch (error) {
    console.error('Error in analyze route:', error);
    return new Response(JSON.stringify({ error: 'Failed to analyze image' }), { status: 500 });
  }
} 