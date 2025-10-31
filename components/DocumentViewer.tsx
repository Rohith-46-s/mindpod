import React, { useState, useEffect, useRef } from 'react';
import FileIcon from './icons/FileIcon';
import LoadingSpinner from './LoadingSpinner';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';

// This tells TypeScript that pdfjsLib will be available on the window object
// as it's loaded from a script tag in index.html.
declare const pdfjsLib: any;

interface DocumentViewerProps {
  file: File;
  // FIX: Add `setError` to props to handle errors from this component in the parent.
  setError: (error: string | null) => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ file, setError }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfDocument, setPdfDocument] = useState<any | null>(null);
  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf';

  useEffect(() => {
    // Reset state for the new file
    setIsProcessing(true);
    setPdfDocument(null);
    setPreviewUrl(null);
    setCurrentPageNumber(1);
    
    let objectUrl: string | null = null;

    if (isImage) {
      objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setIsProcessing(false);
    } else if (isPdf) {
      const loadPdf = async () => {
        try {
          if (typeof pdfjsLib === 'undefined') {
            console.error("pdf.js is not loaded.");
            setError("PDF viewer library is not available.");
            setIsProcessing(false);
            return;
          }
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;
          
          const reader = new FileReader();
          reader.onload = async (event) => {
            if (!event.target?.result) {
              setIsProcessing(false);
              return;
            };
            const pdfData = new Uint8Array(event.target.result as ArrayBuffer);
            const loadingTask = pdfjsLib.getDocument({ data: pdfData });
            const pdf = await loadingTask.promise;
            setPdfDocument(pdf);
            setIsProcessing(false);
          };
          reader.onerror = () => {
              console.error("Failed to read file");
              setError("Failed to read the PDF file.")
              setIsProcessing(false);
          }
          reader.readAsArrayBuffer(file);
        } catch (error) {
          console.error("Failed to load PDF", error);
          setError("Failed to load PDF. The file may be corrupted.");
          setIsProcessing(false);
        }
      };
      loadPdf();
    } else {
      setIsProcessing(false);
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [file, isImage, isPdf, setError]);

  useEffect(() => {
    if (!pdfDocument || !canvasRef.current) return;

    const renderPage = async () => {
      setIsProcessing(true);
      try {
        const page = await pdfDocument.getPage(currentPageNumber);
        const canvas = canvasRef.current;
        if (canvas) {
          const viewport = page.getViewport({ scale: 1.5 });
          const context = canvas.getContext('2d');
          if (context) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
              canvasContext: context,
              viewport: viewport,
            };
            await page.render(renderContext).promise;
          }
        }
      } catch (error) {
        console.error("Failed to render page", error);
        setError(`Could not render page ${currentPageNumber} of this PDF. It might be corrupted or in an unsupported format.`);
      } finally {
        setIsProcessing(false);
      }
    };

    renderPage();
  }, [pdfDocument, currentPageNumber, setError]);

  const goToPreviousPage = () => {
    setCurrentPageNumber(prev => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    if (!pdfDocument) return;
    setCurrentPageNumber(prev => Math.min(pdfDocument.numPages, prev + 1));
  };

  const renderPdfControls = () => {
    if (!pdfDocument) return null;

    return (
      <div className="flex-shrink-0 flex items-center justify-center gap-4 p-2 bg-slate-800 rounded-b-lg border-t border-slate-700">
        <button
          onClick={goToPreviousPage}
          disabled={currentPageNumber <= 1}
          className="p-2 rounded-full disabled:text-slate-600 disabled:cursor-not-allowed text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        <span className="text-sm font-medium text-slate-400" aria-live="polite">
          Page {currentPageNumber} of {pdfDocument.numPages}
        </span>
        <button
          onClick={goToNextPage}
          disabled={currentPageNumber >= pdfDocument.numPages}
          className="p-2 rounded-full disabled:text-slate-600 disabled:cursor-not-allowed text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          aria-label="Next page"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
        <div className="flex-shrink-0 flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-200 truncate pr-4" title={file.name}>
                {file.name}
            </h2>
        </div>

        <div className="flex-grow flex flex-col bg-slate-900 rounded-lg border border-slate-700 min-h-[50vh] max-h-[75vh] overflow-hidden">
            <div className="flex-grow overflow-y-auto p-4 flex flex-col items-center">
              {isProcessing && <LoadingSpinner message={pdfDocument ? "Rendering page..." : "Processing document..."} />}
              
              {!isProcessing && isImage && previewUrl && (
                <img 
                    src={previewUrl} 
                    alt="Document preview" 
                    className="max-w-full h-auto object-contain rounded-lg"
                />
              )}
              
              <div className={`${isProcessing ? 'hidden' : 'block'}`}>
                  {isPdf && pdfDocument && (
                      <canvas
                          ref={canvasRef}
                          className="rounded-md shadow-lg"
                      />
                  )}
              </div>
              
              {!isProcessing && !isImage && !isPdf && (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
                    <FileIcon className="mx-auto h-24 w-24" />
                    <p className="mt-4 font-semibold text-slate-400">{file.type}</p>
                    <p className="text-sm">No preview available for this file type.</p>
                </div>
              )}
            </div>
            {renderPdfControls()}
        </div>
    </div>
  );
};

export default DocumentViewer;