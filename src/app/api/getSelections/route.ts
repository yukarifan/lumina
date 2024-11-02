import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { StudentHighlight } from '@/types/highlights';

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), 'src', 'data', 'selections.json');
    
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({ selections: [] });
    }
    
    const data = fs.readFileSync(dataPath, 'utf8');
    const selections: StudentHighlight[] = JSON.parse(data);
    
    return NextResponse.json({ selections });
  } catch (error) {
    console.error('Error loading selections:', error);
    return NextResponse.json({ 
      error: 'Failed to load selections',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 