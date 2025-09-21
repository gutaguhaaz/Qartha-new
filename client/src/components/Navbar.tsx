import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import ThemeToggle from "./ThemeToggle";
import AdminSidebar from "./AdminSidebar";
import { Settings, Menu, X } from "lucide-react";
import { config, getProjectsForCluster } from "../config";
import Logo from "./Logo"; // ajusta la ruta si tu Navbar está en otra carpeta
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const [location] = useLocation();
  const [selectedCluster, setSelectedCluster] = useState(
    config.defaults.cluster,
  );
  const [selectedProject, setSelectedProject] = useState(
    config.defaults.project,
  );
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAdmin } = useAuth();

  // Parse current route to update selectors
  useEffect(() => {
    const pathParts = location.split("/").filter(Boolean);
    if (pathParts.length >= 2) {
      const [cluster, project] = pathParts;
      if (config.clusters.available.includes(cluster)) {
        setSelectedCluster(cluster);
        const projects = getProjectsForCluster(cluster);
        if (projects.some((p) => p.value === project)) {
          setSelectedProject(project);
        } else {
          // If the project from the URL is not valid for the cluster, set to default project for that cluster
          setSelectedProject(
            projects.length > 0 ? projects[0].value : config.defaults.project,
          );
        }
      }
    }
  }, [location]);

  const handleClusterChange = (cluster: string) => {
    setSelectedCluster(cluster);
    const projects = getProjectsForCluster(cluster);
    setSelectedProject(
      projects.length > 0 ? projects[0].value : config.defaults.project,
    );
  };

  // Construct the current path based on selected cluster and project
  const currentPath = `/${selectedCluster}/${selectedProject}`;
  const isDirectoryActive =
    location === currentPath ||
    location === "/" ||
    (location.includes("/idf/") && !location.includes("/cms"));

  return (
    <>
      <nav className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Brand */}
          <Link href="/" className="flex items-center" data-testid="link-home">
            <Logo height={45} />
          </Link>

          {/* Desktop selectors - Only show in directory view */}
          {!location.includes("/idf/") && (
            <div className="hidden md:flex items-center space-x-4">
              <select
                value={selectedCluster}
                onChange={(e) => handleClusterChange(e.target.value)}
                className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
                data-testid="select-cluster"
              >
                {config.clusters.available.map((cluster: string) => (
                  <option key={cluster} value={cluster}>
                    {cluster === "trk"
                      ? "Trinity Rail"
                      : cluster.toUpperCase() + " Cluster"}
                  </option>
                ))}
              </select>

              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
                data-testid="select-project"
              >
                {getProjectsForCluster(selectedCluster).map((project) => (
                  <option key={project.value} value={project.value}>
                    {project.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Desktop navigation links */}
          <div className="hidden md:flex items-center space-x-1">
            <Link
              href={currentPath}
              className={`nav-link ${isDirectoryActive ? "active" : ""}`}
              data-testid="link-directory"
              title="Directory"
            >
              <i className="fas fa-list"></i>
            </Link>
            {isAdmin && (
              <button
                onClick={() => setIsAdminOpen(true)}
                className="nav-link"
                data-testid="button-admin"
                title="Admin Panel"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
            <ThemeToggle />
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle Menu"
          >
            {isMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        <div
          className={`${isMenuOpen ? "block" : "hidden"} md:hidden mt-4 space-y-4`}
        >
          {/* Mobile selectors - Only show in directory view */}
          {!location.includes("/idf/") && (
            <div className="flex flex-col space-y-2">
              <select
                value={selectedCluster}
                onChange={(e) => handleClusterChange(e.target.value)}
                className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
                data-testid="select-cluster-mobile"
              >
                {config.clusters.available.map((cluster: string) => (
                  <option key={cluster} value={cluster}>
                    {cluster === "trk"
                      ? "Trinity Rail"
                      : cluster.toUpperCase() + " Cluster"}
                  </option>
                ))}
              </select>

              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
                data-testid="select-project-mobile"
              >
                {getProjectsForCluster(selectedCluster).map((project) => (
                  <option key={project.value} value={project.value}>
                    {project.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center space-x-1">
            <Link
              href={currentPath}
              className={`nav-link ${isDirectoryActive ? "active" : ""}`}
              data-testid="link-directory-mobile"
              title="Directory"
              onClick={() => setIsMenuOpen(false)}
            >
              <i className="fas fa-list"></i>
            </Link>
            {isAdmin && (
              <button
                onClick={() => {
                  setIsAdminOpen(true);
                  setIsMenuOpen(false);
                }}
                className="nav-link"
                data-testid="button-admin-mobile"
                title="Admin Panel"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <AdminSidebar
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
      />
    </>
  );
}
