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
  return projectsEnvVar?.split(",") || [DEFAULT_PROJECT];
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

  const currentPath = `/${selectedCluster}/${selectedProject === "Sabinas Project" ? "Sabinas" : selectedProject}`;
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
            className="flex items-center"
            data-testid="link-home"
          >
            <div className="logo-container">
              <svg
                className="logoqartha logo-svg"
                version="1.2"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 3035 233"
                height="45"
                width="auto"
              >
                <title>Trinity Rail Logo</title>
                <defs>
                  <style>
                    {`
                      .logo-path-0 { fill: #7a939c; opacity: 0.98; }
                      .logo-path-1 { fill: #000000; opacity: 0.98; }
                      .logo-path-2 { fill: #9fa1a0; opacity: 0.97; }
                      .logo-path-3 { fill: #152860; }
                    `}
                  </style>
                </defs>
                <g id="background-1">
                  <path
                    className="logo-path-0"
                    fillRule="evenodd"
                    d="m0 88l111-73h4l110 74h-225zm0 31v-1h99v89h-2zm127 88v-89h99l-98 89zm1370-45l-2 6-9 7-11-1-8-10 1-11 10-8 11 1 8 12zm-26-6l2 12 12 4 8-8-2-12-12-4zm-439-110l74-1 21 9 13 18 2 24-7 16-15 13 27 35 53-115h29l60 130h-37l-9-25h-56l-10 25h-57l-49-73 34-4 4-6v-10l-9-8h-36v100l-32 1zm166 78h33l-17-41zm98-79h35v130h-35zm60 0h35v100l73 1-16 29h-92z"
                  />
                  <path
                    className="logo-path-1"
                    d="m278 45h204l17 5 13 11 6 11 2 24-7 16-15 13 37 50h-37l-49-73 33-3 5-6 1-8-10-11h-36v101h-32v-101h-54v101h-35v-101h-43zm270 0h31v130h-31zm59 0h29l59 74 1-74 32 1v129h-30l-59-74-1 74h-32zm146 0h31v130h-31zm279 2l-50 76v52h-31v-52l-32-49h-42v101h-35v-101h-43l1-29h141l26 39 25-39 40 1z"
                  />
                  <path
                    className="logo-path-0"
                    fillRule="evenodd"
                    d="m1478 151l10 3-2 7 2 8h-3l-2-7h-3l-1 7h-3zm2 8l4-1v-3l-4-1z"
                  />
                </g>
                <g id="background-2">
                  <path
                    className="logo-path-2"
                    fillRule="evenodd"
                    d="m3008 0l1 136-6 17-14 17-14 9-21 5-28-5-19-14-8-10-6-15v-29l14-25 19-14 14-4h21l15 5 1-73zm-71 102l-11 11-2 16 5 13 14 9h14l10-5 9-14-3-21-10-9-17-3zm-1310-44l27-21 27-14h6l1-3 19-3 3-3 29-2 31 5 2 3 21 6 29 17 19 17-28 45-36-29-35-11h-18l-34 11-36 29-27-43zm780 175v-55l-19 6h-12l-25-8-12-9-9-12-8-28 5-25 17-22 21-11 26-1 19 6 10 7 12 14 6 14 2 124zm-43-128l-9 14v13l5 10 13 9h16l12-8 6-11v-13l-6-11-8-6-16-3zm671 71l-7 6h-6l-7-8 1-9 6-5h6l7 7zm-777-169l25 2 20 8 9 7v5l-24 25-12-7-13-3-15 1-11 9 1 14 8 6 40 12 20 15 6 11 2 14-5 27-9 13-12 10-30 9-37-3-15-6-16-12 3-7 22-23h5l4 6 18 8 22-2 9-8v-13l-3-3-9-6-43-14-13-10-9-14v-31l11-19 23-16zm-379 4h81l28 9 12 11 9 19v25l-3 10-12 17-19 8v4l40 62-2 6-45-1-33-65-17-2-1 67h-38zm39 69h36l13-10v-14l-8-8-41-3zm109-69l39 1v65l62-66 50 1-3 7-6 3-32 37-31 29v4l78 85-2 5-51-1-65-76v74l-4 3h-33l-4-3-1-165zm797 49l26 3 12 6 12 11 9 17 3 13v23l-82 3 8 13 11 5h12l21-14 24 18-3 7-9 8-20 9-23 2-23-5-15-9-11-11-11-27v-20l5-17 20-23 18-9zm-12 33l-6 6-3 9h44v-7l-6-8-15-4zm-56-32l7 3v30l-21 8-10 16v63l-32 2-2-3v-64l6-21 22-24 17-8zm-304 7h30l4 3v71l9 9 12 3 9-3 8-8 3-11-1-62 33-2 1 71-12 25-20 15-26 4-11-1-14-6-18-17-6-12-3-14zm168 0l32 3 13 7 15 16 9 22v65l-3 3h-28l-4-6-18 6-22-2-21-11-14-16-6-13-1-11 4-30 21-24zm-3 34l-11 11-3 17 6 13 13 8h15l13-8 6-12v-12l-6-11-8-6-16-3zm-895 1h23l15 8 12 17 2 18-8 20-17 13-22 2-22-11-9-14-2-10 2-19 14-18z"
                  />
                  <path
                    className="logo-path-3"
                    fillRule="evenodd"
                    d="m1717 16h33l31 8 30 15 26 21-24 41-27-23-36-15h-32l-20 6-24 14-19 18-24-42 18-15 24-14zm164-3l85 2 18 6 12 9 9 16v34l-6 12-9 9-8 5-9 1-2 5 40 65-42 1-33-65-19-1-1 65-36 1zm37 67h36l13-10v-14l-8-8-41-3zm111-67h32l2 3v65l14-11 52-56h45l-1 4-71 73 79 86-49 1-67-77-2 76h-35zm-299 92l17 2 9 5 11 12 3 8-2 25-12 15-21 6-12-1-11-5-12-15-3-23 13-21z"
                  />
                  <path
                    className="logo-path-2"
                    fillRule="evenodd"
                    d="m1918 43h29l14 4 7 6 1 16-11 12-40 2v-3h36l13-10v-14l-8-8-41-3z"
                  />
                </g>
              </svg>
            </div>
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
                {CLUSTERS.map((cluster: string) => (
                  <option key={cluster} value={cluster}>
                    {cluster === "Trinity"
                      ? "Trinity"
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
                  <option key={project} value={project}>
                    {project === "Sabinas Project"
                      ? "Sabinas Project"
                      : project.charAt(0).toUpperCase() +
                        project.slice(1) +
                        " Project"}
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
            {/* Only show admin button in CMS routes */}
            {location.includes("/admin") && (
              <button
                onClick={() => setIsAdminOpen(true)}
                className="nav-link"
                data-testid="button-admin"
                title="Admin Panel"
              >
                <Settings className="w-4 h-4 animate-spin" />
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
                {CLUSTERS.map((cluster: string) => (
                  <option key={cluster} value={cluster}>
                    {cluster === "Trinity"
                      ? "Trinity"
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
                  <option key={project} value={project}>
                    {project === "Sabinas Project"
                      ? "Sabinas Project"
                      : project.charAt(0).toUpperCase() +
                        project.slice(1) +
                        " Project"}
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
            {/* Only show admin button in CMS routes */}
            {location.includes("/admin") && (
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
