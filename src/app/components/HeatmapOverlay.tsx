import { useEffect, useRef } from 'react';
import type { HeatmapData } from '@/types/highlights';
import { loadSelectionsFromFile, generateHeatmapData } from '@/utils/syntheticData';

interface HeatmapOverlayProps {
  width: number;
  height: number;
  pageNum: number;
  visible: boolean;
}

export function HeatmapOverlay({ width, height, pageNum, visible }: HeatmapOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const loadAndDrawHeatmap = async () => {
      if (!canvasRef.current || !visible) return;
      
      console.log('Loading heatmap data for page:', pageNum);
      const fileSelections = await loadSelectionsFromFile();
      console.log('Loaded selections:', fileSelections);
      
      const heatmapData = generateHeatmapData(
        fileSelections,
        pageNum,
        width,
        height
      );
      console.log('Generated heatmap data:', heatmapData);

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Create an offscreen canvas for the initial heat points
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = width;
      offscreenCanvas.height = height;
      const offscreenCtx = offscreenCanvas.getContext('2d');
      if (!offscreenCtx) return;

      // Find max intensity for normalization
      const maxIntensity = Math.max(...heatmapData.regions.map(r => r.intensity));

      // Draw initial heat points with radial gradients
      heatmapData.regions.forEach(region => {
        const normalizedIntensity = region.intensity / maxIntensity;
        const radius = 30; // Radius of influence for each point
        
        const gradient = offscreenCtx.createRadialGradient(
          region.x + 10, region.y + 10, 0,
          region.x + 10, region.y + 10, radius
        );
        
        gradient.addColorStop(0, `rgba(255, 0, 0, ${normalizedIntensity * 0.8})`);
        gradient.addColorStop(0.5, `rgba(255, 0, 0, ${normalizedIntensity * 0.4})`);
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        
        offscreenCtx.fillStyle = gradient;
        offscreenCtx.fillRect(
          region.x - radius,
          region.y - radius,
          radius * 2,
          radius * 2
        );
      });

      // Apply Gaussian blur for smoothing
      ctx.filter = 'blur(15px)';
      ctx.drawImage(offscreenCanvas, 0, 0);
      ctx.filter = 'none';

      // Apply color mapping
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3] / 255;
        
        if (alpha > 0) {
          // Create a color gradient (blue -> green -> yellow -> red)
          const intensity = alpha * 3; // Adjust multiplier for color distribution
          
          if (intensity <= 1) {
            // blue (0, 0, 255) to green (0, 255, 0)
            const t = intensity;
            data[i] = 0;                                // Red component
            data[i + 1] = Math.round(255 * t);         // Green component
            data[i + 2] = Math.round(255 * (1 - t));   // Blue component
          } else if (intensity <= 2) {
            // green (0, 255, 0) to yellow (255, 255, 0)
            const t = intensity - 1;
            data[i] = Math.round(255 * t);             // Red component
            data[i + 1] = 255;                         // Green component
            data[i + 2] = 0;                           // Blue component
          } else {
            // yellow (255, 255, 0) to red (255, 0, 0)
            const t = Math.min(1, intensity - 2);
            data[i] = 255;                             // Red component
            data[i + 1] = Math.round(255 * (1 - t));   // Green component
            data[i + 2] = 0;                           // Blue component
          }
          
          data[i + 3] = Math.min(255, alpha * 255); // Increased alpha for better visibility
        }
      }

      ctx.putImageData(imageData, 0, 0);
    };

    loadAndDrawHeatmap();
  }, [pageNum, width, height, visible]);

  if (!visible) return null;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute top-0 left-0 pointer-events-none"
    />
  );
} 