import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { MediaItem } from "@shared/schema";
import { Trash2 } from "lucide-react";

interface GalleryProps {
  images: MediaItem[];
  onDelete?: (index: number) => void;
}

export default function Gallery({ images, onDelete }: GalleryProps) {
  const [selectedImage, setSelectedImage] = useState<MediaItem | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openLightbox = (image: MediaItem) => {
    setSelectedImage(image);
    setIsOpen(true);
  };

  const closeLightbox = () => {
    setIsOpen(false);
    setSelectedImage(null);
  };

  if (images.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground" data-testid="gallery-empty">
        <i className="fas fa-images text-4xl mb-4"></i>
        <p>No images available</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" data-testid="gallery-grid">
        {images.map((image, index) => (
          <div
            key={index}
            className="relative aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => openLightbox(image)}
            data-testid={`image-${index}`}
          >
            {onDelete && (
              <button
                className="absolute top-2 right-2 z-10 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                onClick={(e) => { e.stopPropagation(); onDelete(index); }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <img
              src={image.url}
              alt={image.name || `Gallery image ${index + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl" data-testid="lightbox-dialog">
          <DialogTitle className="sr-only">
            {selectedImage?.name || 'Image viewer'}
          </DialogTitle>
          {selectedImage && (
            <div className="relative">
              <img
                src={selectedImage.url}
                alt={selectedImage.name || 'Gallery image'}
                className="w-full h-auto max-h-[80vh] object-contain"
                data-testid="lightbox-image"
              />
              <button
                onClick={closeLightbox}
                className="absolute top-4 right-4 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70 transition-colors"
                data-testid="button-close-lightbox"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
