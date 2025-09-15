
import { useState, useRef, useCallback } from 'react';
import { MediaItem } from '@shared/schema';
import { useIsMobile } from '@/hooks/use-mobile';

interface LocationViewerProps {
  location?: MediaItem | null;
}

export default function LocationViewer({ location }: LocationViewerProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.01;
    const newScale = Math.min(Math.max(scale + delta, 0.5), 5);
    setScale(newScale);
  }, [scale]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDoubleClick = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Touch event handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({
        x: touch.clientX - position.x,
        y: touch.clientY - position.y
      });
    }
  }, [position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (!isDragging || e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Pinch to zoom for mobile
  const handleTouchStartPinch = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      setDragStart({ x: distance, y: scale });
    }
  }, [scale]);

  const handleTouchMovePinch = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      const ratio = distance / dragStart.x;
      const newScale = Math.min(Math.max(dragStart.y * ratio, 0.5), 5);
      setScale(newScale);
    }
  }, [dragStart]);

  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 5));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen();
      } else if ((containerRef.current as any).msRequestFullscreen) {
        (containerRef.current as any).msRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  // Listen for fullscreen changes
  useCallback(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  if (!location) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <i className="fas fa-map-marker-alt text-4xl mb-4"></i>
        <p>No location image available</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`bg-card border border-border rounded-lg overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}
    >
      {/* Controls */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30"></div>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Location Image</span>
          {location.name && (
            <span className="text-sm text-muted-foreground">• {location.name}</span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={zoomOut}
            className="p-2 rounded-md bg-background border border-border hover:bg-accent transition-colors"
            title="Zoom Out"
            disabled={scale <= 0.5}
          >
            <i className="fas fa-search-minus text-sm"></i>
          </button>
          <span className="text-sm text-muted-foreground min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            className="p-2 rounded-md bg-background border border-border hover:bg-accent transition-colors"
            title="Zoom In"
            disabled={scale >= 5}
          >
            <i className="fas fa-search-plus text-sm"></i>
          </button>
          <button
            onClick={resetView}
            className="p-2 rounded-md bg-background border border-border hover:bg-accent transition-colors"
            title="Reset View"
          >
            <i className="fas fa-expand-arrows-alt text-sm"></i>
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-md bg-background border border-border hover:bg-accent transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'} text-sm`}></i>
          </button>
        </div>
      </div>

      {/* Image Container */}
      <div 
        className="relative overflow-hidden bg-background touch-none"
        style={{ height: isFullscreen ? 'calc(100vh - 120px)' : '500px' }}
        onWheel={handleWheel}
        onMouseDown={!isMobile ? handleMouseDown : undefined}
        onMouseMove={!isMobile ? handleMouseMove : undefined}
        onMouseUp={!isMobile ? handleMouseUp : undefined}
        onMouseLeave={!isMobile ? handleMouseUp : undefined}
        onDoubleClick={handleDoubleClick}
        onTouchStart={isMobile ? (e) => {
          handleTouchStart(e);
          handleTouchStartPinch(e);
        } : undefined}
        onTouchMove={isMobile ? (e) => {
          handleTouchMove(e);
          handleTouchMovePinch(e);
        } : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
      >
        <img
          ref={imageRef}
          src={typeof location.url === 'string' ? location.url : location.url.toString()}
          alt={location.name || 'Location image'}
          className="absolute top-1/2 left-1/2 max-w-none transition-transform duration-200"
          style={{
            transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${scale})`,
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          draggable={false}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.parentElement!.innerHTML = `
              <div class="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <div class="text-center">
                  <i class="fas fa-exclamation-triangle text-4xl mb-2"></i>
                  <p>Failed to load location image</p>
                </div>
              </div>
            `;
          }}
        />
      </div>

      {/* Instructions */}
      <div className="p-3 bg-muted/20 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          <i className="fas fa-info-circle mr-1"></i>
          {isMobile 
            ? "Pinch to zoom • Touch and drag to pan • Double-tap to reset view"
            : "Use mouse wheel to zoom • Click and drag to pan • Double-click to reset view"
          }
        </p>
      </div>
    </div>
  );
}
