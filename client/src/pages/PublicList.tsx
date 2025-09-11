import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { getIdfs, getLogo } from "@/lib/api";
import { IdfIndex } from "@shared/schema";
import AddIdfDialog from "@/components/AddIdfDialog";

interface PublicListProps {
  cluster: string;
  project: string;
}

export default function PublicList({ params }: { params: PublicListProps }) {
  const { cluster, project } = params;
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddIdfDialogOpen, setIsAddIdfDialogOpen] = useState(false);

  const {
    data: idfs = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["idfs", cluster, project, "list"],
    queryFn: () => getIdfs(cluster, project, { include_health: 1, limit: 50 }),
  });

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
  const { data: logo } = useQuery({
    queryKey: ["logo", cluster],
    queryFn: () => getLogo(cluster),
    retry: false,
  });

  // Client-side search filtering
  const filteredIdfs = idfs.filter((idf: IdfIndex) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      idf.code.toLowerCase().includes(query) ||
      idf.title.toLowerCase().includes(query) ||
      idf.site?.toLowerCase().includes(query) ||
      idf.room?.toLowerCase().includes(query)
    );
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

      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
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
            <div className="flex items-center space-x-4">
              <div>
                <h2
                  className="text-2xl font-bold text-foreground"
                  data-testid="page-title"
                >
                  IDF Directory
                </h2>
                <p
                  className="text-muted-foreground mt-1"
                  data-testid="page-subtitle"
                >
                  {cluster === "trk"
                    ? "Trinity Project"
                    : cluster.toUpperCase() + " Cluster"}{" "}
                  •{" "}
                  {project === "trinity"
                    ? "Sabinas Project"
                    : project.charAt(0).toUpperCase() +
                      project.slice(1) +
                      " Project"}
                </p>
              </div>
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
          </div>

          {/* Search */}
          <div className="relative w-96">
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"></i>
            <input
              type="text"
              placeholder="Search IDFs by code, title or location..."
              className="w-full bg-input border border-border rounded-lg pl-10 pr-4 py-3 text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search"
            />
          </div>
        </div>

        {/* Health Legend */}
        <div
          className="flex items-center space-x-6 text-sm"
          data-testid="health-legend"
        >
          <span className="text-muted-foreground">Health Status:</span>
          <div className="flex items-center space-x-2">
            <div className="health-indicator bg-green-500"></div>
            <span>Operational</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="health-indicator bg-yellow-500"></div>
            <span>Under Review</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="health-indicator bg-red-500"></div>
            <span>Critical</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="health-indicator bg-gray-500"></div>
            <span>No Data</span>
          </div>
        </div>
      </div>

      {/* IDF Cards Grid */}
      {filteredIdfs.length === 0 ? (
        <div
          className="text-center py-12 text-muted-foreground"
          data-testid="empty-state"
        >
          <i className="fas fa-search text-4xl mb-4"></i>
          <h3 className="text-lg font-semibold mb-2">No IDFs Found</h3>
          <p>Try adjusting your search terms</p>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          data-testid="idf-grid"
        >
          {filteredIdfs.map((idf: IdfIndex) => (
            <Link
              key={`${idf.cluster}-${idf.project}-${idf.code}`}
              href={`/${cluster}/${project}/idf/${idf.code}`}
              className="bg-card border border-border rounded-lg p-6 card-hover"
              data-testid={`card-${idf.code}`}
            >
              <div className="flex items-start justify-between mb-4">
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
                <div
                  className={`health-indicator ${getHealthIndicatorClass(idf.health?.level)}`}
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
                  className="flex items-center space-x-4 text-xs"
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
        open={isAddIdfDialogOpen}
        onOpenChange={setIsAddIdfDialogOpen}
        onCreated={() => {
          setIsAddIdfDialogOpen(false);
          window.location.reload(); // Refresh to show new IDF
        }}
      />
    </div>
  );
}
