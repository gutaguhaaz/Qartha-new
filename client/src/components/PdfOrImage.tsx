import { useState, useEffect } from "react";
import { MediaItem } from "@shared/schema";

interface PdfOrImageProps {
  diagram?: MediaItem;
}

export default function PdfOrImage({ diagram }: PdfOrImageProps) {
  const [zoom, setZoom] = useState(100);

  if (!diagram) {
    return (
      <div className="bg-card border border-border rounded-lg p-6" data-testid="diagram-empty">
        <div className="text-center py-12 text-muted-foreground">
          <i className="fas fa-project-diagram text-4xl mb-4"></i>
          <p>No hay diagrama disponible</p>
        </div>
      </div>
    );
  }

  const isPdf = diagram.url.toLowerCase().endsWith('.pdf');
  
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = diagram.url;
    link.download = diagram.name || 'diagram';
    link.click();
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6" data-testid="diagram-viewer">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold" data-testid="diagram-title">
          {diagram.name || 'Diagrama de red'}
        </h3>
        <div className="flex items-center space-x-2">
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
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden bg-muted/50 min-h-96" data-testid="diagram-container">
        {isPdf ? (
          <div className="p-4 text-center text-muted-foreground">
            <i className="fas fa-file-pdf text-4xl mb-4 text-red-400"></i>
            <p className="mb-4">Vista previa de PDF no disponible</p>
            <a
              href={diagram.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              data-testid="link-open-pdf"
            >
              <i className="fas fa-external-link-alt mr-2"></i>
              Abrir PDF
            </a>
          </div>
        ) : (
          <img
            src={diagram.url}
            alt={diagram.name || 'Network diagram'}
            className="w-full h-auto"
            style={{ transform: `scale(${zoom / 100})` }}
            data-testid="diagram-image"
          />
        )}
      </div>
    </div>
  );
}
