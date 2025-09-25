
import { useState, useRef, useCallback, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const [wheelZoomEnabled, setWheelZoomEnabled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const isMobile = useIsMobile();

  // Handle different data structures
  let items: Array<{ url: string; name?: string }> = [];
  if (item) {
    if (typeof item === "string") {
      items = [{ url: item }];
    } else if (Array.isArray(item)) {
      // Handle array of objects with url property or array of strings
      items = item
        .map((i) => {
          if (typeof i === "string") return { url: i };
          if (i && typeof i === "object" && i.url)
            return { url: i.url, name: i.name };
          return null;
        })
        .filter(Boolean);
    } else if (item && typeof item === "object" && item.url) {
      items = [{ url: item.url, name: item.name }];
    }
  }

  const currentItem = items[currentIndex];

  // Fix URL handling - ensure it's always a relative path starting with /static/
  const correctedUrl = (() => {
    if (!currentItem) return "";

    let url = typeof currentItem === "string" ? currentItem : currentItem.url;

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
      const match = url.match(
        /\/static\/([^\/]+\/[^\/]+\/[^\/]+\/dfo\/[^'"\s}]+)/,
      );
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
    else if (url.includes("replit.dev/")) {
      // Remove absolute URL domain if present
      const staticIndex = url.indexOf("/static/");
      if (staticIndex !== -1) {
        url = url.substring(staticIndex);
      }
    }

    // Clean up any remaining malformed parts
    if (url.startsWith("/static/{") || url.includes("//static/")) {
      // If URL starts with malformed data, return empty to trigger error handling
      return "";
    }

    // Ensure it starts with /static/
    if (!url.startsWith("/static/")) {
      url = `/static/${url.replace(/^\/+/, "")}`;
    }

    // Remove any trailing malformed data including commas and quotes
    url = url
      .split("'")[0]
      .split('"')[0]
      .split("}")[0]
      .split(",")[0]
      .split(" ")[0];

    return url;
  })();

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!wheelZoomEnabled) return; // Solo funciona si está habilitado
      e.preventDefault();
      const delta = e.deltaY * -0.01;
      const newZoom = Math.min(Math.max(zoom + delta * 25, 50), 200); // Convert to percentage like original
      setZoom(newZoom);
    },
    [zoom, wheelZoomEnabled],
  );

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = correctedUrl;
    link.download = `dfo-diagram-${currentIndex + 1}`;
    link.click();
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
    handleCenter();
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
    handleCenter();
  };

  const goToImage = (index: number) => {
    setCurrentIndex(index);
    handleCenter();
  };

  const handleCenter = useCallback(() => {
    setPosition({ x: 0, y: 0 });
    setZoom(100);
  }, []);

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
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

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !imageRef.current) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setPosition({
        x: dragStart.posX + dx,
        y: dragStart.posY + dy,
      });
    },
    [isDragging, dragStart],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDoubleClick = useCallback(() => {
    setZoom(100);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Touch event handlers for mobile
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        setIsDragging(true);
        setDragStart({
          x: touch.clientX,
          y: touch.clientY,
          posX: position.x,
          posY: position.y,
        });
      }
    },
    [position],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;

      const touch = e.touches[0];
      const dx = touch.clientX - dragStart.x;
      const dy = touch.clientY - dragStart.y;
      setPosition({
        x: dragStart.posX + dx,
        y: dragStart.posY + dy,
      });
    },
    [isDragging, dragStart],
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Pinch to zoom for mobile
  const [pinchStart, setPinchStart] = useState({ distance: 0, zoom: 100 });

  const handleTouchStartPinch = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
            Math.pow(touch2.clientY - touch1.clientY, 2),
        );
        setPinchStart({ distance, zoom });
      }
    },
    [zoom],
  );

  const handleTouchMovePinch = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
            Math.pow(touch2.clientY - touch1.clientY, 2),
        );
        const ratio = distance / pinchStart.distance;
        const newZoom = Math.min(Math.max(pinchStart.zoom * ratio, 50), 200);
        setZoom(newZoom);
      }
    },
    [pinchStart],
  );

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp, { once: true });
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const imageStyle = {
    transform: `scale(${zoom / 100}) translate(${position.x}px, ${position.y}px)`,
    transformOrigin: "center center",
    cursor: isDragging ? "grabbing" : "grab",
  };

  const containerClasses = `border border-border rounded-lg overflow-hidden min-h-96 
    ${isFullscreen ? "fixed inset-0 z-50 bg-black bg-opacity-80" : "bg-muted/50"}`;

  if (!items || items.length === 0) {
    return (
      <div
        className="bg-card border border-border rounded-lg p-6"
        data-testid="dfo-empty"
      >
        <div className="text-center py-12 text-muted-foreground">
          <i className="fas fa-table text-4xl mb-4"></i>
          <p>No DFO diagram available</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={containerClasses}
      data-testid="dfo-viewer"
      ref={containerRef}
    >
      {/* Controls */}
      <div className={`p-4 border-b border-border ${isFullscreen ? "bg-gray-800" : "bg-muted/30"}`}>
        {/* Desktop layout */}
        <div className="hidden md:flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h3 className={`text-lg font-semibold ${isFullscreen ? "text-white" : ""}`}>
              {currentItem?.name || `Distribution Fiber Optic ${currentIndex + 1}`}
            </h3>
            {items.length > 1 && (
              <span className={`text-sm ${isFullscreen ? "text-gray-300" : "text-muted-foreground"}`}>
                ({currentIndex + 1} of {items.length})
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {items.length > 1 && (
              <>
                <button
                  onClick={handlePrevious}
                  className={`p-2 rounded-md text-sm transition-colors ${
                    isFullscreen 
                      ? "bg-gray-700 hover:bg-gray-600 text-white" 
                      : "bg-background border border-border hover:bg-accent"
                  }`}
                  title="Previous"
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                <button
                  onClick={handleNext}
                  className={`p-2 rounded-md text-sm transition-colors ${
                    isFullscreen 
                      ? "bg-gray-700 hover:bg-gray-600 text-white" 
                      : "bg-background border border-border hover:bg-accent"
                  }`}
                  title="Next"
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </>
            )}
            <button
              onClick={handleZoomOut}
              className={`p-2 rounded-md text-sm transition-colors ${
                isFullscreen 
                  ? "bg-gray-700 hover:bg-gray-600 text-white" 
                  : "bg-background border border-border hover:bg-accent"
              }`}
              title="Zoom Out"
              disabled={zoom <= 50}
            >
              <i className="fas fa-search-minus"></i>
            </button>
            <span className={`text-sm min-w-[60px] text-center ${isFullscreen ? "text-gray-300" : "text-muted-foreground"}`}>
              {zoom}%
            </span>
            <button
              onClick={handleZoomIn}
              className={`p-2 rounded-md text-sm transition-colors ${
                isFullscreen 
                  ? "bg-gray-700 hover:bg-gray-600 text-white" 
                  : "bg-background border border-border hover:bg-accent"
              }`}
              title="Zoom In"
              disabled={zoom >= 200}
            >
              <i className="fas fa-search-plus"></i>
            </button>
            <button
              onClick={() => setWheelZoomEnabled(!wheelZoomEnabled)}
              className={`p-2 rounded-md border transition-colors ${
                wheelZoomEnabled 
                  ? isFullscreen 
                    ? "bg-blue-600 text-white border-blue-500" 
                    : "bg-primary text-primary-foreground border-primary"
                  : isFullscreen 
                    ? "bg-gray-700 hover:bg-gray-600 text-white border-gray-600" 
                    : "bg-background hover:bg-accent border-border"
              }`}
              title={wheelZoomEnabled ? "Disable Mouse Wheel Zoom" : "Enable Mouse Wheel Zoom"}
            >
              <i className="fas fa-mouse text-sm"></i>
            </button>
            <button
              onClick={handleCenter}
              className={`p-2 rounded-md text-sm transition-colors ${
                isFullscreen 
                  ? "bg-gray-700 hover:bg-gray-600 text-white" 
                  : "bg-background border border-border hover:bg-accent"
              }`}
              title="Reset View"
            >
              <i className="fas fa-compress-alt"></i>
            </button>
            <button
              onClick={handleDownload}
              className={`p-2 rounded-md text-sm transition-colors ${
                isFullscreen 
                  ? "bg-gray-700 hover:bg-gray-600 text-white" 
                  : "bg-background border border-border hover:bg-accent"
              }`}
              title="Download"
            >
              <i className="fas fa-download"></i>
            </button>
            <button
              onClick={toggleFullscreen}
              className={`p-2 rounded-md text-sm transition-colors ${
                isFullscreen 
                  ? "bg-gray-700 hover:bg-gray-600 text-white" 
                  : "bg-background border border-border hover:bg-accent"
              }`}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              <i className={isFullscreen ? "fas fa-compress" : "fas fa-expand"}></i>
            </button>
          </div>
        </div>

        {/* Mobile layout - stacked vertically */}
        <div className="md:hidden space-y-3">
          <div className="flex items-center justify-center">
            <span className={`text-sm font-medium ${isFullscreen ? "text-white" : ""}`}>
              DFO {currentIndex + 1}
            </span>
            {items.length > 1 && (
              <span className={`text-xs ml-2 ${isFullscreen ? "text-gray-300" : "text-muted-foreground"}`}>
                • {items.length} diagrams
              </span>
            )}
          </div>
          
          {/* Navigation for multiple images */}
          {items.length > 1 && (
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={handlePrevious}
                className={`px-4 py-2 rounded-md text-sm transition-colors ${
                  isFullscreen 
                    ? "bg-gray-700 hover:bg-gray-600 text-white" 
                    : "bg-background border border-border hover:bg-accent"
                }`}
                title="Previous"
              >
                <i className="fas fa-chevron-left mr-2"></i>
                Previous
              </button>
              <button
                onClick={handleNext}
                className={`px-4 py-2 rounded-md text-sm transition-colors ${
                  isFullscreen 
                    ? "bg-gray-700 hover:bg-gray-600 text-white" 
                    : "bg-background border border-border hover:bg-accent"
                }`}
                title="Next"
              >
                Next
                <i className="fas fa-chevron-right ml-2"></i>
              </button>
            </div>
          )}
          
          {/* Controls row 1: Zoom controls */}
          <div className="flex items-center justify-center space-x-3">
            <button
              onClick={handleZoomOut}
              className={`p-3 rounded-md transition-colors ${
                isFullscreen 
                  ? "bg-gray-700 hover:bg-gray-600 text-white" 
                  : "bg-background border border-border hover:bg-accent"
              }`}
              title="Zoom Out"
              disabled={zoom <= 50}
            >
              <i className="fas fa-search-minus text-base"></i>
            </button>
            <span className={`text-sm min-w-[60px] text-center font-medium ${isFullscreen ? "text-white" : "text-muted-foreground"}`}>
              {zoom}%
            </span>
            <button
              onClick={handleZoomIn}
              className={`p-3 rounded-md transition-colors ${
                isFullscreen 
                  ? "bg-gray-700 hover:bg-gray-600 text-white" 
                  : "bg-background border border-border hover:bg-accent"
              }`}
              title="Zoom In"
              disabled={zoom >= 200}
            >
              <i className="fas fa-search-plus text-base"></i>
            </button>
          </div>
          
          {/* Controls row 2: Mouse wheel toggle */}
          <div className="flex items-center justify-center">
            <button
              onClick={() => setWheelZoomEnabled(!wheelZoomEnabled)}
              className={`px-4 py-2 rounded-md border transition-colors text-sm ${
                wheelZoomEnabled 
                  ? isFullscreen 
                    ? "bg-blue-600 text-white border-blue-500" 
                    : "bg-primary text-primary-foreground border-primary"
                  : isFullscreen 
                    ? "bg-gray-700 hover:bg-gray-600 text-white border-gray-600" 
                    : "bg-background hover:bg-accent border-border"
              }`}
              title={wheelZoomEnabled ? "Disable Mouse Wheel Zoom" : "Enable Mouse Wheel Zoom"}
            >
              <i className="fas fa-mouse mr-2"></i>
              Mouse Wheel: {wheelZoomEnabled ? "ON" : "OFF"}
            </button>
          </div>
          
          {/* Controls row 3: Reset, download and fullscreen */}
          <div className="flex items-center justify-center space-x-3">
            <button
              onClick={handleCenter}
              className={`px-3 py-2 rounded-md transition-colors text-sm ${
                isFullscreen 
                  ? "bg-gray-700 hover:bg-gray-600 text-white" 
                  : "bg-background border border-border hover:bg-accent"
              }`}
              title="Reset View"
            >
              <i className="fas fa-compress-alt mr-2"></i>
              Reset
            </button>
            <button
              onClick={handleDownload}
              className={`px-3 py-2 rounded-md transition-colors text-sm ${
                isFullscreen 
                  ? "bg-gray-700 hover:bg-gray-600 text-white" 
                  : "bg-background border border-border hover:bg-accent"
              }`}
              title="Download"
            >
              <i className="fas fa-download mr-2"></i>
              Download
            </button>
            <button
              onClick={toggleFullscreen}
              className={`px-3 py-2 rounded-md transition-colors text-sm ${
                isFullscreen 
                  ? "bg-gray-700 hover:bg-gray-600 text-white" 
                  : "bg-background border border-border hover:bg-accent"
              }`}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              <i className={`fas ${isFullscreen ? "fa-compress" : "fa-expand"} mr-2`}></i>
              {isFullscreen ? "Exit" : "Full"}
            </button>
          </div>
        </div>

        {/* Thumbnails for multiple images */}
        {items.length > 1 && (
          <div className="flex space-x-2 justify-center mt-4">
            {items.map((item, index) => (
              <button
                key={index}
                onClick={() => goToImage(index)}
                className={`w-16 h-12 border-2 rounded overflow-hidden transition-all ${
                  index === currentIndex
                    ? isFullscreen 
                      ? "border-blue-500" 
                      : "border-primary"
                    : isFullscreen
                      ? "border-gray-600 hover:border-gray-400"
                      : "border-border hover:border-primary/50"
                }`}
                data-testid={`thumbnail-${index}`}
              >
                <img
                  src={(() => {
                    let url = typeof item === "string" ? item : item.url;
                    if (
                      url.includes("replit.dev") &&
                      url.includes("//static/{'url':")
                    ) {
                      const match = url.match(/'\/static\/([^']+)'/);
                      if (match) url = `/static/${match[1]}`;
                    } else if (url.includes("/static/{'url':")) {
                      const match = url.match(
                        /\/static\/([^\/]+\/[^\/]+\/[^\/]+\/dfo\/[^'"\s}]+)/,
                      );
                      if (match) url = `/static/${match[1]}`;
                    } else if (url.includes("{'url':")) {
                      const match = url.match(/['"](\/static\/[^'"]+)['"]/);
                      if (match) url = match[1];
                    } else if (url.includes("replit.dev/")) {
                      const staticIndex = url.indexOf("/static/");
                      if (staticIndex !== -1) url = url.substring(staticIndex);
                    }
                    if (!url.startsWith("/static/"))
                      url = `/static/${url.replace(/^\/+/, "")}`;
                    return url
                      .split("'")[0]
                      .split('"')[0]
                      .split("}")[0]
                      .split(",")[0]
                      .split(" ")[0];
                  })()}
                  alt={`DFO ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src =
                      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA2NCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yOCAyN বস্তু2LjUgMjQuNUwzNi41IDMyLjVIMjhWMjRaWiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K";
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Image Container */}
      <div
        className="relative w-full h-full flex items-center justify-center"
        style={{ 
          height: isFullscreen ? "calc(100vh - 60px)" : "400px",
          touchAction: isMobile ? "none" : "auto",
        }}
        data-testid="dfo-container"
        onWheel={handleWheel}
        onMouseDown={!isMobile ? handleMouseDown : undefined}
        onMouseLeave={!isMobile ? handleMouseUp : undefined}
        onDoubleClick={handleDoubleClick}
        onTouchStart={
          isMobile
            ? (e) => {
                handleTouchStart(e);
                handleTouchStartPinch(e);
              }
            : undefined
        }
        onTouchMove={
          isMobile
            ? (e) => {
                handleTouchMove(e);
                handleTouchMovePinch(e);
              }
            : undefined
        }
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
      >
        <div
          className="relative w-full h-full overflow-hidden"
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
        >
          <img
            ref={imageRef}
            src={correctedUrl}
            alt="DFO Layout"
            className="absolute object-contain w-full h-full"
            style={imageStyle}
            data-testid="dfo-image"
            draggable={false}
            onError={(e) => {
              console.error(`Failed to load DFO image: ${correctedUrl}`);
              const target = e.target as HTMLImageElement;
              target.parentElement!.innerHTML = `
                <div class="p-4 text-center ${isFullscreen ? 'text-white' : 'text-muted-foreground'} flex flex-col items-center justify-center h-full">
                  <i class="fas fa-exclamation-triangle text-4xl mb-4 text-yellow-400"></i>
                  <p class="mb-2">Failed to load DFO image</p>
                  <p class="text-sm ${isFullscreen ? 'text-gray-300' : 'text-muted-foreground'}">${correctedUrl}</p>
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

      {/* Instructions */}
      <div className={`p-3 border-t border-border ${isFullscreen ? "bg-gray-800/50" : "bg-muted/20"}`}>
        <p className={`text-xs text-center ${isFullscreen ? "text-gray-300" : "text-muted-foreground"}`}>
          <i className="fas fa-info-circle mr-1"></i>
          {isMobile
            ? "Pinch to zoom • Touch and drag to pan • Double-tap to reset view"
            : `${wheelZoomEnabled ? "Mouse wheel to zoom • " : ""}Click and drag to pan • Double-click to reset view • Toggle mouse wheel zoom with button`}
        </p>
      </div>
    </div>
  );
}
