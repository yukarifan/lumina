"use client";
import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Minus, MousePointer, MessageSquare, X } from 'lucide-react';
import { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { ImageAnalyzer } from '@/app/components/ImageAnalyzer';

interface Selection {
  id?: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
}

interface AIResponse {
  id: string;
  text: string;
  timestamp: Date;
}

const PDFReader = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [scale, setScale] = useState(1.0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [currentSelection, setCurrentSelection] = useState<Selection | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [hoveredSelection, setHoveredSelection] = useState<string | null>(null);
  const [aiResponses, setAiResponses] = useState<AIResponse[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);

  useEffect(() => {
  const loadPdfJs = async () => {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      const pdfjsWorker = (await import('pdfjs-dist/build/pdf.worker.mjs')).default;
      // @ts-ignore
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
      return pdfjsLib;
    } catch (error) {
      console.warn('PDF.js worker initialization warning:', error);
      return await import('pdfjs-dist');
    }
  };

  loadPdfJs();
}, []);

  const loadPDF = async (file: File) => {
    setLoading(true);
    try {
      const pdfjsLib = await import('pdfjs-dist');
      const fileReader = new FileReader();

      fileReader.onload = async function(this: FileReader) {
        const typedarray = new Uint8Array(this.result as ArrayBuffer);
        const doc = await pdfjsLib.getDocument(typedarray).promise;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setPageNum(1);

        // Generate thumbnails
        const thumbnailsArray = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 0.2 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) return;
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;
          thumbnailsArray.push(canvas.toDataURL());
        }
        setThumbnails(thumbnailsArray);

        renderPage(1, doc);
      };

      fileReader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error loading PDF:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderPage = async (num: number, doc: PDFDocumentProxy | null = pdfDoc) => {
    if (!doc) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const page = await doc.getPage(num);
    const viewport = page.getViewport({ scale });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Set the same dimensions for overlay canvas
    const overlayCanvas = overlayCanvasRef.current;
    if (overlayCanvas) {
      overlayCanvas.height = viewport.height;
      overlayCanvas.width = viewport.width;
    }

    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };

    await page.render(renderContext).promise;
    drawSelectionOverlay(); // Draw selection overlay after rendering PDF
  };

  // Add this new function to handle overlay drawing
  const drawSelectionOverlay = () => {
    const overlayCanvas = overlayCanvasRef.current;
    if (!overlayCanvas) return;
    const context = overlayCanvas.getContext('2d');
    if (!context) return;

    context.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    if (selectionMode) {
      context.fillStyle = 'rgba(0, 0, 0, 0.5)';
      context.fillRect(0, 0, overlayCanvas.width, overlayCanvas.height);

      [...selections, currentSelection].filter(Boolean).forEach(selection => {
        if (!selection) return;
        
        // Scale the coordinates
        const scaledStart = {
          x: selection.start.x * scale,
          y: selection.start.y * scale
        };
        const scaledEnd = {
          x: selection.end.x * scale,
          y: selection.end.y * scale
        };
        
        const width = scaledEnd.x - scaledStart.x;
        const height = scaledEnd.y - scaledStart.y;
        const x = width >= 0 ? scaledStart.x : scaledEnd.x;
        const y = height >= 0 ? scaledStart.y : scaledEnd.y;
        const absWidth = Math.abs(width);
        const absHeight = Math.abs(height);

        context.clearRect(x, y, absWidth, absHeight);
        context.strokeStyle = '#0066cc';
        context.lineWidth = 2;
        context.strokeRect(x, y, absWidth, absHeight);

        // Only show delete button on hover
        if (selection.id && hoveredSelection === selection.id) {
          const btnSize = 24;
          const btnX = x + absWidth - btnSize - 8;
          const btnY = y + 8;
          
          context.save();
          context.globalAlpha = 0.9;
          
          context.shadowColor = 'rgba(0, 0, 0, 0.3)';
          context.shadowBlur = 8;
          context.shadowOffsetX = 2;
          context.shadowOffsetY = 2;
          
          context.beginPath();
          context.arc(btnX + btnSize/2, btnY + btnSize/2, btnSize/2, 0, Math.PI * 2);
          context.fillStyle = '#ff4444';
          context.fill();
          
          context.strokeStyle = 'white';
          context.lineWidth = 2.5;
          context.lineCap = 'round';
          context.beginPath();
          context.moveTo(btnX + 8, btnY + 8);
          context.lineTo(btnX + btnSize - 8, btnY + btnSize - 8);
          context.moveTo(btnX + btnSize - 8, btnY + 8);
          context.lineTo(btnX + 8, btnY + btnSize - 8);
          context.stroke();
          
          context.restore();
        }
      });
    }
  };

  // Update useEffect to only call drawSelectionOverlay for selection updates
  useEffect(() => {
    drawSelectionOverlay();
  }, [selections, currentSelection, selectionMode]);

  // Separate useEffect for PDF rendering
  useEffect(() => {
    if (pdfDoc) {
      renderPage(pageNum);
    }
  }, [pageNum, scale, pdfDoc]);

  const changePage = (offset: number) => {
    const newPage = pageNum + offset;
    if (numPages && newPage >= 1 && newPage <= numPages) {
      setPageNum(newPage);
    }
  };

  const adjustZoom = (delta: number) => {
    setScale(prevScale => {
      const newScale = prevScale + delta;
      return Math.min(Math.max(0.5, newScale), 2.0);
    });
  };

  const getScaledCoordinates = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    
    // Convert client coordinates to canvas coordinates
    const x = (clientX - rect.left) / scale;
    const y = (clientY - rect.top) / scale;
    
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectionMode) return;
    
    const { x, y } = getScaledCoordinates(e.clientX, e.clientY);
    
    setIsSelecting(true);
    setCurrentSelection({ start: { x, y }, end: { x, y } });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting || !selectionMode || !currentSelection) return;
    
    const { x, y } = getScaledCoordinates(e.clientX, e.clientY);
    
    setCurrentSelection(prev => prev ? { ...prev, end: { x, y } } : null);
  };

  const checkOverlap = (sel1: Selection, sel2: Selection) => {
    // Normalize coordinates to handle negative widths/heights
    const sel1X = Math.min(sel1.start.x, sel1.end.x);
    const sel1Y = Math.min(sel1.start.y, sel1.end.y);
    const sel1Width = Math.abs(sel1.end.x - sel1.start.x);
    const sel1Height = Math.abs(sel1.end.y - sel1.start.y);

    const sel2X = Math.min(sel2.start.x, sel2.end.x);
    const sel2Y = Math.min(sel2.start.y, sel2.end.y);
    const sel2Width = Math.abs(sel2.end.x - sel2.start.x);
    const sel2Height = Math.abs(sel2.end.y - sel2.start.y);

    return !(sel1X + sel1Width < sel2X || 
            sel2X + sel2Width < sel1X || 
            sel1Y + sel1Height < sel2Y || 
            sel2Y + sel2Height < sel1Y);
  };

  const handleMouseUp = () => {
    if (!selectionMode || !currentSelection) return;
    
    const hasOverlap = selections.some(existing => checkOverlap(existing, currentSelection));
    
    if (!hasOverlap) {
      const newSelection = { ...currentSelection, id: crypto.randomUUID() };
      setSelections(prev => [...prev, newSelection]);
      analyzeSelection(newSelection);
    }
    
    setIsSelecting(false);
    setCurrentSelection(null);
  };

  // Add a clear selections button to the toolbar
  const clearSelections = () => {
    setSelections([]);
    setCurrentSelection(null);
  };

  const handleOverlayMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isSelecting) {
      handleMouseMove(e);
      return;
    }

    const rect = overlayCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if mouse is over any selection
    const hoveredId = selections.find(selection => {
      const width = selection.end.x - selection.start.x;
      const height = selection.end.y - selection.start.y;
      const selX = width >= 0 ? selection.start.x : selection.end.x;
      const selY = height >= 0 ? selection.start.y : selection.end.y;
      const selWidth = Math.abs(width);
      const selHeight = Math.abs(height);

      return x >= selX && x <= selX + selWidth && y >= selY && y <= selY + selHeight;
    })?.id || null;

    setHoveredSelection(hoveredId);
  };

  const deleteSelection = (idToDelete: string) => {
    setSelections(prev => prev.filter(sel => sel.id !== idToDelete));
    setHoveredSelection(null);
  };

  // Add click handler for delete button
  const handleOverlayClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!hoveredSelection) return;

    const rect = overlayCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find the hovered selection
    const selection = selections.find(sel => sel.id === hoveredSelection);
    if (!selection) return;

    // Calculate delete button position
    const width = selection.end.x - selection.start.x;
    const height = selection.end.y - selection.start.y;
    const selX = width >= 0 ? selection.start.x : selection.end.x;
    const absWidth = Math.abs(width);
    const btnSize = 24; // Match the size used in drawSelectionOverlay
    const btnX = selX + absWidth - btnSize - 8;
    const btnY = height >= 0 ? selection.start.y : selection.end.y;

    // Check if click is within delete button
    if (x >= btnX && x <= btnX + btnSize && y >= btnY && y <= btnY + btnSize) {
      deleteSelection(hoveredSelection);
    }
  };

  // Update the analyzeSelection function to handle scaling
  const analyzeSelection = async (selection: Selection) => {
    if (!canvasRef.current) return;
    
    setIsAnalyzing(true);
    try {
      const tempCanvas = document.createElement('canvas');
      const context = tempCanvas.getContext('2d');
      if (!context) return;

      // Calculate scaled dimensions
      const width = Math.abs(selection.end.x - selection.start.x);
      const height = Math.abs(selection.end.y - selection.start.y);
      const x = Math.min(selection.start.x, selection.end.x);
      const y = Math.min(selection.start.y, selection.end.y);

      // Set canvas size to the unscaled dimensions
      tempCanvas.width = width;
      tempCanvas.height = height;

      // Copy the selected region, taking scale into account
      context.drawImage(
        canvasRef.current,
        x * scale, y * scale, width * scale, height * scale,
        0, 0, width, height
      );

      // Convert to base64
      const imageData = tempCanvas.toDataURL('image/png');

      // Send to API
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData })
      });

      const data = await response.json();
      
      // Add response to chat
      setAiResponses(prev => [...prev, {
        id: crypto.randomUUID(),
        text: data.analysis,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Error analyzing selection:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 flex no-scroll">
      {/* Left Sidebar - Thumbnails */}
      <div className="w-64 border-r bg-gray-50 scroll-y">
        <div className="p-4">
          <label className="block">
            <span className="sr-only">Choose PDF file</span>
            <div className="relative">
              <button 
                onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
                className="w-full py-2 px-4 rounded-full text-sm font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100"
              >
                Select PDF File
              </button>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => e.target.files?.[0] && loadPDF(e.target.files[0])}
                className="hidden"
              />
            </div>
          </label>
          <div className="mt-4 overflow-auto">
            {thumbnails.map((thumbnail, index) => (
              <div
                key={index}
                onClick={() => setPageNum(index + 1)}
                className={`p-2 cursor-pointer rounded ${pageNum === index + 1 ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
              >
                <img
                  src={thumbnail}
                  alt={`Page ${index + 1}`}
                  className="w-full border border-gray-200 rounded"
                />
                <div className="text-center text-sm mt-1">Page {index + 1}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main PDF Viewer */}
      <div className="flex-1 flex flex-col scroll-hidden">
        {/* Toolbar */}
        <div className="flex-none border-b p-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded hover:bg-gray-100"
            >
              <ChevronLeft className={`transform transition-transform ${!sidebarOpen && 'rotate-180'}`} />
            </button>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => changePage(-1)}
                className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
                disabled={pageNum <= 1}
              >
                <ChevronLeft />
              </button>
              <span>
                Page {pageNum} of {numPages || '--'}
              </span>
              <button
                onClick={() => changePage(1)}
                className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
                disabled={!numPages || pageNum >= numPages}
              >
                <ChevronRight />
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => adjustZoom(-0.1)}
                className="p-2 rounded hover:bg-gray-100"
              >
                <Minus size={20} />
              </button>
              <span>{(scale * 100).toFixed(0)}%</span>
              <button
                onClick={() => adjustZoom(0.1)}
                className="p-2 rounded hover:bg-gray-100"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="border-l pl-4 ml-4">
              <button
                onClick={() => setSelectionMode(!selectionMode)}
                className={`p-2 rounded hover:bg-gray-100 ${selectionMode ? 'bg-blue-100' : ''}`}
                title="Selection Tool"
              >
                <MousePointer size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* PDF View Area */}
        <div className="flex-1 scroll-y">
          <div className="flex justify-center p-4">
            {loading && (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading PDF...</div>
              </div>
            )}
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="shadow-lg bg-white"
              />
              <canvas
                ref={overlayCanvasRef}
                className="absolute top-0 left-0"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => setHoveredSelection(null)}
                onClick={handleOverlayClick}
                style={{ cursor: selectionMode ? 'crosshair' : 'default' }}
              />
            </div>
            {!pdfDoc && !loading && (
              <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow w-full max-w-2xl">
                <p className="text-gray-500">Please select a PDF file</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Analysis Panel */}
      <div className="w-96 border-l bg-white flex flex-col scroll-hidden">
        {/* Chat Header */}
        <div className="flex-none p-4 border-b">
          <h3 className="font-semibold">AI Analysis</h3>
        </div>

        {/* Chat Messages Container */}
        <div className="flex-1 scroll-y p-4">
          <div className="space-y-2">
            {aiResponses.map(response => (
              <div key={response.id} className="bg-blue-50 rounded-lg p-3">
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                  <ImageAnalyzer 
                    key={response.id}
                    image={response.text}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {response.timestamp.toLocaleTimeString()}
                </p>
              </div>
            ))}
            {isAnalyzing && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-500">Analyzing selection...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFReader;