export interface AIResponse {
  id: string;
  text: string;
  timestamp: Date;
  imageData?: string;
  parentId?: string;
  role: 'user' | 'assistant';
} 