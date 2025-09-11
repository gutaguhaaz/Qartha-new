
import { useState, useRef, useCallback } from 'react';
import { MediaItem } from '@shared/schema';

interface LocationViewerProps {
  location?: MediaItem | null;
}

export default function LocationViewer({ location }: LocationViewerProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

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

  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 5));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  if (!location) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <i className="fas fa-map-marker-alt text-4xl mb-4"></i>
        <p>No location image available</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Controls */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
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
        </div>
      </div>

      {/* Image Container */}
      <div 
        className="relative overflow-hidden bg-background"
        style={{ height: '500px' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
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
          Use mouse wheel to zoom • Click and drag to pan • Double-click to reset view
        </p>
      </div>
    </div>
  );
}
