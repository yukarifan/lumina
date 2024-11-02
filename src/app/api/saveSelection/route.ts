import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { StudentHighlight } from '@/types/highlights';

export async function POST(request: Request) {
  try {
    const highlight: StudentHighlight = await request.json();
    const dataPath = path.join(process.cwd(), 'data.txt');
    const highlightData = JSON.stringify(highlight) + '\n';
    
    fs.appendFileSync(dataPath, highlightData, 'utf8');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving selection:', error);
    return NextResponse.json({ error: 'Failed to save selection' }, { status: 500 });
  }
} 