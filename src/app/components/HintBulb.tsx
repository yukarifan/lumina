import React, { useState } from 'react';
import { Lightbulb } from 'lucide-react';

interface HintBulbProps {
  x: number;
  y: number;
  message: string;
  scale?: number;
}

export const HintBulb: React.FC<HintBulbProps> = ({ x, y, message, scale = 1 }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div 
      className="absolute z-50"
      style={{ 
        left: `${x * scale}px`,
        top: `${y * scale}px`,
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-full transition-all duration-300 ${
          isOpen 
            ? 'bg-yellow-400 text-white' 
            : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
        }`}
      >
        <Lightbulb size={20} />
      </button>

      {isOpen && (
        <div className="absolute left-full top-1/2 ml-2 -translate-y-1/2 bg-white rounded-lg shadow-lg border border-yellow-200 p-3 w-64">
          <p className="text-sm text-gray-700">{message}</p>
        </div>
      )}
    </div>
  );
}; 