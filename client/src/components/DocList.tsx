import { FileText, Download, FileSpreadsheet } from "lucide-react";

interface Document {
  url: string;
  name?: string;
  kind: string;
}

interface DocListProps {
  documents: Document[];
}

export default function DocList({ documents }: DocListProps) {
  if (!documents || documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FileText className="w-12 h-12 mb-4 opacity-50" />
        <p>No documents available</p>
      </div>
    );
  }

  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    if (extension === 'xlsx' || extension === 'xls') {
      return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
    }
    return <FileText className="w-5 h-5 text-blue-500" />;
  };

  const handleDownload = (url: string, filename?: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'document';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-3">
      {documents.map((doc, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            {getFileIcon(doc.name || doc.url)}
            <div>
              <p className="font-medium text-foreground">
                {doc.name || `Document ${index + 1}`}
              </p>
              <p className="text-sm text-muted-foreground capitalize">
                {doc.kind} • {doc.url.split('.').pop()?.toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleDownload(doc.url, doc.name)}
            className="flex items-center space-x-2 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            title="Download document"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm">Download</span>
          </button>
        </div>
      ))}
    </div>
  );
}