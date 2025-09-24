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

interface PublicDetailProps {
  cluster: string;
  project: string;
  code: string;
}

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
      if (activeTab === "documents") {
        // Force invalidate and refetch data
        await queryClient.invalidateQueries({
          queryKey: ["/api", cluster, project, "idfs", code],
        });
        
        // Force a fresh fetch
        await queryClient.refetchQueries({
          queryKey: ["/api", cluster, project, "idfs", code],
        });
      }
    };

    window.addEventListener("openAdminWithIdf", handleOpenAdmin);
    window.addEventListener("reloadDiagramsTab", handleReloadDiagramsTab);
    window.addEventListener("reloadDocumentsTab", handleReloadDocumentsTab);

    return () => {
      window.removeEventListener("openAdminWithIdf", handleOpenAdmin);
      window.removeEventListener("reloadDiagramsTab", handleReloadDiagramsTab);
      window.removeEventListener("reloadDocumentsTab", handleReloadDocumentsTab);
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
          queryKey: ["/api", params.cluster, params.project, "idfs", params.code],
        });
      }
    };

    window.addEventListener("reloadDocumentsTab", handleDocumentUpdate);
    return () => window.removeEventListener("reloadDocumentsTab", handleDocumentUpdate);
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
      <div className="max-w-7xl mx-auto px-6 py-8">
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
      <div className="max-w-7xl mx-auto px-6 py-8">
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
    <div className="max-w-7xl mx-auto px-6 py-8" data-testid="public-detail">
      {/* Welcome Banner */}
      <div className="bg-primary text-primary-foreground rounded-lg p-4 mb-6 text-center">
        <h1 className="text-xl font-semibold">
          Welcome to the Access Technical Fiber Optic Information Portal
        </h1>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Link
              href={`/${cluster}/${project === "Sabinas Project" ? "Sabinas" : project}`}
              className="flex items-center space-x-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
              data-testid="back-button"
            >
              <i className="fas fa-arrow-left"></i>
              <span>Back to Directory</span>
            </Link>
            {canManage && (
              <button
                onClick={() => setIsAddIdfDialogOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                data-testid="button-add-idf"
                title="Add new IDF"
              >
                <i className="fas fa-plus"></i>
                <span>Add IDF</span>
              </button>
            )}
          </div>

          <nav className="text-sm" data-testid="breadcrumb">
            <Link
              href={`/${cluster}/${project === "Sabinas Project" ? "Sabinas" : project}`}
              className="text-muted-foreground hover:text-foreground"
            >
              Directory
            </Link>
            <span className="mx-2 text-muted-foreground">/</span>
            <span className="text-foreground">{idf.title}</span>
          </nav>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="flex items-center space-x-4">
              {logo && (
                <img
                  src={`${API_BASE}${logo.url}`}
                  alt={`${cluster} logo`}
                  className="h-12 w-auto"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              {idf.media?.logo && (
                <img
                  src={idf.media.logo.url.startsWith('http') ? idf.media.logo.url : `${API_BASE}${idf.media.logo.url}`}
                  alt={`${idf.code} logo`}
                  className="h-12 w-auto"
                  onLoad={() => {
                    console.log('IDF logo loaded successfully:', idf.media.logo.url);
                  }}
                  onError={(e) => {
                    console.error('Failed to load IDF logo:', idf.media.logo.url);
                    console.error('Full URL attempted:', idf.media.logo.url.startsWith('http') ? idf.media.logo.url : `${API_BASE}${idf.media.logo.url}`);
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                  }}
                />
              )}
            </div>
            <div>
              <h1
                className="text-3xl font-bold text-foreground mb-2"
                data-testid="idf-title"
              >
                {idf.title}
              </h1>
              <p
                className="text-muted-foreground mb-4"
                data-testid="idf-metadata"
              >
                {idf.code} • {idf.site} • {idf.room}
              </p>

              {/* Global Health Status - Hidden but kept in code */}
              {idf.health && (
                <div
                  className="hidden flex items-center space-x-4"
                  data-testid="health-status"
                >
                  <div className="flex items-center space-x-2">
                    <div
                      className={`health-indicator ${getHealthIndicatorClass(idf.health.level)}`}
                    ></div>
                    <span className="font-medium">
                      {getHealthLabel(idf.health.level)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    {idf.health.counts.ok > 0 && (
                      <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded-full">
                        {idf.health.counts.ok} OK
                      </span>
                    )}
                    {idf.health.counts.revision > 0 && (
                      <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded-full">
                        {idf.health.counts.revision} Review
                      </span>
                    )}
                    {idf.health.counts.falla > 0 && (
                      <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded-full">
                        {idf.health.counts.falla} Critical
                      </span>
                    )}
                    {idf.health.counts.libre > 0 && (
                      <span className="px-2 py-1 bg-gray-500/10 text-gray-400 rounded-full">
                        {idf.health.counts.libre} Available
                      </span>
                    )}
                    {idf.health.counts.reservado > 0 && (
                      <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded-full">
                        {idf.health.counts.reservado} Reserved
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end space-y-4">
            {/* Admin Button */}
            {canManage && (
              <button
                onClick={() => {
                  // Pre-load the admin panel with current IDF data
                  const event = new CustomEvent("openAdminWithIdf", {
                    detail: { cluster, project, code },
                  });
                  window.dispatchEvent(event);
                }}
                className="flex items-center space-x-2 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
                data-testid="button-admin-edit"
                title="Edit this IDF"
              >
                <i className="fas fa-edit"></i>
                <span>Edit IDF</span>
              </button>
            )}

            {/* QR Code */}
            <div
              className="bg-card border border-border rounded-lg p-4"
              data-testid="qr-code"
            >
              <img
                src={qrUrl}
                alt="QR Code"
                className="w-24 h-24"
                crossOrigin="anonymous"
                onError={(e) => {
                  console.error('QR Code failed to load:', qrUrl);
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  target.parentElement!.innerHTML = `
                    <div class="w-24 h-24 bg-muted rounded flex items-center justify-center">
                      <i class="fas fa-qrcode text-2xl text-muted-foreground"></i>
                    </div>
                  `;
                }}
                onLoad={() => {
                  console.log('QR Code loaded successfully:', qrUrl);
                }}
              />
              <p className="text-xs text-muted-foreground mt-2 text-center">
                QR Code
              </p>
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = qrUrl;
                  link.download = `QR-${idf.code}.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="w-full mt-2 px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
                data-testid="download-qr"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div
          className="flex space-x-1 bg-muted rounded-lg p-1"
          data-testid="tab-navigation"
        >
          <button
            className={`tab-button ${activeTab === "table" ? "active" : ""}`}
            onClick={() => setActiveTab("table")}
            data-testid="tab-table"
          >
            <i className="fas fa-table mr-2"></i>Fiber Optic Information (DFO)
          </button>
          <button
            className={`tab-button ${activeTab === "gallery" ? "active" : ""}`}
            onClick={() => setActiveTab("gallery")}
            data-testid="tab-gallery"
          >
            <i className="fas fa-images mr-2"></i>Gallery
          </button>
          <button
            className={`tab-button ${activeTab === "location" ? "active" : ""}`}
            onClick={() => setActiveTab("location")}
            data-testid="tab-location"
          >
            <i className="fas fa-map-marker-alt mr-2"></i>Location
          </button>
          <button
            className={`tab-button ${activeTab === "diagram" ? "active" : ""}`}
            onClick={() => setActiveTab("diagram")}
            data-testid="tab-diagram"
          >
            <i className="fas fa-project-diagram mr-2"></i>Diagram
          </button>
          <button
            className={`tab-button ${activeTab === "documents" ? "active" : ""}`}
            onClick={() => setActiveTab("documents")}
            data-testid="tab-documents"
          >
            <i className="fas fa-file-alt mr-2"></i>Documents
          </button>
          {/* Overview tab - Hidden but kept in code */}
          <button
            className={`hidden tab-button ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
            data-testid="tab-overview"
          >
            <i className="fas fa-info-circle mr-2"></i>Overview
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === "table" && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <DfoImageViewer item={idf.dfo} />
          </div>
        )}

        {activeTab === "gallery" && (
          <div data-testid="tab-content-gallery">
            <Gallery images={idf.images?.map(item => 
              typeof item === 'string' ? item : item.url
            ) || []} />
          </div>
        )}

        {activeTab === "location" && (
          <div data-testid="tab-content-location">
            <LocationViewer location={
              idf.location ? (
                typeof idf.location === 'string' 
                  ? { url: idf.location, name: 'Location Image', kind: 'image' }
                  : idf.location
              ) : null
            } />
          </div>
        )}

        {activeTab === "diagram" && (
          <div data-testid="tab-content-diagram">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <DiagramsViewer item={idf.diagrams} />
            </div>
          </div>
        )}

        {activeTab === "documents" && (
          <div data-testid="tab-content-documents">
            <DocumentsViewer 
              item={idf.documents} 
              cluster={cluster}
              project={project}
              code={code}
            />
          </div>
        )}

        {/* Overview tab content - Hidden but kept in code */}
        {activeTab === "overview" && (
          <div
            className="hidden grid grid-cols-1 lg:grid-cols-2 gap-8"
            data-testid="tab-content-overview"
          >
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">IDF Details</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-muted-foreground">Code</dt>
                  <dd className="font-mono" data-testid="detail-code">
                    {idf.code}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Title</dt>
                  <dd data-testid="detail-title">{idf.title}</dd>
                </div>
                {idf.site && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Site</dt>
                    <dd data-testid="detail-site">{idf.site}</dd>
                  </div>
                )}
                {idf.room && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Room</dt>
                    <dd data-testid="detail-room">{idf.room}</dd>
                  </div>
                )}
                {idf.description && (
                  <div>
                    <dt className="text-sm text-muted-foreground">
                      Description
                    </dt>
                    <dd
                      className="text-muted-foreground"
                      data-testid="detail-description"
                    >
                      {idf.description}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {idf.health && (
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Health Status</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Operational (OK)</span>
                    </div>
                    <span className="font-semibold" data-testid="count-ok">
                      {idf.health.counts.ok}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span>Under Review</span>
                    </div>
                    <span
                      className="font-semibold"
                      data-testid="count-revision"
                    >
                      {idf.health.counts.revision}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span>Critical Failure</span>
                    </div>
                    <span className="font-semibold" data-testid="count-falla">
                      {idf.health.counts.falla}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span>Reserved</span>
                    </div>
                    <span
                      className="font-semibold"
                      data-testid="count-reservado"
                    >
                      {idf.health.counts.reservado}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                      <span>Available</span>
                    </div>
                    <span className="font-semibold" data-testid="count-libre">
                      {idf.health.counts.libre}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
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