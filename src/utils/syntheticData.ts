import { StudentHighlight } from '@/types/highlights';
import { HeatmapData } from '@/types/highlights';
const STUDENT_COUNT = 50;
const HIGHLIGHTS_PER_STUDENT = 3;

// Define page dimensions
const PAGE_WIDTH = 600;
const PAGE_HEIGHT = 800;

// Define base highlight patterns for each page
// Format: [pageNumber][boxGroup][startX, startY, endX, endY, variants]
const BASE_HIGHLIGHTS: number[][][] = [
  // Page 1 patterns
  [
    [20, 520, 320, 500, 8], 
    [400, 350, 550, 370, 6], 
  ],
  // Page 2 patterns
  [
    [60, 50, 500, 5, 14],  
    [400, 100, 550, 150, 12],
  ],
  // Add more pages as needed...
];

// Helper function to generate a variant of a base box
function generateVariant(
  baseBox: number[],
  maxWidth: number = PAGE_WIDTH,
  maxHeight: number = PAGE_HEIGHT,
  variance: number = 100
): [number, number, number, number] {
  const [baseStartX, baseStartY, baseEndX, baseEndY] = baseBox;
  
  // Generate random offsets within variance range
  const startXOffset = (Math.random() - 0.5) * variance;
  const startYOffset = (Math.random() - 0.5) * variance;
  const endXOffset = (Math.random() - 0.5) * variance;
  const endYOffset = (Math.random() - 0.5) * variance;
  
  // Apply offsets and ensure within bounds
  const startX = Math.max(0, Math.min(maxWidth, baseStartX + startXOffset));
  const startY = maxHeight - Math.max(0, Math.min(maxHeight, baseStartY + startYOffset));
  const endX = Math.max(0, Math.min(maxWidth, baseEndX + endXOffset));
  const endY = maxHeight - Math.max(0, Math.min(maxHeight, baseEndY + endYOffset));
  
  return [startX, startY, endX, endY];
}

export function generateSyntheticHighlights(pageCount: number = 8): StudentHighlight[] {
  const highlights: StudentHighlight[] = [];
  
  // Generate highlights for each page
  for (let pageIndex = 0; pageIndex < Math.min(pageCount, BASE_HIGHLIGHTS.length); pageIndex++) {
    const pagePatterns = BASE_HIGHLIGHTS[pageIndex];
    
    // Process each base pattern in the page
    pagePatterns.forEach(basePattern => {
      const [baseStartX, baseStartY, baseEndX, baseEndY, variants] = basePattern;
      
      // Generate the specified number of variants
      for (let i = 0; i < variants; i++) {
        const [startX, startY, endX, endY] = generateVariant(
          [baseStartX, baseStartY, baseEndX, baseEndY]
        );
        
        highlights.push({
          id: crypto.randomUUID(),
          studentId: `student_${Math.floor(Math.random() * 100)}`,
          pageNumber: pageIndex + 1,
          selection: {
            start: { x: startX, y: startY },
            end: { x: endX, y: endY }
          },
          timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
        });
      }
    });
  }
  
  return highlights;
}

export function generateRandomSyntheticHighlights(pageCount: number): StudentHighlight[] {
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