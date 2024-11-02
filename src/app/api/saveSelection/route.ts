import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { StudentHighlight } from '@/types/highlights';

export async function POST(request: Request) {
  try {
    const highlight: StudentHighlight = await request.json();
    
    // Get absolute path to selections.json in project root
    const dataPath = path.join(process.cwd(), 'src', 'data', 'selections.json');
    
    // Ensure directory exists
    const dir = path.dirname(dataPath);
    console.log('Creating directory:', dir);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Read existing data
    let selections = [];
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, 'utf8');
      selections = data ? JSON.parse(data) : [];
    }
    
    // Add new highlight
    selections.push({
      ...highlight,
      timestamp: new Date().toISOString() // Ensure timestamp is serializable
    });
    
    // Write back to file with pretty formatting
    fs.writeFileSync(dataPath, JSON.stringify(selections, null, 2), 'utf8');
    
    // console.log('Saved selection to:', dataPath); // Debug log
    
    return NextResponse.json({ success: true });
  } catch (error) {
    // console.error('Error saving selection:', error);
    return NextResponse.json({ 
      error: 'Failed to save selection',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 