import {
  FileText,
  Download,
  FileSpreadsheet,
  File,
  Archive,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getIdf } from "@/lib/api";

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
}

export default function DocumentsViewer({
  item,
  cluster,
  project,
  code,
}: DocumentsViewerProps) {
  const [localDocuments, setLocalDocuments] = useState<Document[]>(item || []);
  const queryClient = useQueryClient();

  // Query to get fresh IDF data when needed
  const { data: freshIdfData } = useQuery({
    queryKey: ["/api", cluster, project, "idfs", code],
    queryFn: () =>
      cluster && project && code ? getIdf(cluster, project, code) : null,
    enabled: false, // Only run when manually refetched
  });

  // Update local documents when item prop changes
  useEffect(() => {
    if (item) {
      console.log("DocumentsViewer received new documents:", item);
      setLocalDocuments(item);
    }
  }, [item]);

  // Listen for document reload events
  useEffect(() => {
    const handleReloadDocuments = async () => {
      if (cluster && project && code) {
        try {
          console.log("Reloading documents for:", { cluster, project, code });

          // First invalidate the query
          await queryClient.invalidateQueries({
            queryKey: ["/api", cluster, project, "idfs", code],
          });

          // Wait a bit and then force refetch fresh data
          setTimeout(async () => {
            try {
              const freshData = await queryClient.fetchQuery({
                queryKey: ["/api", cluster, project, "idfs", code],
                queryFn: () => getIdf(cluster, project, code),
                staleTime: 0, // Force fresh fetch
              });

              console.log("Fresh data received:", freshData?.documents);

              if (freshData?.documents) {
                // Force update with fresh data
                setLocalDocuments([...freshData.documents]);
              }
            } catch (fetchError) {
              console.error("Error fetching fresh data:", fetchError);
            }
          }, 50);
        } catch (error) {
          console.error("Error reloading documents:", error);
        }
      }
    };

    window.addEventListener("reloadDocumentsTab", handleReloadDocuments);
    return () =>
      window.removeEventListener("reloadDocumentsTab", handleReloadDocuments);
  }, [cluster, project, code, queryClient]);

  const documents = localDocuments;

  const getFileIcon = (filename: string) => {
    if (!filename) return <File className="w-5 h-5 text-gray-500" />;
    const extension = filename.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "xlsx":
      case "xls":
        return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
      case "pdf":
        return <FileText className="w-5 h-5 text-red-500" />;
      case "doc":
      case "docx":
        return <FileText className="w-5 h-5 text-blue-500" />;
      case "zip":
      case "rar":
        return <Archive className="w-5 h-5 text-purple-500" />;
      default:
        return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  const handleDownload = (url: string, filename?: string, title?: string) => {
    // Create a proper download URL using the API base
    const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
    const downloadUrl = url.startsWith("http") ? url : `${API_BASE}${url}`;

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename || title || "document";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
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
      <div className="p-4">
        {/* Desktop Layout */}
        <div className="hidden md:block space-y-3">
          {documents.map((doc, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                {getFileIcon(doc.name || doc.url || "document")}
                <div>
                  <p className="font-semibold text-foreground text-base">
                    {doc.title &&
                    doc.title.trim() !== "" &&
                    doc.title !== "undefined"
                      ? doc.title
                      : `SW ports ${index + 1}`}
                  </p>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <span>
                      {doc.name || doc.url?.split("/").pop() || "document"}
                    </span>
                    <span>•</span>
                    <span className="capitalize">{doc.kind || "document"}</span>
                    <span>•</span>
                    <span>
                      {doc.url?.split(".").pop()?.toUpperCase() || "FILE"}
                    </span>
                  </div>
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

        {/* Mobile Layout - Grid with 2 columns */}
        <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
          {documents.map((doc, index) => (
            <div
              key={index}
              className="flex flex-col p-3 bg-muted/30 border border-border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start space-x-2 mb-3">
                {getFileIcon(doc.name || doc.url || "document")}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm leading-tight truncate">
                    {doc.title &&
                    doc.title.trim() !== "" &&
                    doc.title !== "undefined"
                      ? doc.title
                      : `SW ports ${index + 1}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {doc.name || doc.url?.split("/").pop() || "document"}
                  </p>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                    <span className="capitalize">{doc.kind || "doc"}</span>
                    <span>•</span>
                    <span>
                      {doc.url?.split(".").pop()?.toUpperCase() || "FILE"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDownload(doc.url, doc.name, doc.title)}
                className="flex items-center justify-center space-x-2 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
                title="Download document"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
