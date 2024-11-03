import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { StudentHighlight } from '@/types/highlights';

export async function POST(request: Request) {
  try {
    const { id, question } = await request.json();
    
    const dataPath = path.join(process.cwd(), 'src', 'data', 'selections.json');
    
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({ error: 'Selections file not found' }, { status: 404 });
    }
    
    const data = fs.readFileSync(dataPath, 'utf8');
    const selections: StudentHighlight[] = JSON.parse(data);
    
    // Find and update the selection
    const selectionIndex = selections.findIndex(s => s.id === id);
    if (selectionIndex === -1) {
      return NextResponse.json({ error: 'Selection not found' }, { status: 404 });
    }
    
    selections[selectionIndex].question = question;
    
    // Write back to file with pretty formatting
    fs.writeFileSync(dataPath, JSON.stringify(selections, null, 2), 'utf8');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating question:', error);
    return NextResponse.json({ 
      error: 'Failed to update question',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 