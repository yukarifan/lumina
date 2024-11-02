import { StudentHighlight } from '@/types/highlights';
import { HeatmapData } from '@/types/highlights';
const STUDENT_COUNT = 50;
const HIGHLIGHTS_PER_STUDENT = 3;

export function generateSyntheticHighlights(pageCount: number): StudentHighlight[] {
  const highlights: StudentHighlight[] = [];
  
  for (let i = 0; i < STUDENT_COUNT; i++) {
    const studentId = `student_${i}`;
    
    for (let j = 0; j < HIGHLIGHTS_PER_STUDENT; j++) {
      const pageNumber = Math.floor(Math.random() * pageCount) + 1;
      
      // Generate random coordinates within typical page dimensions
      const startX = Math.random() * 600;
      const startY = Math.random() * 800;
      const width = Math.random() * 200 + 50;
      const height = Math.random() * 100 + 20;
      
      highlights.push({
        id: crypto.randomUUID(),
        studentId,
        pageNumber,
        selection: {
          start: { x: startX, y: startY },
          end: { x: startX + width, y: startY + height }
        },
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random time in last week
      });
    }
  }
  
  return highlights;
}

export function generateHeatmapData(
  highlights: StudentHighlight[],
  pageNumber: number,
  canvasWidth: number,
  canvasHeight: number
): HeatmapData {
  const regions: HeatmapData['regions'] = [];
  const gridSize = 20; // Size of each heatmap cell
  
  // Create a grid to accumulate highlight counts
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