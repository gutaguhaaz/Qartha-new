import { MediaItem } from "@shared/schema";

interface DocListProps {
  documents: MediaItem[];
}

export default function DocList({ documents }: DocListProps) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground" data-testid="doclist-empty">
        <i className="fas fa-file-alt text-4xl mb-4"></i>
        <p>No documents available</p>
      </div>
    );
  }

  const getFileIcon = (url: string) => {
    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'fas fa-file-pdf text-red-400';
      case 'doc':
      case 'docx':
        return 'fas fa-file-word text-blue-400';
      case 'xls':
      case 'xlsx':
        return 'fas fa-file-excel text-green-400';
      case 'ppt':
      case 'pptx':
        return 'fas fa-file-powerpoint text-orange-400';
      default:
        return 'fas fa-file-alt text-gray-400';
    }
  };

  const getFileSize = (url: string) => {
    // This would typically come from the backend
    // For now, we'll show a placeholder
    return "Document";
  };

  return (
    <div className="space-y-3" data-testid="doclist-container">
      {documents.map((doc, index) => (
        <div
          key={index}
          className="bg-card border border-border rounded-lg p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
          data-testid={`document-${index}`}
        >
          <div className="flex items-center space-x-3">
            <i className={`${getFileIcon(doc.url)} text-xl`}></i>
            <div>
              <h4 className="font-medium" data-testid={`document-name-${index}`}>
                {doc.name || `Document ${index + 1}`}
              </h4>
              <p className="text-sm text-muted-foreground">
                {getFileSize(doc.url)}
              </p>
            </div>
          </div>
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 transition-colors"
            data-testid={`link-document-${index}`}
          >
            <i className="fas fa-external-link-alt"></i>
          </a>
        </div>
      ))}
    </div>
  );
}
