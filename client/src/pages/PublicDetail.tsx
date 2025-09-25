import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { getIdf, getLogo } from "@/lib/api";
import Gallery from "@/components/Gallery";
import DocumentsViewer from "@/components/DocumentsViewer";
import PdfOrImage from "@/components/PdfOrImage";
import DfoImageViewer from "@/components/DfoImageViewer";
import DiagramsViewer from "@/components/DiagramsViewer";
import AdminSidebar from "@/components/AdminSidebar";
import AddIdfDialog from "@/components/AddIdfDialog";
import LocationViewer from "@/components/LocationViewer";
import { useAuth } from "@/contexts/AuthContext";
import type { MediaItem } from "@shared/schema";
import { Camera, FileText, Grid3X3, MapPin, Network } from "lucide-react";

// Placeholder types and components assumed to be available
// import { Button } from "@/components/ui/Button";
// import { ArrowLeft, Plus, QrCode, Edit, Building } from "lucide-react";
// import QrCodeModal from "@/components/QrCodeModal";
// import { titleCase } from "@/lib/utils";

// Mock components and functions for demonstration purposes
const Button = ({ children, ...props }) => <button {...props}>{children}</button>;
const ArrowLeft = ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>;
const Plus = ({ className, ...props }) => <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
const QrCode = ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.282-2.906.747v13.5c0 1.052.282 2.062.747 2.906h.75a6.375 6.375 0 013.157-5.25h1.144a2.075 2.075 0 011.944 1.513l.496 1.578a2.075 2.075 0 001.944 1.513h.765c.65.09 1.282.172 1.905.25a6.375 6.375 0 003.157-5.25v-1.144a2.075 2.075 0 00-1.944-1.513h-.765c-.09-.017-.182-.025-.274-.027zM12 10.875c.75 0 1.375.625 1.375 1.375v1.875c0 .75-.625 1.375-1.375 1.375H9.375A2.075 2.075 0 017.5 13.5v-1.875c0-.75.625-1.375 1.375-1.375h2.125z" /></svg>;
const Edit = ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a6.041 6.041 0 00-8.484 0L12 5.223 10.977 4.124a6.041 6.041 0 00-8.484 0m8.484 1.125a6.041 6.041 0 019.192 0M16.5 6.679v1.043a2.15 2.15 0 01-1.052 1.877l-1.553.776m-3.625.665c-.188.295-.394.585-.61.862v.001c-.216.277-.422.567-.61.862V14.25a2.25 2.25 0 001.625 2.232l1.553.776a2.15 2.15 0 011.052 1.877v1.043h.75a2.25 2.25 0 002.052-1.562l1.052-2.625c-.188-.295-.394-.585-.61-.862V13.5a2.25 2.25 0 00-1.625-2.232l-1.553-.776M12.75 1.506a4.016 4.016 0 00-.677.096c-1.126.376-2.085.776-2.756 1.157h-.001L9.375 2.787c-.49.378-.889.776-1.264 1.157H7.5A3.75 3.75 0 003.75 6.75v3.75c0 .75.447 1.375 1.003 1.75v1.75a3.75 3.75 0 001.003 1.75v2.25a3.75 3.75 0 001.125 2.037c.225.277.431.567.61.862v.001c.188.295.394.585.61.862h1.5c.216.277.422.567.61.862V19.5a3.75 3.75 0 001.003 1.75v.75c0 .75.587 1.375 1.313 1.625h.001C12.516 23.913 13.3 24 14.062 24h1.5c.762 0 1.547-.087 2.218-.287.318-.098.665-.237 1.003-.437.338-.207.665-.454.963-.75H19.5a3.75 3.75 0 001.003-1.75v-1.75a3.75 3.75 0 001.003-1.75v-3.75a3.75 3.75 0 001.003-1.75V10.5c.556-.375 1.003-1 1.003-1.75v-1.75a3.75 3.75 0 00-1.003-1.75v-3.75a3.75 3.75 0 00-1.003-1.75h-.375c-.375-.4-.774-.776-1.264-1.157L13.5 2.787a4.016 4.016 0 00-.677-.096z" /></svg>;
const Building = ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5m-16.5-24h16.5m-8.25-6.75h3.75c0 1.034-.448 1.955-1.168 2.657a3.75 3.75 0 00-1.864 3.247v4.75a3.75 3.75 0 001.864 3.247h1.168c.657 0 1.168.665 1.168 1.505v2.25h1.168c.657 0 1.168.665 1.168 1.505v2.25h1.168c.657 0 1.168-.665 1.168-1.505v-2.25c0-.954.512-1.75 1.168-1.75h1.168v-2.25c0-.954-.512-1.75-1.168-1.75h-1.168v-1.5c0-.954-.512-1.75-1.168-1.75h-1.168v-2.25c0-.954-.512-1.75-1.168-1.75h-1.168v-1.5a3.75 3.75 0 00-1.864-3.247V12h1.168c.657 0 1.168-.665 1.168-1.505V7.5m-1.168-6.75h-3.75" /></svg>;
const DfoImageViewer = ({ item }) => <div className="bg-card border border-border rounded-lg overflow-hidden p-4">DFO Content Placeholder</div>;
const Gallery = ({ images }) => <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">Gallery Placeholder</div>;
const LocationViewer = ({ location }) => <div className="bg-card border border-border rounded-lg overflow-hidden p-4">Location Content Placeholder</div>;
const DiagramsViewer = ({ item }) => <div className="bg-card border border-border rounded-lg overflow-hidden p-4">Diagrams Content Placeholder</div>;
const DocumentsViewer = ({ documents }) => <div className="bg-card border border-border rounded-lg overflow-hidden p-4">Documents Content Placeholder</div>;
const AdminSidebar = ({ isOpen, onClose, preloadIdf }) => null;
const AddIdfDialog = ({ open, onOpenChange, onCreated }) => null;
const QrCodeModal = ({ open, onOpenChange, idf, cluster, project }) => null;
const titleCase = (str) => str.charAt(0).toUpperCase() + str.slice(1);


interface PublicDetailProps {
  cluster: string;
  project: string;
  code: string;
}

// Mock detail and logoUrl for placeholder
const detail = { code: "IDF001", site: "SiteA", description: "This is a test IDF.", dfo: [], images: [], location: null, diagrams: [], documents: [] };
const logoUrl = "/mock-logo.png";
const qrCodeUrl = "/mock-qr.png";
const showQrModal = false; // Mock state
const handleOpenAdmin = () => console.log("Opening admin"); // Mock function
const handleReloadDiagramsTab = () => console.log("Reloading diagrams");
const handleReloadDocumentsTab = () => console.log("Reloading documents");

export default function PublicDetail({
  params,
}: {
  params: PublicDetailProps;
}) {
  const { cluster, project, code } = params;
  const [activeTab, setActiveTab] = useState<string>("table");
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAddIdfDialogOpen, setIsAddIdfDialogOpen] = useState(false);
  const { isAdmin, loading: authLoading } = useAuth();
  const canManage = isAdmin && !authLoading;
  const queryClient = useQueryClient();

  // Listen for admin panel open events and tab reload events
  useEffect(() => {
    if (!canManage) {
      setIsAdminOpen(false);
      setIsAddIdfDialogOpen(false);
      return;
    }

    const handleOpenAdmin = () => {
      setIsAdminOpen(true);
    };

    const handleReloadDiagramsTab = () => {
      if (activeTab === "diagram") {
        // Invalidate queries to refresh data without page reload
        queryClient.invalidateQueries({
          queryKey: ["/api", cluster, project, "idfs", code],
        });
      }
    };

    const handleReloadDocumentsTab = async () => {
      try {
        console.log("Reloading documents tab, current tab:", activeTab);

        // Always invalidate and refetch, regardless of active tab
        await queryClient.invalidateQueries({
          queryKey: ["/api", cluster, project, "idfs", code],
        });

        // Force a fresh fetch after a small delay
        setTimeout(async () => {
          try {
            await queryClient.refetchQueries({
              queryKey: ["/api", cluster, project, "idfs", code],
              staleTime: 0,
            });
            console.log("Documents tab reloaded successfully");
          } catch (refetchError) {
            console.error("Error refetching documents:", refetchError);
          }
        }, 100);
      } catch (error) {
        console.error("Error reloading documents tab:", error);
      }
    };

    window.addEventListener("openAdminWithIdf", handleOpenAdmin);
    window.addEventListener("reloadDiagramsTab", handleReloadDiagramsTab);
    window.addEventListener("reloadDocumentsTab", handleReloadDocumentsTab);

    return () => {
      window.removeEventListener("openAdminWithIdf", handleOpenAdmin);
      window.removeEventListener("reloadDiagramsTab", handleReloadDiagramsTab);
      window.removeEventListener(
        "reloadDocumentsTab",
        handleReloadDocumentsTab,
      );
    };
  }, [canManage, activeTab, queryClient]);

  // Prefetch initial IDF data
  useEffect(() => {
    if (params.cluster && params.project && params.code) {
      queryClient.prefetchQuery({
        queryKey: ["/api", params.cluster, params.project, "idfs", params.code],
        queryFn: () => getIdf(params.cluster, params.project, params.code),
      });
    }
  }, [params.cluster, params.project, params.code, queryClient]);

  // Listen for document updates
  useEffect(() => {
    const handleDocumentUpdate = () => {
      if (params.cluster && params.project && params.code) {
        queryClient.invalidateQueries({
          queryKey: [
            "/api",
            params.cluster,
            params.project,
            "idfs",
            params.code,
          ],
        });
      }
    };

    window.addEventListener("reloadDocumentsTab", handleDocumentUpdate);
    return () =>
      window.removeEventListener("reloadDocumentsTab", handleDocumentUpdate);
  }, [params.cluster, params.project, params.code, queryClient]);

  const {
    data: idf,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api", cluster, project, "idfs", code],
    queryFn: () => getIdf(cluster, project, code),
  });

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
  const { data: logo } = useQuery({
    queryKey: ["logo", cluster, project],
    queryFn: () => getLogo(cluster, project),
    retry: false,
  });

  // Move useMemo before conditional returns to avoid hook order issues
  const documents = useMemo(() => {
    if (!idf) return [];
    const items = [...(idf.documents ?? [])];
    if (idf.dfo && idf.dfo.kind === "document") {
      items.push(idf.dfo);
    }
    return items;
  }, [idf]);

  const getHealthIndicatorClass = (level?: string) => {
    switch (level) {
      case "green":
        return "bg-green-500";
      case "yellow":
        return "bg-yellow-500";
      case "red":
        return "bg-red-500";
      case "gray":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getHealthLabel = (level?: string) => {
    switch (level) {
      case "green":
        return "Operational";
      case "yellow":
        return "Under Review";
      case "red":
        return "Critical Failure";
      case "gray":
        return "No Data";
      default:
        return "No Data";
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-12 bg-muted rounded w-full mb-6"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !idf) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="text-center py-12">
          <i className="fas fa-exclamation-triangle text-4xl text-destructive mb-4"></i>
          <h2 className="text-xl font-semibent mb-2">Error Loading IDF</h2>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : "IDF not found"}
          </p>
          <Link
            href={`/${cluster}/${project}`}
            className="mt-4 inline-block text-primary hover:underline"
          >
            Back to Directory
          </Link>
        </div>
      </div>
    );
  }

  // Use absolute URL for QR code to ensure it works
  // Map frontend project to backend project name
  const getApiProject = (proj: string) => {
    if (proj === "sabinas" || proj === "Sabinas") return "Sabinas Project";
    return proj;
  };

  const apiProject = getApiProject(project);
  const qrUrl = `${window.location.origin}/api/${encodeURIComponent(cluster)}/${encodeURIComponent(apiProject)}/idfs/${encodeURIComponent(code)}/qr.png`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <Link
                href={`/${cluster}/${project}`}
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm sm:text-base"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Directory</span>
                <span className="sm:hidden">Back</span>
              </Link>

              {canManage && (
                <Button
                  size="sm"
                  onClick={() => setIsAddIdfDialogOpen(true)}
                  className="create-idf text-xs sm:text-sm px-2 sm:px-3"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Add IDF</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* QR Code Modal */}
              <QrCodeModal
                open={showQrModal}
                onOpenChange={(isOpen) => { /* Mock: setShowQrModal(isOpen) */ }}
                idf={detail}
                cluster={cluster}
                project={project}
              />

              <Button
                variant="outline"
                size="sm"
                onClick={() => { /* Mock: setShowQrModal(true) */ }}
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
              >
                <QrCode className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">QR Code</span>
              </Button>

              {canManage && (
                <Button
                  size="sm"
                  onClick={() => { /* Mock: handleOpenAdmin() */ }}
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
                >
                  <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Edit IDF</span>
                  <span className="sm:hidden">Edit</span>
                </Button>
              )}
            </div>
          </div>

          {/* Main content */}
          <div className="mt-4 sm:mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Left column - IDF details */}
            <div className="lg:col-span-2">
              <div className="space-y-2 sm:space-y-1">
                <div className="flex items-center gap-3">
                  {logo && (
                    <img
                      src={`${API_BASE}${logo.url}`}
                      alt="Project Logo"
                      className="h-10 w-auto sm:h-12"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}
                  {idf.media?.logo && (
                    <img
                      src={
                        idf.media.logo.url.startsWith("http")
                          ? idf.media.logo.url
                          : `${API_BASE}${idf.media.logo.url}`
                      }
                      alt={`${idf.code} logo`}
                      className="h-10 w-auto sm:h-12"
                      onError={(e) => {
                        console.error(
                          "Failed to load IDF logo:",
                          idf.media.logo.url,
                        );
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                      }}
                    />
                  )}
                  {!logo && !idf.media?.logo && (
                    <div className="h-10 w-10 sm:h-12 sm:w-12 bg-muted rounded flex items-center justify-center">
                      <Building className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
                      {idf.title}
                    </h1>
                    <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
                      {[idf.code, titleCase(project === "Sabinas Project" ? "Sabinas" : project), idf.site]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  </div>
                </div>

                {idf.description && (
                  <p className="text-muted-foreground mt-3 sm:mt-4 text-sm sm:text-base">
                    {idf.description}
                  </p>
                )}
              </div>
            </div>

            {/* Right column - QR Code */}
            <div className="flex justify-center lg:justify-end">
              <div className="bg-white p-3 sm:p-4 rounded-lg border border-border shadow-sm">
                <img
                  src={qrUrl}
                  alt="QR Code"
                  className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    target.nextElementSibling!.style.display = "flex";
                  }}
                  crossOrigin="anonymous"
                />
                <div className="hidden w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 bg-gray-100 rounded flex items-center justify-center">
                  <QrCode className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                </div>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  QR Code
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 text-xs px-2 py-1"
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = qrUrl;
                    link.download = `${idf.code}_qr.png`;
                    link.click();
                  }}
                >
                  Download
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Desktop tabs */}
        <div className="hidden md:flex space-x-1 mb-6 bg-muted rounded-lg p-1">
          <button
            onClick={() => setActiveTab("table")}
            className={`tab-button ${activeTab === "table" ? "active" : ""}`}
            data-testid="tab-table"
          >
            <i className="fas fa-table mr-2"></i>
            DFO
          </button>
          <button
            onClick={() => setActiveTab("gallery")}
            className={`tab-button ${activeTab === "gallery" ? "active" : ""}`}
            data-testid="tab-gallery"
          >
            <i className="fas fa-images mr-2"></i>
            Gallery
          </button>
          <button
            onClick={() => setActiveTab("location")}
            className={`tab-button ${activeTab === "location" ? "active" : ""}`}
            data-testid="tab-location"
          >
            <i className="fas fa-map-marker-alt mr-2"></i>
            Location
          </button>
          <button
            onClick={() => setActiveTab("diagrams")}
            className={`tab-button ${activeTab === "diagrams" ? "active" : ""}`}
            data-testid="tab-diagrams"
          >
            <i className="fas fa-project-diagram mr-2"></i>
            Diagrams
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`tab-button ${
              activeTab === "documents" ? "active" : ""
            }`}
            data-testid="tab-documents"
          >
            <i className="fas fa-file-alt mr-2"></i>
            Documents
          </button>
        </div>

        {/* Mobile tabs - improved spacing */}
        <div className="md:hidden bg-muted rounded-lg p-2 mb-4">
          <div className="grid grid-cols-3 gap-2 mb-2">
            <button
              onClick={() => setActiveTab("table")}
              className={`tab-button flex flex-col items-center py-3 px-2 rounded-md text-xs transition-all ${
                activeTab === "table" ? "bg-primary text-primary-foreground" : "hover:bg-accent text-accent-foreground"
              }`}
              data-testid="tab-table"
            >
              <i className="fas fa-table text-base mb-1"></i>
              <span>DFO</span>
            </button>
            <button
              onClick={() => setActiveTab("gallery")}
              className={`tab-button flex flex-col items-center py-3 px-2 rounded-md text-xs transition-all ${
                activeTab === "gallery" ? "bg-primary text-primary-foreground" : "hover:bg-accent text-accent-foreground"
              }`}
              data-testid="tab-gallery"
            >
              <i className="fas fa-images text-base mb-1"></i>
              <span>Gallery</span>
            </button>
            <button
              onClick={() => setActiveTab("location")}
              className={`tab-button flex flex-col items-center py-3 px-2 rounded-md text-xs transition-all ${
                activeTab === "location" ? "bg-primary text-primary-foreground" : "hover:bg-accent text-accent-foreground"
              }`}
              data-testid="tab-location"
            >
              <i className="fas fa-map-marker-alt text-base mb-1"></i>
              <span>Location</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setActiveTab("diagrams")}
              className={`tab-button flex flex-col items-center py-3 px-2 rounded-md text-xs transition-all ${
                activeTab === "diagrams" ? "bg-primary text-primary-foreground" : "hover:bg-accent text-accent-foreground"
              }`}
              data-testid="tab-diagrams"
            >
              <i className="fas fa-project-diagram text-base mb-1"></i>
              <span>Diagrams</span>
            </button>
            <button
              onClick={() => setActiveTab("documents")}
              className={`tab-button flex flex-col items-center py-3 px-2 rounded-md text-xs transition-all ${
                activeTab === "documents" ? "bg-primary text-primary-foreground" : "hover:bg-accent text-accent-foreground"
              }`}
              data-testid="tab-documents"
            >
              <i className="fas fa-file-alt text-base mb-1"></i>
              <span>Documents</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="min-h-80 sm:min-h-96">
          {activeTab === "table" && (
            <div data-testid="tab-content-table" className="px-1 sm:px-0">
              {idf.dfo?.length ? (
                <DfoImageViewer item={idf.dfo} />
              ) : (
                <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
                  <div className="text-center py-8 sm:py-12 text-muted-foreground">
                    <i className="fas fa-table text-3xl sm:text-4xl mb-3 sm:mb-4"></i>
                    <p className="text-sm sm:text-base">No DFO data available</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "gallery" && (
            <div data-testid="tab-content-gallery" className="px-1 sm:px-0">
              {idf.images?.length ? (
                <Gallery images={idf.images} />
              ) : (
                <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
                  <div className="text-center py-8 sm:py-12 text-muted-foreground">
                    <i className="fas fa-images text-3xl sm:text-4xl mb-3 sm:mb-4"></i>
                    <p className="text-sm sm:text-base">No images available</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "location" && (
            <div data-testid="tab-content-location" className="px-1 sm:px-0">
              {idf.location ? (
                <LocationViewer location={idf.location} />
              ) : (
                <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
                  <div className="text-center py-8 sm:py-12 text-muted-foreground">
                    <i className="fas fa-map-marker-alt text-3xl sm:text-4xl mb-3 sm:mb-4"></i>
                    <p className="text-sm sm:text-base">No location data available</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "diagrams" && (
            <div data-testid="tab-content-diagrams" className="px-1 sm:px-0">
              {idf.diagrams?.length ? (
                <DiagramsViewer item={idf.diagrams} />
              ) : (
                <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
                  <div className="text-center py-8 sm:py-12 text-muted-foreground">
                    <i className="fas fa-project-diagram text-3xl sm:text-4xl mb-3 sm:mb-4"></i>
                    <p className="text-sm sm:text-base">No diagrams available</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "documents" && (
            <div data-testid="tab-content-documents" className="px-1 sm:px-0">
              {idf.documents?.length ? (
                <DocumentsViewer documents={idf.documents} />
              ) : (
                <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
                  <div className="text-center py-8 sm:py-12 text-muted-foreground">
                    <i className="fas fa-file-alt text-3xl sm:text-4xl mb-3 sm:mb-4"></i>
                    <p className="text-sm sm:text-base">No documents available</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add IDF Dialog */}
      {canManage && (
        <AddIdfDialog
          cluster={cluster}
          project={project}
          open={isAddIdfDialogOpen}
          onOpenChange={setIsAddIdfDialogOpen}
          onCreated={(newIdf) => {
            setIsAddIdfDialogOpen(false);
            // Navigate to the new IDF
            window.location.href = `/${cluster}/${project}/idf/${newIdf.code}`;
          }}
        />
      )}

      {/* Admin Sidebar */}
      {canManage && (
        <AdminSidebar
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
          preloadIdf={{ cluster, project, code }}
        />
      )}
    </div>
  );
}