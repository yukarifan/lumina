export interface StudentHighlight {
  id: string;
  studentId: string;
  pageNumber: number;
  selection: {
    start: { x: number; y: number };
    end: { x: number; y: number };
  };
  question: string;
  timestamp: Date;
}

export interface HeatmapData {
  pageNumber: number;
  regions: {
    x: number;
    y: number;
    intensity: number;
  }[];
} 