import { useState, useRef, useCallback, useEffect } from "react";
import { MediaItem } from "@shared/schema";

interface PdfOrImageProps {
  item?: MediaItem;
}

export default function PdfOrImage({ item }: PdfOrImageProps) {
  const [zoom, setZoom] = useState(100);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, posX: 0, posY: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  console.log("PdfOrImage received item:", item);

  if (!item) {
    return (
      <div className="bg-card border border-border rounded-lg p-6" data-testid="diagram-empty">
        <div className="text-center py-12 text-muted-foreground">
          <i className="fas fa-project-diagram text-4xl mb-4"></i>
          <p>No diagram available</p>
        </div>
      </div>
    );
  }

  const isPdf = item.url.toLowerCase().endsWith('.pdf');

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = item.url;
    link.download = item.name || 'diagram';
    link.click();
  };

  const handleCenter = useCallback(() => {
    setPosition({ x: 0, y: 0 });
  }, []);

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageRef.current) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    });
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !imageRef.current) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setPosition({
      x: dragStart.posX + dx,
      y: dragStart.posY + dy,
    });
  }, [isDragging, dragStart, position]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp, { once: true });
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const imageStyle = {
    transform: `scale(${zoom / 100}) translate(${position.x}px, ${position.y}px)`,
    transformOrigin: 'center center',
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const containerClasses = `border border-border rounded-lg overflow-hidden min-h-96 
    ${isFullscreen ? 'fixed inset-0 z-50 bg-black bg-opacity-80' : 'bg-muted/50'}`;

  return (
    <div className={containerClasses} data-testid="diagram-viewer" ref={containerRef}>
      <div className={`flex items-center justify-between mb-4 p-4 ${isFullscreen ? 'bg-gray-800' : ''}`}>
        <h3 className={`text-lg font-semibold ${isFullscreen ? 'text-white' : ''}`} data-testid="diagram-title">
          {item.name || 'Network Diagram'}
        </h3>
        <div className="flex items-center space-x-2">
          {!isFullscreen && (
            <>
              <button
                onClick={handleZoomOut}
                className="px-3 py-1 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/80 transition-colors"
                data-testid="button-zoom-out"
              >
                <i className="fas fa-search-minus"></i>
              </button>
              <span className="text-sm text-muted-foreground min-w-12 text-center" data-testid="zoom-level">
                {zoom}%
              </span>
              <button
                onClick={handleZoomIn}
                className="px-3 py-1 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/80 transition-colors"
                data-testid="button-zoom-in"
              >
                <i className="fas fa-search-plus"></i>
              </button>
              <button
                onClick={handleDownload}
                className="px-3 py-1 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/80 transition-colors"
                data-testid="button-download-diagram"
              >
                <i className="fas fa-download"></i>
              </button>
            </>
          )}
          <button
            onClick={handleCenter}
            className={`px-3 py-1 rounded-md text-sm transition-colors ${isFullscreen ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
            data-testid="button-center-diagram"
          >
            <i className="fas fa-compress-alt"></i>
          </button>
          <button
            onClick={toggleFullscreen}
            className={`px-3 py-1 rounded-md text-sm transition-colors ${isFullscreen ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
            data-testid="button-fullscreen-diagram"
          >
            <i className={isFullscreen ? "fas fa-compress" : "fas fa-expand"}></i>
          </button>
        </div>
      </div>

      <div className="relative w-full h-full flex items-center justify-center" style={{ height: isFullscreen ? 'calc(100vh - 60px)' : '400px' }} data-testid="diagram-container">
        {isPdf ? (
          <div className="p-4 text-center text-muted-foreground w-full h-full flex flex-col items-center justify-center">
            <i className="fas fa-file-pdf text-4xl mb-4 text-red-400"></i>
            <p className="mb-4">PDF preview not available</p>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              data-testid="link-open-pdf"
            >
              <i className="fas fa-external-link-alt mr-2"></i>
              Open PDF
            </a>
          </div>
        ) : (
          <div
            className="relative w-full h-full overflow-hidden cursor-grab"
            onMouseDown={handleMouseDown}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            <img
              ref={imageRef}
              src={item.url}
              alt={item.name || 'Network diagram'}
              className="absolute object-contain"
              style={imageStyle}
              data-testid="diagram-image"
              onError={(e) => {
                console.error(`Failed to load diagram image: ${item.url}`);
                const target = e.target as HTMLImageElement;
                target.parentElement!.innerHTML = `
                  <div class="p-4 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
                    <i class="fas fa-exclamation-triangle text-4xl mb-4 text-yellow-400"></i>
                    <p class="mb-2">Failed to load diagram image</p>
                    <p class="text-sm text-muted-foreground">${item.url}</p>
                    <a
                      href="${item.url}"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center px-4 py-2 mt-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                      <i class="fas fa-external-link-alt mr-2"></i>
                      Try Direct Link
                    </a>
                  </div>
                `;
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}