import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { config, getProjectsForCluster } from "@/config";
import { getLogo } from "@/lib/api";

export default function ClusterDirectory() {
  const [selectedProject, setSelectedProject] = useState("all");

  // Get logos for all clusters
  const { data: logos = {} } = useQuery({
    queryKey: ["logos", "all"],
    queryFn: async () => {
      const logoPromises = config.clusters.available.map(async (cluster) => {
        try {
          const logo = await getLogo(cluster);
          return { [cluster]: logo };
        } catch {
          return { [cluster]: null };
        }
      });
      const results = await Promise.all(logoPromises);
      return results.reduce((acc, curr) => ({ ...acc, ...curr }), {});
    },
  });

  // Get all projects from all clusters
  const allProjects = config.clusters.available.flatMap((cluster) =>
    getProjectsForCluster(cluster).map((project) => ({
      ...project,
      cluster,
    })),
  );

  // Get unique project values for filter
  const uniqueProjects = [...new Set(allProjects.map((p) => p.apiValue))];

  // Filter clusters based on selected project
  const filteredClusters =
    selectedProject === "all"
      ? config.clusters.available
      : config.clusters.available.filter((cluster) =>
          getProjectsForCluster(cluster).some(
            (p) => p.apiValue === selectedProject,
          ),
        );

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

  return (
    <div
      className="max-w-7xl mx-auto px-6 py-8"
      data-testid="cluster-directory"
    >
      {/* Welcome Banner */}
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">
          Welcome to the Technical Fiber Optic Information Portal
        </h1>
        <p className="text-primary-foreground/80">
          Select a cluster and project to access IDF information
        </p>
      </div>

      {/* Project Filter */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Available Clusters</h2>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Filter by Project:</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
            >
              <option value="all">All Projects</option>
              {uniqueProjects.map((project) => (
                <option key={project} value={project}>
                  {project.charAt(0).toUpperCase() + project.slice(1)} Project
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Clusters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredClusters.map((cluster) => {
          const projects = getProjectsForCluster(cluster);
          const filteredProjects =
            selectedProject === "all"
              ? projects
              : projects.filter((p) => p.apiValue === selectedProject);

          if (filteredProjects.length === 0) return null;

          return (
            <div
              key={cluster}
              className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              {/* Cluster Header */}
              <div className="flex items-center space-x-4 mb-6">
                {logos[cluster] && (
                  <img
                    src={`${API_BASE}${logos[cluster].url}`}
                    alt={`${cluster} logo`}
                    className="h-16 w-auto"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                <div>
                  <h3 className="text-xl font-semibold text-foreground">
                    {cluster === "trk"
                      ? "Trinity Rail Cluster"
                      : cluster.toUpperCase() + " Directory"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {filteredProjects.length} project
                    {filteredProjects.length !== 1 ? "s" : ""} available
                  </p>
                </div>
              </div>

              {/* Projects */}
              <div className="space-y-3">
                {filteredProjects.map((project) => (
                  <Link
                    key={project.value}
                    href={`/${cluster}/${config.urlMapping.projectToUrlPath(project.value)}`}
                    className="block p-4 bg-muted/30 hover:bg-muted/50 rounded-md transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {project.label}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Click to view IDFs
                        </p>
                      </div>
                      <i className="fas fa-arrow-right text-muted-foreground group-hover:text-primary transition-colors"></i>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredClusters.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <i className="fas fa-search text-4xl mb-4"></i>
          <h3 className="text-lg font-semibold mb-2">No Clusters Found</h3>
          <p>No clusters have projects matching the selected filter</p>
        </div>
      )}
    </div>
  );
}
