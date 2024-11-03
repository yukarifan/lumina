// First, define the structure for a bulb in the JSON
interface BulbData {
  id: string;
  pageNumber: number;
  position: {
    x: number;
    y: number;
  };
  message: string;
}

// Interface for the bulb info used in the component
export interface BulbInfo {
  x: number;
  y: number;
  message: string;
  id?: string;
  pageNumber?: number;
}

// Interface for the PDF bulbs structure
export interface PDFBulbs {
  [pdfName: string]: {
    bulbs: BulbData[]; // Use BulbData here instead of BulbInfo
  };
} 