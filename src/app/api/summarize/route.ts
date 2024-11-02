import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    
    // Mock summary response
    const mockSummary = "Topic: Geometric principles. User confusion: Triangle properties. Resolution: Explained Pythagorean theorem.";

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