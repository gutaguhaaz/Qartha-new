
import { FileText, Download, FileSpreadsheet, File, Archive } from "lucide-react";

interface Document {
  url: string;
  name?: string;
  title?: string;
  kind: string;
}

interface DocumentsViewerProps {
  item?: Document[] | null;
}

export default function DocumentsViewer({ item }: DocumentsViewerProps) {

  const documents = item || [];

  const getFileIcon = (filename: string) => {
    if (!filename) return <File className="w-5 h-5 text-gray-500" />;
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
          <p className="text-muted-foreground">No documents available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="border-b border-border p-4 bg-muted/50">
        <h3 className="text-lg font-semibold">Documents</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Available documentation files
        </p>
      </div>

      {/* Documents List */}
      <div className="p-4 space-y-3">
        {documents.map((doc, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-lg hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              {getFileIcon(doc.name || doc.url || 'document')}
              <div>
                <p className="font-medium text-foreground">
                  {doc.title || doc.name || `Document ${index + 1}`}
                </p>
                <p className="text-sm text-muted-foreground capitalize">
                  {doc.kind} • {doc.url.split('.').pop()?.toUpperCase()}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => handleDownload(doc.url, doc.name, doc.title)}
              className="flex items-center space-x-2 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              title="Download document"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm">Download</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
