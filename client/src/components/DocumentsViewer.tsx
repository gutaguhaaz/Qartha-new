
import { useState, useRef } from "react";
import { FileText, Download, FileSpreadsheet, File, Archive, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { uploadAssets, deleteAsset } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface Document {
  url: string;
  name?: string;
  title?: string;
  kind: string;
}

interface DocumentsViewerProps {
  item?: Document[] | null;
  cluster?: string;
  project?: string;
  code?: string;
  onReload?: () => void;
}

export default function DocumentsViewer({ 
  item, 
  cluster, 
  project, 
  code, 
  onReload 
}: DocumentsViewerProps) {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const documents = item || [];

  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'zip':
      case 'rar':
        return <Archive className="w-5 h-5 text-purple-500" />;
      default:
        return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !cluster || !project || !code) return;

    const fileArray = Array.from(files);
    
    // Validate file types
    const allowedTypes = [
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar'
    ];
    
    const invalidFiles = fileArray.filter(file => {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      return !allowedTypes.includes(extension);
    });

    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid file type",
        description: `Allowed types: ${allowedTypes.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      await uploadAssets(cluster, project, code, fileArray, "documents");
      
      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({
        queryKey: ["/api", cluster, project, "idfs", code],
      });
      
      // Trigger custom reload event for diagrams tab
      window.dispatchEvent(new CustomEvent("reloadDocumentsTab"));
      
      if (onReload) {
        onReload();
      }

      toast({
        title: "Documents uploaded successfully",
        description: `${fileArray.length} document(s) uploaded`,
      });

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error("Error uploading documents:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (index: number) => {
    if (!cluster || !project || !code) return;

    setIsDeleting(index);
    try {
      await deleteAsset(cluster, project, code, "documents", index);
      
      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({
        queryKey: ["/api", cluster, project, "idfs", code],
      });
      
      // Trigger custom reload event
      window.dispatchEvent(new CustomEvent("reloadDocumentsTab"));
      
      if (onReload) {
        onReload();
      }

      toast({
        title: "Document deleted",
        description: "Document removed successfully",
      });
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDownload = (url: string, filename?: string, title?: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = title || filename || 'document';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!documents || documents.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mb-4 opacity-50 mx-auto" />
          <p className="text-muted-foreground mb-4">No documents available</p>
          
          {isAdmin && cluster && project && code && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
                multiple
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isUploading ? "Uploading..." : "Upload Documents"}
              </button>
              <p className="text-sm text-muted-foreground">
                Supported: PDF, DOC, DOCX, XLS, XLSX, ZIP, RAR
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header with upload option for admins */}
      {isAdmin && cluster && project && code && (
        <div className="border-b border-border p-4 bg-muted/50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Documents</h3>
            <div className="flex items-center space-x-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
                multiple
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center space-x-2 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
              >
                <FileText className="w-4 h-4" />
                <span>{isUploading ? "Uploading..." : "Upload"}</span>
              </button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Supported: PDF, DOC, DOCX, XLS, XLSX, ZIP, RAR
          </p>
        </div>
      )}

      {/* Documents List */}
      <div className="p-4 space-y-3">
        {documents.map((doc, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-lg hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              {getFileIcon(doc.name || doc.url)}
              <div>
                <p className="font-medium text-foreground">
                  {doc.title || doc.name || `Document ${index + 1}`}
                </p>
                <p className="text-sm text-muted-foreground capitalize">
                  {doc.kind} • {doc.url.split('.').pop()?.toUpperCase()}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleDownload(doc.url, doc.name, doc.title)}
                className="flex items-center space-x-2 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                title="Download document"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm">Download</span>
              </button>
              
              {isAdmin && cluster && project && code && (
                <button
                  onClick={() => handleDelete(index)}
                  disabled={isDeleting === index}
                  className="flex items-center space-x-2 px-3 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors disabled:opacity-50"
                  title="Delete document"
                >
                  <X className="w-4 h-4" />
                  {isDeleting === index && <span className="text-sm">Deleting...</span>}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
