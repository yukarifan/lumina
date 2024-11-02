"use client";
import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Minus, MousePointer } from 'lucide-react';
import { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

const PDFReader = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [scale, setScale] = useState(1.0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);

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

    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };

    await page.render(renderContext).promise;

    // Draw selection rectangle if exists
    if (selectionStart && selectionEnd && context) {
      context.strokeStyle = '#0066cc';
      context.lineWidth = 2;
      const width = selectionEnd.x - selectionStart.x;
      const height = selectionEnd.y - selectionStart.y;
      context.strokeRect(selectionStart.x, selectionStart.y, width, height);
    }
  };

  useEffect(() => {
    if (pdfDoc) {
      renderPage(pageNum);
    }
  }, [pageNum, scale, pdfDoc, selectionStart, selectionEnd]);

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

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectionMode) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsSelecting(true);
    setSelectionStart({ x, y });
    setSelectionEnd({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting || !selectionMode) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setSelectionEnd({ x, y });
  };

  const handleMouseUp = () => {
    if (!selectionMode) return;
    setIsSelecting(false);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-white shadow-lg transition-all duration-300 overflow-hidden`}>
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
          <div className="mt-4 space-y-2 overflow-auto" style={{ maxHeight: 'calc(100vh - 100px)' }}>
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

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {/* Toolbar */}
        <div className="sticky top-0 bg-white shadow-sm p-4 flex items-center space-x-4">
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

        {/* PDF Viewer */}
        <div className="flex justify-center p-4">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading PDF...</div>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="shadow-lg bg-white"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: selectionMode ? 'crosshair' : 'default' }}
          />
          {!pdfDoc && !loading && (
            <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow w-full max-w-2xl">
              <p className="text-gray-500">Please select a PDF file</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFReader;