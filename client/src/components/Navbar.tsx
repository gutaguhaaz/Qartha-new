import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";

const CLUSTERS = import.meta.env.VITE_CLUSTERS?.split(',') || ['trk', 'lab'];
const DEFAULT_CLUSTER = import.meta.env.VITE_DEFAULT_CLUSTER || 'trk';
const DEFAULT_PROJECT = import.meta.env.VITE_DEFAULT_PROJECT || 'trinity';

function getProjectsForCluster(cluster: string): string[] {
  const projectsEnvVar = import.meta.env[`VITE_PROJECTS_${cluster}`];
  return projectsEnvVar?.split(',') || [DEFAULT_PROJECT];
}

export default function Navbar() {
  const [location] = useLocation();
  const [selectedCluster, setSelectedCluster] = useState(DEFAULT_CLUSTER);
  const [selectedProject, setSelectedProject] = useState(DEFAULT_PROJECT);
  
  // Parse current route to update selectors
  useEffect(() => {
    const pathParts = location.split('/').filter(Boolean);
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
  const isDirectoryActive = location === currentPath || location === '/' || 
    (location.includes('/idf/') && !location.includes('/cms'));
  const isCmsActive = location.includes('/cms');

  return (
    <nav className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-8">
          {/* Brand */}
          <Link href={currentPath} className="flex items-center space-x-3" data-testid="link-home">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <i className="fas fa-network-wired text-primary-foreground text-lg"></i>
            </div>
            <h1 className="text-xl font-bold text-foreground">Qartha</h1>
          </Link>

          {/* Cluster/Project Selectors */}
          <div className="flex items-center space-x-4">
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
              {getProjectsForCluster(selectedCluster).map(project => (
                <option key={project} value={project}>
                  {project.charAt(0).toUpperCase() + project.slice(1)} Project
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex items-center space-x-1">
          <Link 
            href={currentPath} 
            className={`nav-link ${isDirectoryActive ? 'active' : ''}`}
            data-testid="link-directory"
          >
            <i className="fas fa-list mr-2"></i>Directorio
          </Link>
          <Link 
            href={`${currentPath}/cms`} 
            className={`nav-link ${isCmsActive ? 'active' : ''}`}
            data-testid="link-cms"
          >
            <i className="fas fa-upload mr-2"></i>CMS
          </Link>
        </div>
      </div>
    </nav>
  );
}
