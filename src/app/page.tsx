"use client";
import React, { useEffect, useRef, useState, JSX, ComponentPropsWithoutRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Minus, MousePointer, GalleryVerticalEnd, X, GripVertical, Send } from 'lucide-react';
import { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { ImageAnalyzer } from '@/app/components/ImageAnalyzer';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { ImagePreviewBar } from '@/app/components/ImagePreviewBar';

interface Selection {
  id?: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
}

interface AIResponse {
  id: string;
  text: string;
  timestamp: Date;
  imageData?: string;
  parentId?: string;
  role: 'user' | 'assistant';
}

const PDFReader = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [scale, setScale] = useState(1.0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isImageBarOpen, setIsImageBarOpen] = useState(false);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selections, setSelections] = useState<{ [pageNum: number]: Selection[] }>({});
  const [currentSelection, setCurrentSelection] = useState<Selection | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [hoveredSelection, setHoveredSelection] = useState<string | null>(null);
  const [aiResponses, setAiResponses] = useState<AIResponse[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [capturedImages, setCapturedImages] = useState<Array<{
    id: string;
    data: string;
    timestamp: Date;
    analysis?: string;
    summary?: string;
  }>>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [pageInput, setPageInput] = useState(String(pageNum));
  const [zoomInput, setZoomInput] = useState('100');
  const [isDragging, setIsDragging] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [analysisPanelWidth, setAnalysisPanelWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

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

      // Get selections for current page
      const currentPageSelections = selections[pageNum] || [];
      [...currentPageSelections, currentSelection].filter(Boolean).forEach(selection => {
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
          context.fillStyle = 'rgba(255, 68, 68, 0.9)'; // Red background
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
      const clampedScale = Math.min(Math.max(0.5, newScale), 2.0);
      setZoomInput(String(Math.round(clampedScale * 100))); // Update zoom input
      return clampedScale;
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
    
    // Calculate selection dimensions
    const width = Math.abs(currentSelection.end.x - currentSelection.start.x);
    const height = Math.abs(currentSelection.end.y - currentSelection.start.y);
    
    // Minimum size threshold (adjust these values as needed)
    const MIN_WIDTH = 20;  // minimum 20 pixels width
    const MIN_HEIGHT = 20; // minimum 20 pixels height
    
    // Check if selection is too small
    if (width < MIN_WIDTH || height < MIN_HEIGHT) {
      console.log('Selection too small:', { width, height });
      setIsSelecting(false);
      setCurrentSelection(null);
      return;
    }

    const hasOverlap = (selections[pageNum] || []).some(existing => 
      checkOverlap(existing, currentSelection)
    );
    
    if (!hasOverlap) {
      const newSelection = { ...currentSelection, id: crypto.randomUUID() };
      setSelections(prev => ({
        ...prev,
        [pageNum]: [...(prev[pageNum] || []), newSelection]
      }));
      analyzeSelection(newSelection);
    }
    
    setIsSelecting(false);
    setCurrentSelection(null);
  };

  // Add a clear selections button to the toolbar
  const clearSelections = () => {
    setSelections(prev => ({
      ...prev,
      [pageNum]: []
    }));
    setCurrentSelection(null);
  };

  const handleOverlayMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isSelecting) {
      handleMouseMove(e);
      return;
    }

    const rect = overlayCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    console.log('Mouse Position:', { x, y });
    console.log('Current Page Selections:', selections[pageNum]);

    // Check if mouse is over any selection on current page
    const hoveredId = (selections[pageNum] || []).find(selection => {
      const width = selection.end.x - selection.start.x;
      const height = selection.end.y - selection.start.y;
      const selX = width >= 0 ? selection.start.x : selection.end.x;
      const selY = height >= 0 ? selection.start.y : selection.end.y;
      const selWidth = Math.abs(width);
      const selHeight = Math.abs(height);

      console.log('Selection:', {
        id: selection.id,
        x: selX,
        y: selY,
        width: selWidth,
        height: selHeight,
        mouseInBounds: x >= selX && x <= selX + selWidth && y >= selY && y <= selY + selHeight
      });

      return x >= selX && x <= selX + selWidth && y >= selY && y <= selY + selHeight;
    })?.id || null;

    console.log('Hovered Selection ID:', hoveredId);
    setHoveredSelection(hoveredId);
  };

  const deleteSelection = (idToDelete: string) => {
    setSelections(prev => ({
      ...prev,
      [pageNum]: (prev[pageNum] || []).filter(sel => sel.id !== idToDelete)
    }));
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
    const selection = (selections[pageNum] || []).find(sel => sel.id === hoveredSelection);
    if (!selection) return;

    // Calculate delete button position
    const width = selection.end.x - selection.start.x;
    const height = selection.end.y - selection.start.y;
    const selX = width >= 0 ? selection.start.x : selection.end.x;
    const absWidth = Math.abs(width);
    const btnSize = 24;
    const btnX = (selX + absWidth - btnSize - 8) * scale;
    const btnY = (height >= 0 ? selection.start.y : selection.end.y) * scale + 8;

    // Check if click is within delete button
    const distance = Math.sqrt(
      Math.pow(x - (btnX + btnSize/2), 2) + 
      Math.pow(y - (btnY + btnSize/2), 2)
    );

    if (distance <= btnSize/2) {
      deleteSelection(hoveredSelection);
      setHoveredSelection(null);
    }
  };

  // Update the analyzeSelection function to handle scaling
  const analyzeSelection = async (selection: Selection) => {
    if (!canvasRef.current) return;
    
    setIsAnalyzing(true);
    const imageId = crypto.randomUUID();
    
    try {
      const tempCanvas = document.createElement('canvas');
      const context = tempCanvas.getContext('2d');
      if (!context) return;

      // Calculate dimensions
      const width = Math.abs(selection.end.x - selection.start.x);
      const height = Math.abs(selection.end.y - selection.start.y);
      const x = Math.min(selection.start.x, selection.end.x);
      const y = Math.min(selection.start.y, selection.end.y);

      // Set canvas size
      tempCanvas.width = width;
      tempCanvas.height = height;

      // Copy the selected region
      context.drawImage(
        canvasRef.current,
        x * scale, y * scale, width * scale, height * scale,
        0, 0, width, height
      );

      const imageData = tempCanvas.toDataURL('image/png');
      
      // Add image with temporary state
      setCapturedImages(prev => [...prev, { 
        id: imageId, 
        data: imageData,
        timestamp: new Date()
      }]);

      // Get analysis
      const analysisResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData })
      });

      const analysisData = await analysisResponse.json();
      
      // Get summary
      const summaryResponse = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: analysisData.analysis })
      });

      const summaryData = await summaryResponse.json();
      
      // Update image with both analysis and summary
      setCapturedImages(prev => prev.map(img => 
        img.id === imageId 
          ? { 
              ...img, 
              analysis: analysisData.analysis,
              summary: summaryData.summary
            }
          : img
      ));

      setAiResponses(prev => [...prev, {
        id: crypto.randomUUID(),
        text: analysisData.analysis,
        timestamp: new Date(),
        role: 'assistant'
      }]);
      setIsChatOpen(true);
    } catch (error) {
      console.error('Error analyzing selection:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteImage = (imageId: string) => {
    setCapturedImages(prev => prev.filter(img => img.id !== imageId));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === 'application/pdf') {
      loadPDF(file);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage: AIResponse = {
      id: crypto.randomUUID(),
      text: chatInput,
      timestamp: new Date(),
      role: 'user'
    };

    // Add user message to UI
    setAiResponses(prev => [...prev, userMessage]);
    setChatInput('');

    try {
      // Get previous messages for context
      const messageHistory = aiResponses.map(msg => ({
        role: msg.role,
        content: msg.text
      }));

      // Make API call
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: chatInput,
          history: messageHistory
        })
      });

      const data = await response.json();

      // Add AI response to UI
      setAiResponses(prev => [...prev, {
        id: crypto.randomUUID(),
        text: data.analysis,
        timestamp: new Date(),
        role: 'assistant'
      }]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      // Optionally add error message to UI
      setAiResponses(prev => [...prev, {
        id: crypto.randomUUID(),
        text: "Sorry, I couldn't process your request. Please try again.",
        timestamp: new Date(),
        role: 'assistant'
      }]);
    }
  };

  return (
    <div className="fixed inset-0 flex no-scroll select-none">
      {/* Left Sidebar - Thumbnails */}
      <div className={`transition-all duration-300 select-none ${
        sidebarOpen ? 'w-64' : 'w-0'
      } border-r bg-gray-50 scroll-y overflow-hidden`}>
        <div className="p-4 w-64"> {/* Fixed width container for content */}
          <div className="overflow-auto">
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
      <div className={`flex-1 flex flex-col scroll-hidden transition-all duration-300 select-none ${
        sidebarOpen ? 'ml-0' : 'ml-0'
      }`}>
        {/* Toolbar */}
        <div className="flex-none border-b p-4 relative"> {/* Added relative for absolute positioning context */}
          {/* Sidebar Toggle Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`absolute p-2 rounded hover:bg-gray-100 transition-all duration-300 ${
              sidebarOpen ? 'left-[20px]' : 'left-4'
            }`}
            aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            <ChevronLeft className={`transform transition-transform duration-300 ${
              !sidebarOpen ? 'rotate-180' : ''
            }`} />
          </button>

          {/* Centered Tools */}
          <div className="flex items-center justify-center max-w-3xl mx-auto w-full">
            {/* Page Navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => changePage(-1)}
                className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
                disabled={pageNum <= 1}
              >
                <ChevronLeft />
              </button>
              <div className="flex items-center space-x-1">
                <span>Page</span>
                <input
                  type="text"
                  value={pageInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPageInput(value); // Update the input value immediately
                    
                    // Only update page if it's a valid number
                    const newPage = parseInt(value);
                    if (!isNaN(newPage) && newPage > 0 && newPage <= (numPages || 0)) {
                      setPageNum(newPage);
                    }
                  }}
                  onBlur={() => {
                    // On blur, ensure we have a valid value
                    const newPage = parseInt(pageInput);
                    if (isNaN(newPage) || newPage < 1) {
                      setPageNum(1);
                      setPageInput('1');
                    } else if (newPage > (numPages || 0)) {
                      setPageNum(numPages || 1);
                      setPageInput(String(numPages || 1));
                    } else {
                      setPageInput(String(newPage));
                    }
                  }}
                  className="w-12 px-1 py-0.5 border rounded text-center focus:outline-none focus:border-blue-500"
                />
                <span>of {numPages || '--'}</span>
              </div>
              <button
                onClick={() => changePage(1)}
                className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
                disabled={!numPages || pageNum >= numPages}
              >
                <ChevronRight />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => adjustZoom(-0.1)}
                className="p-2 rounded hover:bg-gray-100"
              >
                <Minus size={20} />
              </button>
              <div className="flex items-center">
                <input
                  type="text" // Changed to text type for better control
                  value={zoomInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setZoomInput(value); // Update the input value immediately
                    
                    // Only update scale if it's a valid number
                    const newZoom = parseInt(value);
                    if (!isNaN(newZoom) && newZoom >= 25 && newZoom <= 500) {
                      setScale(newZoom / 100);
                    }
                  }}
                  onBlur={() => {
                    // On blur, ensure we have a valid value
                    const newZoom = parseInt(zoomInput);
                    if (isNaN(newZoom) || newZoom < 25) {
                      setScale(0.25);
                      setZoomInput('25');
                    } else if (newZoom > 500) {
                      setScale(5);
                      setZoomInput('500');
                    } else {
                      setZoomInput(String(Math.round(newZoom)));
                    }
                  }}
                  className="w-12 px-1 py-0.5 border rounded text-center focus:outline-none focus:border-blue-500"
                />
                <span className="ml-1">%</span>
              </div>
              <button
                onClick={() => adjustZoom(0.1)}
                className="p-2 rounded hover:bg-gray-100"
              >
                <Plus size={20} />
              </button>
            </div>

            {/* Selection Tool */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSelectionMode(!selectionMode)}
                className={`p-2 rounded hover:bg-gray-100 ${selectionMode ? 'bg-blue-100' : ''}`}
                title="Selection Tool"
              >
                <MousePointer size={20} />
              </button>
              <button
                onClick={() => setIsImageBarOpen(!isImageBarOpen)}
                className={`p-2 rounded hover:bg-gray-100 ${isImageBarOpen ? 'bg-blue-100' : ''}`}
                title="Captured Images"
              >
                <GalleryVerticalEnd size={20} />
              </button>
            </div>
          </div>
          <ImagePreviewBar
            isOpen={isImageBarOpen}
            setIsOpen={setIsImageBarOpen}
            images={capturedImages}
            onDeleteImage={handleDeleteImage}
          />
        </div>

        {/* PDF View Area */}
        <div className={`flex-1 overflow-auto transition-all duration-300`}>
          <div className="flex justify-center p-4">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading PDF...</div>
              </div>
            ) : !pdfDoc ? (
              <div 
                className={`flex flex-col items-center justify-center h-64 bg-white rounded-lg shadow w-full max-w-2xl
                  ${isDragging ? 'border-2 border-blue-500 border-dashed bg-blue-50' : 'border-2 border-dashed border-gray-200'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <p className="text-gray-500 mb-2">
                  {isDragging ? 'Drop PDF here' : 'Please select a PDF file'}
                </p>
                <p className="text-sm text-gray-400">
                  or drag and drop a PDF file here
                </p>
                <label className="mt-4">
                  <button 
                    onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
                    className="py-2 px-4 rounded-full text-sm font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100"
                  >
                    Select PDF File
                  </button>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => e.target.files?.[0] && loadPDF(e.target.files[0])}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
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
            )}
          </div>
        </div>
      </div>

      {/* AI Analysis Panel */}
      <div 
        className="flex flex-col scroll-hidden bg-white border-l relative select-none"
        style={{ width: `${analysisPanelWidth}px` }}
      >
        {/* Resize Handle */}
        <div
          className="absolute left-[-8px] top-0 bottom-0 w-4 cursor-ew-resize group flex items-center justify-center"
          onMouseDown={() => setIsResizing(true)}
        >
          {/* Thick Background Line */}
          <div className="absolute inset-y-0 left-[50%] w-[8px] bg-gray-200 transform -translate-x-1/2" />
          
          {/* Grip Icon */}
          <GripVertical 
            size={24} 
            className="relative z-10 text-gray-400 group-hover:text-blue-500 transition-colors"
          />
        </div>

        {/* Chat Header */}
        <div className="flex-none p-4 border-b">
          <h3 className="font-semibold">AI Analysis</h3>
        </div>

        {/* Chat Messages Container */}
        <div className="flex-1 scroll-y p-4">
          <div className="space-y-2">
            {aiResponses.map(response => (
              <div 
                key={response.id} 
                className={`rounded-lg p-3 ${
                  response.role === 'user' 
                    ? 'bg-gray-100 ml-8' 
                    : 'bg-blue-50 mr-8'
                }`}
              >
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                  {response.imageData ? (
                    <ImageAnalyzer 
                      key={response.id}
                      image={response.text}
                    />
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      className="prose prose-sm max-w-none"
                      components={{
                        p: ({node, ...props}) => <p className="mb-2" {...props} />,
                        a: ({node, ...props}) => <a className="text-blue-600 hover:underline" {...props} />,
                        code: ({node, inline, ...props}: {
                          node?: any;
                          inline?: boolean;
                          children?: React.ReactNode;
                        } & Omit<ComponentPropsWithoutRef<'code'>, 'children'>): JSX.Element => (
                          inline 
                            ? <code className="bg-gray-100 px-1 rounded" {...props} />
                            : <code className="block bg-gray-100 p-2 rounded" {...props} />
                        ),
                      }}
                    >
                      {response.text}
                    </ReactMarkdown>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {response.timestamp.toLocaleTimeString()}
                </p>
              </div>
            ))}
            {isAnalyzing && (
              <div className="bg-gray-50 rounded-lg p-3 mr-8">
                <p className="text-sm text-gray-500">Analyzing...</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Input */}
        <div className="flex-none p-4 border-t">
          <form onSubmit={handleChatSubmit} className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask a follow-up question..."
              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-500 transition-colors"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PDFReader;