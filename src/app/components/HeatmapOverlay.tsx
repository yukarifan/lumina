import { useEffect, useRef } from 'react';
import { HeatmapData } from '@/types/highlights';

interface HeatmapOverlayProps {
  heatmapData: HeatmapData;
  width: number;
  height: number;
}

export function HeatmapOverlay({ heatmapData, width, height }: HeatmapOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Find max intensity for normalization
    const maxIntensity = Math.max(...heatmapData.regions.map(r => r.intensity));

    // Draw heatmap
    heatmapData.regions.forEach(region => {
      const normalizedIntensity = region.intensity / maxIntensity;
      const alpha = Math.min(normalizedIntensity * 0.7, 0.7); // Cap at 0.7 opacity
      
      ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
      ctx.fillRect(region.x, region.y, 20, 20); // Use same gridSize as in generator
    });
  }, [heatmapData, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute top-0 left-0 pointer-events-none"
    />
  );
} 