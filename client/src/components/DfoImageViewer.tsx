import { useState, useRef, useCallback, useEffect } from "react";

interface MediaItem {
  url: string;
  name?: string;
  kind: string;
}

interface DfoImageViewerProps {
  item?: MediaItem | string[] | null;
}

export default function DfoImageViewer({ item }: DfoImageViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, posX: 0, posY: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Handle different data structures
  let items: Array<{url: string, name?: string}> = [];
  if (item) {
    if (typeof item === 'string') {
      items = [{url: item}];
    } else if (Array.isArray(item)) {
      // Handle array of objects with url property or array of strings
      items = item.map(i => {
        if (typeof i === 'string') return {url: i};
        if (i && typeof i === 'object' && i.url) return {url: i.url, name: i.name};
        return null;
      }).filter(Boolean);
    } else if (item && typeof item === 'object' && item.url) {
      items = [{url: item.url, name: item.name}];
    }
  }

  if (!items || items.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6" data-testid="dfo-empty">
        <div className="text-center py-12 text-muted-foreground">
          <i className="fas fa-table text-4xl mb-4"></i>
          <p>No DFO diagram available</p>
        </div>
      </div>
    );
  }

  const currentItem = items[currentIndex];

  // Fix URL handling - ensure it's always a relative path starting with /static/
  const correctedUrl = (() => {
    if (!currentItem) return '';

    let url = typeof currentItem === 'string' ? currentItem : currentItem.url;

    // Handle deeply nested malformed URLs with replit domain and nested objects
    if (url.includes("replit.dev") && url.includes("//static/{'url':")) {
      // Extract the clean path from deeply nested malformed URL
      const match = url.match(/'\/static\/([^']+)'/);
      if (match) {
        url = `/static/${match[1]}`;
      }
    }
    // Handle URLs that contain nested data structures with replit domain
    else if (url.includes("replit.dev//static/{'url':")) {
      // Extract the clean path from malformed URL like: https://domain//static/{'url': '/static/...'}
      const match = url.match(/'\/static\/([^']+)'/);
      if (match) {
        url = `/static/${match[1]}`;
      }
    }
    // Handle URLs that contain nested data structures
    else if (url.includes("/static/{'url':")) {
      // Extract the clean path from malformed URL
      const match = url.match(/\/static\/([^\/]+\/[^\/]+\/[^\/]+\/dfo\/[^'"\s}]+)/);
      if (match) {
        url = `/static/${match[1]}`;
      }
    } 
    // Handle other malformed formats with nested objects
    else if (url.includes("{'url':")) {
      // Handle other malformed formats
      const match = url.match(/['"](\/static\/[^'"]+)['"]/);
      if (match) {
        url = match[1];
      }
    } 
    // Handle absolute URLs with replit domain
    else if (url.includes('replit.dev/')) {
      // Remove absolute URL domain if present
      const staticIndex = url.indexOf('/static/');
      if (staticIndex !== -1) {
        url = url.substring(staticIndex);
      }
    }

    // Clean up any remaining malformed parts
    if (url.startsWith('/static/{') || url.includes('//static/')) {
      // If URL starts with malformed data, return empty to trigger error handling
      return '';
    }

    // Ensure it starts with /static/
    if (!url.startsWith('/static/')) {
      url = `/static/${url.replace(/^\/+/, '')}`;
    }

    // Remove any trailing malformed data including commas and quotes
    url = url.split("'")[0].split('"')[0].split('}')[0].split(',')[0].split(' ')[0];

    return url;
  })();


  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = correctedUrl;
    link.download = `dfo-diagram-${currentIndex + 1}`;
    link.click();
  };

  const handlePrevious = () => {
    setCurrentIndex(prev => prev > 0 ? prev - 1 : items.length - 1);
    handleCenter();
  };

  const handleNext = () => {
    setCurrentIndex(prev => prev < items.length - 1 ? prev + 1 : 0);
    handleCenter();
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
  }, [isDragging, dragStart]);

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
    <div className={containerClasses} data-testid="dfo-viewer" ref={containerRef}>
      <div className={`flex items-center justify-between mb-4 p-4 ${isFullscreen ? 'bg-gray-800' : ''}`}>
        <h3 className={`text-lg font-semibold ${isFullscreen ? 'text-white' : ''}`} data-testid="dfo-title">
          {currentItem?.name || `DFO Layout ${currentIndex + 1}`} ({currentIndex + 1} of {items.length})
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
                data-testid="button-download-dfo"
              >
                <i className="fas fa-download"></i>
              </button>
            </>
          )}
          <button
            onClick={handleCenter}
            className={`px-3 py-1 rounded-md text-sm transition-colors ${isFullscreen ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
            data-testid="button-center-dfo"
          >
            <i className="fas fa-compress-alt"></i>
          </button>
          <button
            onClick={toggleFullscreen}
            className={`px-3 py-1 rounded-md text-sm transition-colors ${isFullscreen ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
            data-testid="button-fullscreen-dfo"
          >
            <i className={isFullscreen ? "fas fa-compress" : "fas fa-expand"}></i>
          </button>
        </div>
      </div>

      <div className="relative w-full h-full flex items-center justify-center" style={{ height: isFullscreen ? 'calc(100vh - 60px)' : '400px' }} data-testid="dfo-container">
        <div
          className="relative w-full h-full overflow-hidden cursor-grab"
          onMouseDown={handleMouseDown}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <img
            ref={imageRef}
            src={correctedUrl}
            alt="DFO Layout"
            className="absolute object-contain w-full h-full"
            style={imageStyle}
            data-testid="dfo-image"
            onError={(e) => {
              console.error(`Failed to load DFO image: ${correctedUrl}`);
              const target = e.target as HTMLImageElement;
              target.parentElement!.innerHTML = `
                <div class="p-4 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
                  <i class="fas fa-exclamation-triangle text-4xl mb-4 text-yellow-400"></i>
                  <p class="mb-2">Failed to load DFO image</p>
                  <p class="text-sm text-muted-foreground">${correctedUrl}</p>
                  <a
                    href="${correctedUrl}"
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
      </div>
    </div>
  );
}