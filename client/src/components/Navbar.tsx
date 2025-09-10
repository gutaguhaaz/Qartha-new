import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import ThemeToggle from "./ThemeToggle";
import AdminSidebar from "./AdminSidebar";
import { Settings, Menu, X } from "lucide-react";

const CLUSTERS = import.meta.env.VITE_CLUSTERS?.split(",") || ["trk", "lab"];
const DEFAULT_CLUSTER = import.meta.env.VITE_DEFAULT_CLUSTER || "trk";
const DEFAULT_PROJECT = import.meta.env.VITE_DEFAULT_PROJECT || "trinity";


function getProjectsForCluster(cluster: string): string[] {
  const projectsEnvVar = (import.meta.env as any)[`VITE_PROJECTS_${cluster}`];
  return projectsEnvVar?.split(',') || [DEFAULT_PROJECT];
}

export default function Navbar() {
  const [location] = useLocation();
  const [selectedCluster, setSelectedCluster] = useState(DEFAULT_CLUSTER);
  const [selectedProject, setSelectedProject] = useState(DEFAULT_PROJECT);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Parse current route to update selectors
  useEffect(() => {
    const pathParts = location.split("/").filter(Boolean);
    if (pathParts.length >= 2) {
      const [cluster, project] = pathParts;
      if (CLUSTERS.includes(cluster)) {
        setSelectedCluster(cluster);
        const projects = getProjectsForCluster(cluster);
        if (projects.includes(project)) {
          setSelectedProject(project);
        }
      }
    }
  }, [location]);

  const handleClusterChange = (cluster: string) => {
    setSelectedCluster(cluster);
    const projects = getProjectsForCluster(cluster);
    setSelectedProject(projects[0]);
  };

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
          <Link
            href={currentPath}
            className="flex items-center space-x-3"
            data-testid="link-home"
          >
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center logo-container">
              <svg 
                className="w-5 h-5 logo-svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-foreground">Qartha</h1>
          </Link>

          {/* Desktop selectors */}
          <div className="hidden md:flex items-center space-x-4">
            <select
              value={selectedCluster}
              onChange={(e) => handleClusterChange(e.target.value)}
              className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
              data-testid="select-cluster"
            >
              {CLUSTERS.map((cluster: string) => (
                <option key={cluster} value={cluster}>
                  {cluster.toUpperCase()} Cluster
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
                <option key={project} value={project}>
                  {project.charAt(0).toUpperCase() + project.slice(1)} Project
                </option>
              ))}
            </select>
          </div>

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
            <button
              onClick={() => setIsAdminOpen(true)}
              className="nav-link"
              data-testid="button-admin"
              title="Admin Panel"
            >
              <Settings className="w-4 h-4 animate-spin" />
            </button>
            <ThemeToggle />
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle Menu"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        <div className={`${isMenuOpen ? "block" : "hidden"} md:hidden mt-4 space-y-4`}
        >
          <div className="flex flex-col space-y-2">
            <select
              value={selectedCluster}
              onChange={(e) => handleClusterChange(e.target.value)}
              className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
              data-testid="select-cluster-mobile"
            >
              {CLUSTERS.map((cluster: string) => (
                <option key={cluster} value={cluster}>
                  {cluster.toUpperCase()} Cluster
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
                <option key={project} value={project}>
                  {project.charAt(0).toUpperCase() + project.slice(1)} Project
                </option>
              ))}
            </select>
          </div>

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
            <button
              onClick={() => {
                setIsAdminOpen(true);
                setIsMenuOpen(false);
              }}
              className="nav-link"
              data-testid="button-admin-mobile"
              title="Admin Panel"
            >
              <Settings className="w-4 h-4 animate-spin" />
            </button>
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