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
  // Page 3 patterns
  [
    [50, 600, 500, 580, 10],
    [100, 400, 450, 380, 8],
    [20, 320, 300, 20, 5],
  ],
  // Page 4 patterns
  [
    [40, 700, 560, 680, 12],
    [80, 500, 520, 480, 7],
    [300, 300, 500, 280, 6],
  ],
  // Page 5 patterns
  [
    [150, 650, 450, 630, 9],
    [50, 450, 550, 430, 11],
    [200, 250, 400, 230, 8],
  ],
  // Page 6 patterns
  [
    [100, 750, 500, 730, 7],
    [50, 550, 300, 530, 10],
    [350, 550, 550, 530, 10],
  ],
  // Page 7 patterns
  [
    [80, 600, 520, 580, 13],
    [120, 400, 480, 380, 9],
    [200, 150, 400, 130, 6],
  ],
  // Page 8 patterns
  [
    [50, 700, 550, 680, 8],
    [100, 500, 500, 480, 12],
    [150, 200, 450, 180, 7],
  ]
];

// Helper function to generate a variant of a base box
function generateVariant(
  baseBox: number[],
  maxWidth: number = PAGE_WIDTH,
  maxHeight: number = PAGE_HEIGHT,
  xVariance: number = 200,
  yVariance: number = 125
): [number, number, number, number] {
  const [baseStartX, baseStartY, baseEndX, baseEndY] = baseBox;
  
  // Generate random offsets with separate X and Y variances
  const startXOffset = (Math.random() - 0.5) * xVariance;
  const startYOffset = (Math.random() - 0.5) * yVariance;
  const endXOffset = (Math.random() - 0.5) * xVariance;
  const endYOffset = (Math.random() - 0.5) * yVariance;
  
  // Apply offsets and ensure within bounds
  const startX = Math.max(0, Math.min(maxWidth, baseStartX + startXOffset));
  const startY = maxHeight - Math.max(0, Math.min(maxHeight, baseStartY + startYOffset));
  const endX = Math.max(0, Math.min(maxWidth, baseEndX + endXOffset));
  const endY = maxHeight - Math.max(0, Math.min(maxHeight, baseEndY + endYOffset));
  
  return [startX, startY, endX, endY];
}

function generateRandomWord(length: number = 5): string {
  const vowels = 'aeiou';
  const consonants = 'bcdfghjklmnpqrstvwxyz';
  let word = '';
  
  for (let i = 0; i < length; i++) {
    if (i % 2 === 0) {
      word += consonants[Math.floor(Math.random() * consonants.length)];
    } else {
      word += vowels[Math.floor(Math.random() * vowels.length)];
    }
  }
  return word;
}

function generateRandomQuestion(): string {
  const words = Array.from({ length: 9 }, () => generateRandomWord());
  return `${words.join(' ')}?`;
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
          question: generateRandomQuestion(),
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
        question: generateRandomQuestion(),
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