import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Image } from "lucide-react";
import { uploadIdfLogo } from "@/lib/api";

interface LogoWidgetProps {
  cluster: string;
  project: string;
  code: string;
  currentLogo?: { name: string; url: string } | null;
}

export default function LogoWidget({
  cluster,
  project,
  code,
  currentLogo,
}: LogoWidgetProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadIdfLogo(cluster, project, code, file),
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Logo uploaded successfully`,
      });
      setPreview(null);
      // Invalidate all relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['admin', 'idf-detail', cluster, project, code] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'idfs', cluster, project] });
      queryClient.invalidateQueries({ queryKey: ['/api', cluster, project, 'idfs', code] });
      queryClient.invalidateQueries({ queryKey: ['idfs', cluster, project] });
      queryClient.invalidateQueries({ queryKey: ['idfs', cluster, project, 'list'] });
      // Force a complete refetch
      setTimeout(() => {
        window.location.reload();
      }, 500);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload logo",
        variant: "destructive",
      });
      setPreview(null);
    },
  });

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.png,.jpg,.jpeg';
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        handleFileUpload(target.files[0]);
      }
    };
    input.click();
  };

  const handleFileUpload = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/') || !['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      toast({
        title: "Error",
        description: "Only PNG and JPG files are allowed",
        variant: "destructive",
      });
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload file
    uploadMutation.mutate(file);
  };

  const clearPreview = () => {
    setPreview(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">IDF Logo</h4>
        {(currentLogo || preview) && (
          <button
            onClick={clearPreview}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      {/* Current Logo Display */}
      {currentLogo && !preview && (
        <div className="relative">
          <img
            src={currentLogo.url.startsWith('http') ? currentLogo.url : `${import.meta.env.VITE_API_BASE_URL || ''}${currentLogo.url}`}
            alt={currentLogo.name || 'IDF Logo'}
            className="h-16 w-auto object-contain border rounded"
            onError={(e) => {
              console.error('Failed to load logo in widget:', currentLogo.url);
              const target = e.target as HTMLImageElement;
              target.src = '/static/assets/placeholder-logo.png';
              target.onerror = null; // Prevent infinite loop
            }}
          />
          <div className="text-xs text-muted-foreground mt-1">{currentLogo.name || 'IDF Logo'}</div>
        </div>
      )}</pre>

      {/* No Logo State */}
      {!currentLogo && !preview && (
        <div className="text-center py-4">
          <div className="text-sm text-muted-foreground">No logo uploaded</div>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="relative">
          <img
            src={preview}
            alt="Logo preview"
            className="h-16 w-auto object-contain border rounded"
          />
          <button
            onClick={clearPreview}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 text-xs"
          >
            <X className="w-3 h-3" />
          </button>
          <div className="text-xs text-muted-foreground mt-1">
            {uploadMutation.isPending ? "Uploading..." : "Preview"}
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-ring'
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
      >
        <Image className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium mb-1">Drop logo here</p>
        <p className="text-xs text-muted-foreground mb-3">PNG, JPG up to 10MB</p>
        <button
          onClick={handleFileSelect}
          disabled={uploadMutation.isPending}
          className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
        >
          <Upload className="w-3 h-3" />
          {uploadMutation.isPending ? 'Uploading...' : 'Select Logo'}
        </button>
      </div>
    </div>
  );
}