import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { getIdf, getLogo } from "@/lib/api";
import { IdfPublic } from "@shared/schema";
import Gallery from "@/components/Gallery";
import DocList from "@/components/DocList";
import PdfOrImage from "@/components/PdfOrImage";
import DataTable from "@/components/DataTable";
import AdminSidebar from "@/components/AdminSidebar";
import AddIdfDialog from "@/components/AddIdfDialog";
import { IDF_TABS, getVisibleTabs, getDefaultTab } from "../lib/tabsConfig";

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
  const [activeTab, setActiveTab] = useState(getDefaultTab());
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAddIdfDialogOpen, setIsAddIdfDialogOpen] = useState(false);

  // Update URL when tab changes
  useEffect(() => {
    const url = new URL(window.location.href);
    const urlTab = url.searchParams.get('tab');
    if (urlTab && getVisibleTabs().find(tab => tab.key === urlTab)) {
      setActiveTab(urlTab);
    } else if (!urlTab) {
      url.searchParams.set('tab', getDefaultTab());
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const handleTabChange = (tabKey: string) => {
    setActiveTab(tabKey);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tabKey);
    window.history.pushState({}, '', url.toString());
  };

  // Listen for admin panel open events
  useEffect(() => {
    const handleOpenAdmin = (event: CustomEvent) => {
      setIsAdminOpen(true);
    };

    window.addEventListener(
      "openAdminWithIdf",
      handleOpenAdmin as EventListener,
    );
    return () => {
      window.removeEventListener(
        "openAdminWithIdf",
        handleOpenAdmin as EventListener,
      );
    };
  }, []);

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
    queryKey: ["logo", cluster],
    queryFn: () => getLogo(cluster),
    retry: false,
  });

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
          <h2 className="text-xl font-semibold mb-2">Error Loading IDF</h2>
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

  const qrUrl = `${API_BASE}/api/${cluster}/${project}/idfs/${code}/qr.png`;

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
              href={`/${cluster}/${project}`}
              className="flex items-center space-x-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
              data-testid="back-button"
            >
              <i className="fas fa-arrow-left"></i>
              <span>Back to Directory</span>
            </Link>
            <button
              onClick={() => setIsAddIdfDialogOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              data-testid="button-add-idf"
              title="Add new IDF"
            >
              <i className="fas fa-plus"></i>
              <span>Add IDF</span>
            </button>
          </div>

          <nav className="text-sm" data-testid="breadcrumb">
            <Link
              href={`/${cluster}/${project}`}
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
            {logo && (
              <img
                src={`${API_BASE}${logo.url}`}
                alt={`${cluster} logo`}
                className="h-12 w-auto mt-1"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
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

              {/* Global Health Status - Hidden */}
              {false && idf.health && (
                <div
                  className="flex items-center space-x-4"
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

            {/* QR Code */}
            <div
              className="bg-card border border-border rounded-lg p-4"
              data-testid="qr-code"
            >
              <img
                src={qrUrl}
                alt="QR Code"
                className="w-24 h-24"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  target.parentElement!.innerHTML = `
                    <div class="w-24 h-24 bg-muted rounded flex items-center justify-center">
                      <i class="fas fa-qrcode text-2xl text-muted-foreground"></i>
                    </div>
                  `;
                }}
              />
              <p className="text-xs text-muted-foreground mt-2 text-center">
                QR Code
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div
          className="flex space-x-1 border-b border-border overflow-x-auto"
          data-testid="tab-navigation"
        >
          {getVisibleTabs().map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`tab-button ${
                activeTab === tab.key ? "active" : ""
              }`}
              data-testid={`tab-${tab.key}`}
            >
              {tab.icon && <i className={`${tab.icon} mr-2`}></i>}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        {/* Overview Tab - Hidden */}
        {false && activeTab === "overview" && (
          <div className="hidden space-y-6">
            {/* Basic Info */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Code
                  </label>
                  <p className="font-mono" data-testid="idf-code">
                    {idf.code}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Title
                  </label>
                  <p data-testid="idf-title">{idf.title || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Site
                  </label>
                  <p data-testid="idf-site">{idf.site || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Room
                  </label>
                  <p data-testid="idf-room">{idf.room || "N/A"}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Description
                  </label>
                  <p data-testid="idf-description">
                    {idf.description || "No description available"}
                  </p>
                </div>
              </div>
            </div>

            {/* Health Status */}
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

        {/* DFO Tab - First and default */}
        {activeTab === "dfo" && (
          <div>
            {idf.table && idf.table.length > 0 ? (
              <DataTable data={idf.table} />
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No fiber optic information available
              </p>
            )}
          </div>
        )}

        {/* Gallery Tab */}
        {activeTab === "gallery" && (
          <Gallery images={idf.gallery || []} />
        )}

        {/* Location Tab - New */}
        {activeTab === "location" && (
          <div>
            {idf.locationImages && idf.locationImages.length > 0 ? (
              <Gallery images={idf.locationImages} />
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No location images available
              </p>
            )}
          </div>
        )}

        {/* Diagram Tab - Images only */}
        {activeTab === "diagram" && (
          <div>
            {idf.diagramImages && idf.diagramImages.length > 0 ? (
              <Gallery images={idf.diagramImages} />
            ) : idf.diagram && idf.diagram.url && (idf.diagram.url.endsWith('.jpg') || idf.diagram.url.endsWith('.png') || idf.diagram.url.endsWith('.jpeg')) ? (
              <div className="flex justify-center">
                <img
                  src={idf.diagram.url}
                  alt="Diagram"
                  className="max-w-full h-auto rounded-lg border"
                />
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No diagram images available
              </p>
            )}
          </div>
        )}

        {/* Documents Tab - PDF, DOC, XLSX */}
        {activeTab === "documents" && (
          <div className="space-y-4">
            {/* PDF Diagrams */}
            {idf.diagram && idf.diagram.url && idf.diagram.url.endsWith('.pdf') && (
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Diagram (PDF)</h3>
                <PdfOrImage media={idf.diagram} />
              </div>
            )}

            {/* Document List */}
            <DocList documents={idf.documents || []} />
          </div>
        )}
      </div>

      {/* Add IDF Dialog */}
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

      {/* Admin Sidebar */}
      <AdminSidebar
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        preloadIdf={{ cluster, project, code }}
      />
    </div>
  );
}