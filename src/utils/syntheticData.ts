import { StudentHighlight } from '@/types/highlights';
import { HeatmapData } from '@/types/highlights';
import * as fs from 'fs';
import * as path from 'path';

const STUDENT_COUNT = 50;
const HIGHLIGHTS_PER_STUDENT = 3;
const PAGE_WIDTH = 600;
const PAGE_HEIGHT = 800;

// Function to save selection to data.txt
export async function saveSelectionToFile(highlight: StudentHighlight) {
  try {
    await fetch('/api/saveSelection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(highlight),
    });
  } catch (error) {
    console.error('Error saving selection:', error);
  }
}

// Modified generateHeatmapData to use random data
export function generateHeatmapData(
  highlights: StudentHighlight[],
  pageNumber: number,
  canvasWidth: number,
  canvasHeight: number
): HeatmapData {
  const regions: HeatmapData['regions'] = [];
  const gridSize = 20;
  
  // Create grid to accumulate highlight counts
  const grid: number[][] = Array(Math.ceil(canvasHeight / gridSize))
    .fill(0)
    .map(() => Array(Math.ceil(canvasWidth / gridSize)).fill(0));
  
  // Count highlights in each grid cell
  highlights
    .filter(h => h.pageNumber === pageNumber)
    .forEach(highlight => {
      const startGridX = Math.floor(highlight.selection.start.x / gridSize);
      const startGridY = Math.floor(highlight.selection.start.y / gridSize);
      const endGridX = Math.floor(highlight.selection.end.x / gridSize);
      const endGridY = Math.floor(highlight.selection.end.y / gridSize);
      
      for (let y = startGridY; y <= endGridY; y++) {
        for (let x = startGridX; x <= endGridX; x++) {
          if (grid[y]?.[x] !== undefined) {
            grid[y][x]++;
          }
        }
      }
    });
  
  // Convert grid to regions
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] > 0) {
        regions.push({
          x: x * gridSize,
          y: y * gridSize,
          intensity: grid[y][x]
        });
      }
    }
  }
  
  return {
    pageNumber,
    regions
  };
}

export async function loadSelectionsFromFile(): Promise<StudentHighlight[]> {
  try {
    console.log('Fetching selections from API...');
    const response = await fetch('/api/getSelections');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Loaded selections:', data.selections);
    return data.selections;
  } catch (error) {
    console.error('Error loading selections:', error);
    return [];
  }
} 