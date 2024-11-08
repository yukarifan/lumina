"use client";
import React, { useEffect, useRef, useState, JSX, ComponentPropsWithoutRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Minus, MousePointer, GalleryVerticalEnd, X, GripVertical, Send, Layers, Upload, Pencil, Lightbulb, User, LogOut } from 'lucide-react';
import { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { ImageAnalyzer } from '@/app/components/ImageAnalyzer';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { ImagePreviewBar } from '@/app/components/ImagePreviewBar';
import { StudentHighlight, HeatmapData } from '@/types/highlights';
import { generateHeatmapData, loadSelectionsFromFile } from '@/utils/syntheticData';
import { HeatmapOverlay } from '@/app/components/HeatmapOverlay';
import { ConfirmationModal } from '@/app/components/ConfirmationModal';
import { HintBulb } from '../components/HintBulb';
import { PDFBulbs, BulbInfo } from '@/types/bulbs';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useRouter } from 'next/navigation';

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

// Add this interface for the avatar menu
interface AvatarMenuProps {
  email: string;
  role: string;
  onSignOut: () => void;
}

const AvatarMenu = ({ email, role, onSignOut }: AvatarMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-[rgb(37,187,187)] text-white hover:bg-[rgb(33,168,168)] transition-colors"
      >
        <User size={20} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
          <div className="px-4 py-2 border-b border-gray-200">
            <div className="text-sm font-medium text-gray-900">Signed in as</div>
            <div className="text-sm text-gray-600 truncate">{email}</div>
            <div className="text-xs text-[rgb(37,187,187)] font-medium uppercase mt-1">
              {role}
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <LogOut size={16} className="mr-2" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
};

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
    conversationId?: string;
    conversation?: AIResponse[];
  }>>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [pageInput, setPageInput] = useState(String(pageNum));
  const [zoomInput, setZoomInput] = useState('100');
  const [isDragging, setIsDragging] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [analysisPanelWidth, setAnalysisPanelWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [conversations, setConversations] = useState<{
    [imageId: string]: AIResponse[];
  }>({});
  const [studentId] = useState(`student_${crypto.randomUUID()}`); // Simulated student ID
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [pdfList, setPdfList] = useState<Array<{
    id: string;
    name: string;
    file: File;
    isEditing: boolean;
  }>>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pdfToDelete, setPdfToDelete] = useState<string | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0);
  const [currentBulbs, setCurrentBulbs] = useState<BulbInfo[]>([]);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [showBulbs, setShowBulbs] = useState(false);
  const [currentImageId, setCurrentImageId] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const router = useRouter();
  const [userRole, setUserRole] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    // Get user data from localStorage when component mounts
    const email = localStorage.getItem('userEmail');
    const role = localStorage.getItem('userRole');
    
    if (!email || !role) {
      router.push('/login');
      return;
    }
    
    setUserEmail(email);
    setUserRole(role);
  }, [router]);

  const handleSignOut = () => {
    localStorage.clear();
    router.push('/login');
  };

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
    setCurrentFile(file);
    try {
      // Add to pdfList if not already added
      const existingPdf = pdfList.find(pdf => pdf.file === file);
      if (!existingPdf) {
        setPdfList(prev => [...prev, {
          id: crypto.randomUUID(),
          name: file.name,
          file: file,
          isEditing: false,
        }]);
      }

      const pdfjsLib = await import('pdfjs-dist');
      const fileReader = new FileReader();

      fileReader.onload = async function(this: FileReader) {
        const typedarray = new Uint8Array(this.result as ArrayBuffer);
        const doc = await pdfjsLib.getDocument(typedarray).promise;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setPageNum(1);

        // Add this line
        loadBulbsForPDF(file.name);

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
      overlayCanvas.style.position = 'absolute';
      overlayCanvas.style.top = '0';
      overlayCanvas.style.left = '0';
      overlayCanvas.style.zIndex = '50'; // High z-index to ensure it's on top
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

    // Clear the entire canvas first
    context.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    if (selectionMode) {
      // Draw the semi-transparent overlay
      context.fillStyle = 'rgba(0, 0, 0, 0.5)';
      context.fillRect(0, 0, overlayCanvas.width, overlayCanvas.height);

      // Clear the areas where selections exist
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

        // Clear the selection area
        context.clearRect(x, y, absWidth, absHeight);
        
        // Draw the selection border
        context.strokeStyle = '#0066cc';
        context.lineWidth = 2;
        context.strokeRect(x, y, absWidth, absHeight);

        // Add delete button if selection is hovered
        if (selection.id && hoveredSelection === selection.id) {
          const btnSize = 24;
          const scaledX = x;
          const scaledY = y;
          const btnX = scaledX + absWidth - btnSize - 8;
          const btnY = scaledY + 8;
          
          context.save();
          context.globalAlpha = 0.9;
          
          // Enhanced shadow effect
          context.shadowColor = 'rgba(0, 0, 0, 0.3)';
          context.shadowBlur = 8;
          context.shadowOffsetX = 2;
          context.shadowOffsetY = 2;
          
          // Draw circular background
          context.beginPath();
          context.arc(btnX + btnSize/2, btnY + btnSize/2, btnSize/2, 0, Math.PI * 2);
          context.fillStyle = 'rgba(255, 68, 68, 0.9)';
          context.fill();
          
          // Draw X icon
          context.strokeStyle = 'white';
          context.lineWidth = 2.5;
          context.lineCap = 'round';
          
          // Draw X lines
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
      setPageInput(String(newPage));
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
    
    const rect = overlayCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Get mouse coordinates relative to canvas
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    // If we're hovering over a delete button, don't start a new selection
    if (hoveredSelection) {
      const selection = selections[pageNum]?.find(sel => sel.id === hoveredSelection);
      if (selection) {
        const width = selection.end.x - selection.start.x;
        const btnSize = 24;
        const btnX = selection.start.x + Math.abs(width) - btnSize - 8;
        const btnY = selection.start.y + 8;

        // Check if click is within delete button
        const distance = Math.sqrt(
          Math.pow(x - (btnX + btnSize/2), 2) + 
          Math.pow(y - (btnY + btnSize/2), 2)
        );

        if (distance <= btnSize/2) {
          return; // Don't start selection if clicking delete button
        }
      }
    }

    setIsSelecting(true);
    setCurrentSelection({
      id: crypto.randomUUID(),
      start: { x, y },
      end: { x, y }
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = overlayCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    // Update current selection if drawing
    if (isSelecting && currentSelection) {
      setCurrentSelection(prev => ({
        ...prev!,
        end: { x, y }
      }));
    }

    // Check for hover over selections
    const hoveredId = (selections[pageNum] || []).find(selection => {
      const selX = Math.min(selection.start.x, selection.end.x);
      const selY = Math.min(selection.start.y, selection.end.y);
      const selWidth = Math.abs(selection.end.x - selection.start.x);
      const selHeight = Math.abs(selection.end.y - selection.start.y);

      return x >= selX && x <= selX + selWidth && y >= selY && y <= selY + selHeight;
    })?.id || null;

    setHoveredSelection(hoveredId);
    drawSelectionOverlay();
  };

  const handleMouseUp = () => {
    if (!isSelecting || !currentSelection) return;

    // Only add selection if it has some size
    const width = Math.abs(currentSelection.end.x - currentSelection.start.x);
    const height = Math.abs(currentSelection.end.y - currentSelection.start.y);
    
    if (width > 5 && height > 5) {
      // Add selection to state
      setSelections(prev => ({
        ...prev,
        [pageNum]: [...(prev[pageNum] || []), currentSelection]
      }));

      // Save selection to file
      const highlight: StudentHighlight = {
        id: currentSelection.id || crypto.randomUUID(),
        studentId: studentId,
        pageNumber: pageNum,
        selection: currentSelection,
        question: '', // You can add question handling here if needed
        timestamp: new Date()
      };
      
      // saveSelectionToFile(highlight);

      // Start analysis in the background
      analyzeSelection(currentSelection);
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
    }
  };

  // Modify analyzeSelection function
  const analyzeSelection = async (selection: Selection) => {
    if (!canvasRef.current) return;
    
    setIsAnalyzing(true);
    const imageId = crypto.randomUUID();
    setCurrentImageId(imageId);
    
    // Clear existing chat responses immediately when starting a new capture
    setAiResponses([]);
    
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
      
      // Create initial conversation
      const analysisResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData })
      });

      const analysisData = await analysisResponse.json();
      const summaryResponse = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: analysisData.analysis })
      });

      const summaryData = await summaryResponse.json();
      
      // Create initial response for the new conversation
      const initialResponse: AIResponse = {
        id: crypto.randomUUID(),
        text: analysisData.analysis,
        timestamp: new Date(),
        imageData: imageData,
        role: 'assistant'
      };

      // Update conversations state
      setConversations(prev => ({
        ...prev,
        [imageId]: [initialResponse]
      }));

      // Update captured images
      setCapturedImages(prev => [...prev, { 
        id: imageId, 
        data: imageData,
        timestamp: new Date(),
        analysis: analysisData.analysis,
        summary: summaryData.summary,
        conversationId: imageId,
        conversation: [initialResponse]
      }]);

      // Set the new response and open chat
      setAiResponses([initialResponse]);
      setIsChatOpen(true);
    } catch (error) {
      console.error('Error analyzing selection:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Add handler for image click
  const handleImageClick = (imageId: string) => {
    const conversation = conversations[imageId] || [];
    setAiResponses(conversation);
    setCurrentImageId(imageId);
    setIsChatOpen(true);
  };

  const handleDeleteImage = (imageId: string) => {
    setCapturedImages(prev => prev.filter(img => img.id !== imageId));
    if (currentImageId === imageId) {
      setCurrentImageId(null);
      setAiResponses([]);
    }
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

  // Modify handleChatSubmit to save responses to the current conversation
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage: AIResponse = {
      id: crypto.randomUUID(),
      text: chatInput,
      timestamp: new Date(),
      role: 'user'
    };

    setAiResponses(prev => [...prev, userMessage]);
    setChatInput('');
    setIsAnalyzing(true);

    try {
      const messageHistory = aiResponses.map(msg => ({
        role: msg.role,
        content: msg.text
      }));

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: chatInput,
          history: messageHistory
        })
      });

      const data = await response.json();
      const aiMessage: AIResponse = {
        id: crypto.randomUUID(),
        text: data.analysis,
        timestamp: new Date(),
        role: 'assistant'
      };

      const updatedResponses = [...aiResponses, userMessage, aiMessage];
      setAiResponses(updatedResponses);

      // Update conversation if we have a current image
      if (currentImageId) {
        setConversations(prev => ({
          ...prev,
          [currentImageId]: updatedResponses
        }));

        setCapturedImages(prev => prev.map(img => 
          img.id === currentImageId 
            ? { ...img, conversation: updatedResponses }
            : img
        ));

        await updateImageSummary(currentImageId, updatedResponses);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      setAiResponses(prev => [...prev, {
        id: crypto.randomUUID(),
        text: "Sorry, I couldn't process your request. Please try again.",
        timestamp: new Date(),
        role: 'assistant'
      }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      // Get window width for boundary checking
      const windowWidth = window.innerWidth;
      
      // Calculate new width while respecting boundaries
      const minWidth = 300;
      const maxWidth = Math.min(800, windowWidth - 100); // Leave some space on screen
      const newWidth = Math.max(minWidth, Math.min(maxWidth, windowWidth - e.clientX));
      
      // Update width with requestAnimationFrame for smoother resizing
      requestAnimationFrame(() => {
        setAnalysisPanelWidth(newWidth);
      });
    };

    const handleMouseUp = () => {
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
      setIsResizing(false);
    };

    const handleMouseDown = () => {
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
      setIsResizing(true);
    };

    // Add resize handle element
    const resizeHandle = document.querySelector('.resize-handle');
    if (resizeHandle) {
      resizeHandle.addEventListener('mousedown', handleMouseDown);
    }

    // Add document-level event listeners
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      // Clean up all event listeners
      if (resizeHandle) {
        resizeHandle.removeEventListener('mousedown', handleMouseDown);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const updateImageSummary = async (imageId: string, conversation: AIResponse[]) => {
    try {
      // Format the entire conversation with clear role labels and chronological order
      const fullConversation = conversation
        .map(msg => {
          const roleLabel = msg.role === 'assistant' ? 'AI' : 'User';
          return `${roleLabel}: ${msg.text}`;
        })
        .join('\n\n');

      const summaryResponse = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: fullConversation,
          isConversation: true
        })
      });

      const summaryData = await summaryResponse.json();

      setCapturedImages(prev => prev.map(img => 
        img.id === imageId 
          ? { ...img, summary: summaryData.summary, conversation }
          : img
      ));
    } catch (error) {
      console.error('Error updating summary:', error);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      // Get window width for boundary checking
      const windowWidth = window.innerWidth;
      
      // Calculate new width while respecting boundaries
      const minWidth = 300;
      const maxWidth = Math.min(800, windowWidth - 100); // Leave some space on screen
      const newWidth = Math.max(minWidth, Math.min(maxWidth, windowWidth - e.clientX));
      
      // Update width with requestAnimationFrame for smoother resizing
      requestAnimationFrame(() => {
        setAnalysisPanelWidth(newWidth);
      });
    };

    const handleMouseUp = () => {
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
      setIsResizing(false);
    };

    const handleMouseDown = () => {
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
      setIsResizing(true);
    };

    // Add resize handle element
    const resizeHandle = document.querySelector('.resize-handle');
    if (resizeHandle) {
      resizeHandle.addEventListener('mousedown', handleMouseDown);
    }

    // Add document-level event listeners
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      // Clean up all event listeners
      if (resizeHandle) {
        resizeHandle.removeEventListener('mousedown', handleMouseDown);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Instead, we'll just use the actual selections for the heatmap
  useEffect(() => {
    const loadAndGenerateHeatmap = async () => {
      console.log('Loading heatmap data for page:', pageNum);
      if (canvasRef.current) {
        const fileSelections = await loadSelectionsFromFile();
        console.log('Filtered selections:', fileSelections.filter(sel => sel.pageNumber === pageNum));
        
        const data = generateHeatmapData(
          fileSelections,
          pageNum,
          canvasRef.current.width,
          canvasRef.current.height
        );
        console.log('Generated heatmap data:', data);
        setHeatmapData(data);
      }
    };
    
    loadAndGenerateHeatmap();
  }, [pageNum]);

  const handlePdfUpload = (file: File) => {
    loadPDF(file);
  };

  const handleRename = (id: string, newName: string) => {
    setPdfList(prev => prev.map(pdf => 
      pdf.id === id ? { ...pdf, name: newName, isEditing: false } : pdf
    ));
  };

  // Add this new function with your other functions
  const handleDeletePdf = (id: string) => {
    setPdfToDelete(id);
    setIsDeleteModalOpen(true);
  };

  // Add this new function to handle the actual deletion
  const confirmDelete = () => {
    if (!pdfToDelete) return;
    
    const deletedPdf = pdfList.find(pdf => pdf.id === pdfToDelete);
    setPdfList(prev => prev.filter(pdf => pdf.id !== pdfToDelete));
    
    if (deletedPdf && pdfDoc) {
      setPdfDoc(null);
      setNumPages(null);
      setPageNum(1);
      setThumbnails([]);
    }
    
    setPdfToDelete(null);
  };

  const toggleSelectionMode = () => {
    if (!selectionMode) {
      // Turning on
      setSelectionMode(true);
      setOverlayOpacity(1);
    } else {
      // Turning off - fade out first, then disable selection mode
      setOverlayOpacity(0);
      // Wait for animation to complete before disabling selection mode
      setTimeout(() => {
        setSelectionMode(false);
      }, 300); // Match this with transition duration
    }
  };

  const loadBulbsForPDF = async (pdfName: string) => {
    try {
      console.log('Loading bulbs for PDF:', pdfName);
      const response = await fetch('/api/bulbs');
      const bulbsData: PDFBulbs = await response.json();
      
      if (bulbsData[pdfName]) {
        // Map the bulbs data to match the BulbInfo interface
        const mappedBulbs: BulbInfo[] = bulbsData[pdfName].bulbs.map(bulb => ({
          id: bulb.id,
          x: bulb.position.x,
          y: bulb.position.y,
          message: bulb.message,
          pageNumber: bulb.pageNumber
        }));
        
        // Filter bulbs for current page
        const currentPageBulbs = mappedBulbs.filter(bulb => 
          !bulb.pageNumber || bulb.pageNumber === pageNum
        );
        
        setCurrentBulbs(currentPageBulbs);
      } else {
        // Default bulb if no matching PDF found
        setCurrentBulbs([{
          x: 100,
          y: 100,
          message: "Try selecting text to analyze it!"
        }]);
      }
    } catch (error) {
      console.error('Error loading bulbs:', error);
      setCurrentBulbs([]);
    }
  };

  useEffect(() => {
    if (pdfDoc) {
      const fileName = pdfList.find(pdf => pdf.file === currentFile)?.name;
      if (fileName) {
        loadBulbsForPDF(fileName);
      }
    }
  }, [pageNum, pdfDoc]);

  return (
    <div className="fixed inset-0 flex no-scroll select-none">
      {/* Left Sidebar - PDF Upload */}
      <div className={`transition-all duration-300 select-none ${
        sidebarOpen ? 'w-64' : 'w-0'
      } border-r bg-gray-50 scroll-y overflow-hidden`}>
        <div className="p-4 w-64"> {/* Fixed width container for content */}
          <div className="flex flex-col h-full">
            {/* Upload Section */}
            <div className="p-4 border rounded-lg bg-white mb-4">
              <h3 className="font-semibold text-sm mb-3">Upload PDF</h3>
              <div 
                className={`flex flex-col items-center justify-center p-6 border-2 rounded-lg
                  ${isDragging ? 'border-blue-500 border-dashed bg-blue-50' : 'border-dashed border-gray-200'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files[0];
                  if (file?.type === 'application/pdf') {
                    handlePdfUpload(file);
                  }
                }}
              >
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 text-center mb-2">
                  {isDragging ? 'Drop PDF here' : 'Drag & drop PDF here'}
                </p>
                <p className="text-xs text-gray-400 text-center mb-3">or</p>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => e.target.files?.[0] && handlePdfUpload(e.target.files[0])}
                    className="hidden"
                  />
                  <span className="px-4 py-2 bg-[rgb(37,187,187)] text-white rounded-md text-sm hover:bg-[rgb(33,168,168)] transition-colors">
                    Browse Files
                  </span>
                </label>
              </div>
            </div>

            {/* PDF List */}
            <div className="space-y-2">
              {pdfList.map(pdf => (
                <div 
                  key={pdf.id}
                  className="p-3 bg-white rounded-lg border hover:border-blue-200 transition-colors cursor-pointer"
                >
                  {pdf.isEditing ? (
                    <input
                      type="text"
                      value={pdf.name}
                      className="w-full px-2 py-1 border rounded focus:outline-none focus:border-blue-500"
                      onChange={(e) => {
                        setPdfList(prev => prev.map(p => 
                          p.id === pdf.id ? { ...p, name: e.target.value } : p
                        ));
                      }}
                      onBlur={() => handleRename(pdf.id, pdf.name)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleRename(pdf.id, pdf.name);
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    <div className="flex items-center justify-between group">
                      <div 
                        className="flex-1 truncate mr-2"
                        onClick={() => loadPDF(pdf.file)}
                      >
                        {pdf.name}
                      </div>
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPdfList(prev => prev.map(p => 
                              p.id === pdf.id ? { ...p, isEditing: true } : p
                            ));
                          }}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="Rename"
                        >
                          <Pencil size={14} className="text-gray-500" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePdf(pdf.id);
                          }}
                          className="p-1 hover:bg-red-100 rounded transition-colors ml-1"
                          title="Delete"
                        >
                          <X size={14} className="text-red-500" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
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
                onClick={() => toggleSelectionMode()}
                className={`p-2 rounded hover:bg-gray-100 ${selectionMode ? 'bg-blue-100' : ''}`}
                title="Selection Tool"
              >
                <MousePointer size={20} />
              </button>
              <div className="flex items-center">
                <ImagePreviewBar
                  isOpen={isImageBarOpen}
                  setIsOpen={setIsImageBarOpen}
                  images={capturedImages}
                  onDeleteImage={handleDeleteImage}
            onImageClick={handleImageClick}
                />
                <div className="border-l pl-4 ml-4">
                  <button
                    onClick={() => setIsImageBarOpen(!isImageBarOpen)}
                    className={`p-2 rounded hover:bg-gray-100 ${isImageBarOpen ? 'bg-blue-100' : ''}`}
                    title="Image Gallery"
                  >
                    <GalleryVerticalEnd size={20} />
                  </button>
                  <button
                    onClick={() => setShowHeatmap(!showHeatmap)}
                    className={`p-2 rounded hover:bg-gray-100 ${showHeatmap ? 'bg-red-100' : ''}`}
                    title="Toggle Heatmap"
                  >
                    <Layers size={20} />
                  </button>
                  <button
                    onClick={() => setShowBulbs(!showBulbs)}
                    className={`p-2 rounded hover:bg-gray-100 ${showBulbs ? 'bg-yellow-100' : ''}`}
                    title="Toggle Hint Bulbs"
                  >
                    <Lightbulb size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
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
                    className="py-2 px-4 rounded-full text-sm font-semibold bg-[rgb(37,187,187)] text-white hover:bg-[rgb(33,168,168)] disabled:opacity-50"
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
                  className="absolute top-0 left-0 pointer-events-auto"
                  style={{ 
                    zIndex: 50,
                    cursor: selectionMode ? 'crosshair' : 'default',
                    opacity: overlayOpacity,
                    transition: 'opacity 300ms ease-in-out',
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={() => {
                    handleMouseUp();
                    setHoveredSelection(null);
                  }}
                  onClick={handleOverlayClick}
                />
                
                
                <HeatmapOverlay 
                  width={canvasRef.current?.width || 0}
                  height={canvasRef.current?.height || 0}
                  pageNum={pageNum}
                  visible={showHeatmap}
                />
                {showBulbs && currentBulbs.map((bulb, index) => (
                  <HintBulb
                    key={bulb.id || index}
                    x={bulb.x}
                    y={bulb.y}
                    message={bulb.message}
                    scale={scale}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Analysis Panel */}
      <div 
        className="flex flex-col scroll-hidden bg-white border-l relative select-none"
        style={{ 
          width: `${analysisPanelWidth}px`,
          transition: isResizing ? 'none' : 'width 0.2s ease-in-out'
        }}
      >
        {/* Chat Header - Modified to include avatar */}
        <div className="flex-none p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Lumina</h3>
          
          {/* Avatar and Dropdown */}
          <AvatarMenu
            email={userEmail}
            role={userRole.toUpperCase()}
            onSignOut={handleSignOut}
          />
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
                <LoadingSpinner />
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
              className="p-2 rounded-lg bg-[rgb(37,187,187)] text-white hover:bg-[rgb(33,168,168)] disabled:opacity-50 disabled:hover:bg-[rgb(37,187,187)] transition-colors"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setPdfToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete PDF"
        message="Are you sure you want to delete this PDF? This action cannot be undone."
      />
    </div>
  );
};

export default PDFReader;