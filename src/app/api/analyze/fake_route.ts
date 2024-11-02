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
    
    // Validate required fields
    if (!image && !question) {
      return NextResponse.json({ 
        error: 'Missing required fields', 
        details: 'Either image or question must be provided'
      }, { status: 400 });
    }

    // Mock response based on whether it's a question or general analysis
    const mockResponse = question 
      ? "This appears to be a mathematical equation showing the relationship between energy and mass. The equation E=mc² is Einstein's famous mass-energy equivalence formula, where E represents energy, m represents mass, and c represents the speed of light in vacuum."
      : "I can see a diagram illustrating basic geometric principles. There's a right triangle with sides labeled a, b, and c, demonstrating the Pythagorean theorem (a²+b²=c²).";

    return NextResponse.json({ analysis: mockResponse });
    
  } catch (error) {
    console.error('Error in analyze route:', error);
    return NextResponse.json({ 
      error: 'Failed to analyze image',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 