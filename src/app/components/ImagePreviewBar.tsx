import React from 'react';
import { X, Image as ImageIcon } from 'lucide-react';

interface ImagePreviewBarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  images: { 
    id: string; 
    data: string; 
    timestamp?: Date; 
    analysis?: string;
    summary?: string;
  }[];
  onDeleteImage: (id: string) => void;
}

export function ImagePreviewBar({
  isOpen,
  setIsOpen,
  images,
  onDeleteImage
}: ImagePreviewBarProps) {
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded hover:bg-gray-100 ${isOpen ? 'bg-blue-100' : ''}`}
        title="View Captured Images"
      >
        <ImageIcon size={20} />
      </button>

      {isOpen && (
        <div className="absolute top-12 right-0 bg-white shadow-lg rounded-lg p-4 w-[500px] z-50">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-sm">Captured Images & Analysis</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X size={16} />
            </button>
          </div>
          
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {images.map((img) => (
              <div key={img.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="w-1/2">
                    <img 
                      src={img.data} 
                      alt="Captured section" 
                      className="w-full object-contain border border-gray-200 rounded"
                    />
                  </div>
                  <div className="w-1/2 pl-3">
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {img.summary || img.analysis || 'Analysis not available'}
                    </div>
                    {img.timestamp && (
                      <div className="text-xs text-gray-500 mt-2">
                        {img.timestamp.toLocaleString()}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => onDeleteImage(img.id)}
                    className="p-1 hover:bg-gray-100 rounded ml-2"
                  >
                    <X size={16} className="text-gray-500" />
                  </button>
                </div>
              </div>
            ))}
            
            {images.length === 0 && (
              <div className="text-gray-500 text-sm text-center py-4">
                No images captured yet
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 