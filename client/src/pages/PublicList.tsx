import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { getIdfs, getLogo } from "@/lib/api";
import { IdfIndex } from "@shared/schema";
import AddIdfDialog from "@/components/AddIdfDialog";
import { config, getProjectsForCluster } from "@/config";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

interface PublicListProps {
  cluster: string;
  project: string;
}

export default function PublicList() {
  const params = useParams();
  const cluster = params.cluster || config.defaults.cluster;
  // Map URL project to the correct format for API calls
  let project = params.project || config.urlMapping.projectToUrlPath(config.defaults.project);

  // Handle URL encoding and mapping
  project = config.urlMapping.urlPathToProject(project);

  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [sortOrder, setSortOrder] = useState<"none" | "asc" | "desc">("none");


  const {
    data: idfs = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["idfs", cluster, project, "list"],
    queryFn: () => {
      const apiProject = config.urlMapping.projectToApiPath(project);
      return getIdfs(cluster, apiProject, { include_health: 1, limit: config.ui.defaultLimit });
    },
  });

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
  const { data: logo } = useQuery({
    queryKey: ["logo", cluster],
    queryFn: () => getLogo(cluster),
    retry: false,
  });

  // Filter and sort IDFs
  const filteredAndSortedIdfs = useMemo(() => {
    if (!idfs) return [];

    // First filter by search query
    let filtered = idfs.filter((idf) =>
      idf.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idf.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idf.site?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idf.room?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Then sort alphabetically if requested
    if (sortOrder === "asc") {
      filtered = [...filtered].sort((a, b) => a.code.localeCompare(b.code));
    } else if (sortOrder === "desc") {
      filtered = [...filtered].sort((a, b) => b.code.localeCompare(a.code));
    }

    return filtered;
  }, [idfs, searchQuery, sortOrder]);

  const toggleSortOrder = () => {
    setSortOrder(current => {
      if (current === "none") return "asc";
      if (current === "asc") return "desc";
      return "none";
    });
  };

  const getSortIcon = () => {
    if (sortOrder === "asc") return <ArrowUp className="w-4 h-4" />;
    if (sortOrder === "desc") return <ArrowDown className="w-4 h-4" />;
    return <ArrowUpDown className="w-4 h-4" />;
  };


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

  const getHealthTitle = (level?: string) => {
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
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-lg p-6"
              >
                <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-full"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="text-center py-12">
          <i className="fas fa-exclamation-triangle text-4xl text-destructive mb-4"></i>
          <h2 className="text-xl font-semibold mb-2">Error Loading IDFs</h2>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8" data-testid="public-list">
      {/* Welcome Banner */}
      <div className="bg-primary text-primary-foreground rounded-lg p-4 mb-6 text-center">
        <h1 className="text-xl font-semibold">
          Welcome to the Access Technical Fiber Optic Information Portal
        </h1>
      </div>

      {/* IDF Directory Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">IDF Directory</h2>
            <p className="text-muted-foreground mt-1">
              {cluster === "trk" ? "TRINITY" : cluster.toUpperCase()} Cluster • {
                getProjectsForCluster(cluster).find(p => p.value === project)?.label || project
              }
            </p>
          </div>
        </div>
      </div>

      {/* Header Section */}
      <div className="mb-8">
        {/* Search and Add Button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="flex items-center space-x-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
              data-testid="back-to-home"
            >
              <i className="fas fa-home"></i>
              <span>Back to Home</span>
            </Link>
            <div className="flex items-center space-x-2 flex-1 max-w-lg">
              <div className="relative flex-1">
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"></i>
                <input
                  type="text"
                  placeholder="Search IDFs by code, title or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-md text-sm text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
                  data-testid="search-input"
                />
              </div>
              <button
                onClick={toggleSortOrder}
                className={`flex items-center space-x-1 px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors ${
                  sortOrder !== "none" ? "bg-primary text-primary-foreground" : ""
                }`}
                title={`Sort ${sortOrder === "none" ? "alphabetically" : sortOrder === "asc" ? "Z-A" : "default"}`}
                data-testid="sort-button"
              >
                {getSortIcon()}
                <span className="hidden sm:inline">
                  {sortOrder === "none" && "Sort"}
                  {sortOrder === "asc" && "A-Z"}
                  {sortOrder === "desc" && "Z-A"}
                </span>
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowAddDialog(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            data-testid="button-add-idf"
            title="Add new IDF"
          >
            <i className="fas fa-plus"></i>
            <span>Add IDF</span>
          </button>
        </div>

        {/* Health Legend */}
        <div
          className="hide-health-status flex items-center space-x-6 text-sm"
          data-testid="health-legend"
        >
          <span className="text-muted-foreground">Health Status:</span>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Operational</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>Under Review</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Critical</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              <span>No Data</span>
            </div>
          </div>
        </div>
      </div>

      {/* IDF Count */}
      {filteredAndSortedIdfs.length > 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <p className="text-sm">
            Showing {filteredAndSortedIdfs.length} IDF{filteredAndSortedIdfs.length !== 1 ? 's' : ''} total
          </p>
        </div>
      )}

      {/* Empty State */}
      {filteredAndSortedIdfs.length === 0 && (!idfs || idfs.length === 0) && (
        <div
          className="text-center py-12 text-muted-foreground"
          data-testid="no-idfs-state"
        >
          <i className="fas fa-info-circle text-4xl mb-4"></i>
          <h3 className="text-lg font-semibold mb-2">No IDFs Available</h3>
          <p>There are currently no IDFs to display for this project and cluster.</p>
        </div>
      )}

      {/* No Results State */}
      {filteredAndSortedIdfs.length === 0 && idfs && idfs.length > 0 && (
        <div
          className="text-center py-12 text-muted-foreground"
          data-testid="no-results-state"
        >
          <i className="fas fa-search text-4xl mb-4"></i>
          <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
          <p>No IDFs match your current search criteria.</p>
        </div>
      )}

      {filteredAndSortedIdfs.length > 0 && (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          data-testid="idf-grid"
        >
          {filteredAndSortedIdfs.map((idf) => (
            <Link
              key={idf.code}
              href={`/${cluster}/${project}/idf/${idf.code}`}
              className="bg-card border border-border rounded-lg p-6 card-hover"
              data-testid={`card-${idf.code}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                  {idf.media?.logo && (
                    <img
                      src={idf.media.logo.url.startsWith('http') ? idf.media.logo.url : `${API_BASE}${idf.media.logo.url}`}
                      alt={`${idf.code} logo`}
                      className="h-10 w-10 object-contain rounded border border-border flex-shrink-0"
                      onLoad={() => {
                        console.log('IDF logo loaded in list:', idf.media.logo.url);
                      }}
                      onError={(e) => {
                        console.error('Failed to load IDF logo in list:', idf.media.logo.url);
                        console.error('Full URL attempted:', idf.media.logo.url.startsWith('http') ? idf.media.logo.url : `${API_BASE}${idf.media.logo.url}`);
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                      }}
                    />
                  )}
                  <div>
                    <h3
                      className="font-semibold text-foreground"
                      data-testid={`title-${idf.code}`}
                    >
                      {idf.title}
                    </h3>
                    <p
                      className="text-sm text-muted-foreground mt-1"
                      data-testid={`code-${idf.code}`}
                    >
                      {idf.code}
                    </p>
                  </div>
                </div>
                <div
                  className={`health-indicator ${getHealthIndicatorClass(idf.health?.level)} ${
                    (idf.gallery && idf.gallery.length > 0) || 
                    (idf.documents && idf.documents.length > 0) || 
                    (idf.diagram && idf.diagram.length > 0) || 
                    (idf.table_data && Object.keys(idf.table_data).length > 0) || 
                    (idf.location && idf.location.length > 0) 
                      ? 'active-animation' : ''
                  }`}
                  title={getHealthTitle(idf.health?.level)}
                  data-testid={`health-${idf.code}`}
                ></div>
              </div>

              <div className="space-y-2 mb-4">
                {idf.site && (
                  <div className="flex items-center text-sm">
                    <i className="fas fa-building w-4 text-muted-foreground mr-2"></i>
                    <span data-testid={`site-${idf.code}`}>{idf.site}</span>
                  </div>
                )}
                {idf.room && (
                  <div className="flex items-center text-sm">
                    <i className="fas fa-door-open w-4 text-muted-foreground mr-2"></i>
                    <span data-testid={`room-${idf.code}`}>{idf.room}</span>
                  </div>
                )}
              </div>

              {/* Health Summary */}
              {idf.health && (
                <div
                  className="hide-health-status flex items-center space-x-4 text-xs"
                  data-testid={`health-summary-${idf.code}`}
                >
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
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Add IDF Dialog */}
      <AddIdfDialog
        cluster={cluster}
        project={project}
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onCreated={() => {
          setShowAddDialog(false);
          window.location.reload(); // Refresh to show new IDF
        }}
      />
    </div>
  );
}