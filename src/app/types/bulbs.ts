export interface Bulb {
  id: string;
  pageNumber: number;
  position: {
    x: number;
    y: number;
  };
  message: string;
}

export interface BulbData {
  [pdfName: string]: {
    bulbs: Bulb[];
  };
} 