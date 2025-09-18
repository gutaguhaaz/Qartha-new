// Configuración centralizada de la aplicación
export const config = {
  // Configuración de clusters y proyectos
  clusters: {
    available: ["Trinity", "TRK"],
    default: "Trinity",
  },

  // Configuración de proyectos por cluster
  projects: {
    Trinity: [
      {
        value: "Sabinas",
        label: "Sabinas Project", 
        apiValue: "Sabinas",
      },
      {
        value: "Monclova Project",
        label: "Monclova Project",
        apiValue: "Monclova",
      },
    ],
    TRK: [
      {
        value: "Trinity Project", 
        label: "Trinity Project",
        apiValue: "trinity",
      },
      {
        value: "Demo Project",
        label: "Demo Project", 
        apiValue: "demo",
      },
    ],
  },

  // Configuración por defecto
  defaults: {
    cluster: "Trinity", 
    project: "Sabinas",
  },

  // Configuración de API
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || "",
    adminToken: import.meta.env.VITE_ADMIN_TOKEN || "changeme-demo-token",
  },

  // Mapeo de URLs
  urlMapping: {
    // Mapeo de proyecto a URL para la API
    projectToApiPath: (project: string) => {
      return project;
    },

    // Mapeo de proyecto a URL para el frontend  
    projectToUrlPath: (project: string) => {
      return project;
    },

    // Mapeo inverso de URL a proyecto - maneja tanto el formato antiguo como nuevo
    urlPathToProject: (urlPath: string) => {
      // Decodifica la URL por si viene como "Sabinas%20Project"
      const decoded = decodeURIComponent(urlPath);
      if (decoded === "Sabinas Project") return "Sabinas";
      return decoded;
    },
  },

  // Configuración de la interfaz
  ui: {
    searchPlaceholder: "Search IDFs by code, title or location...",
    defaultLimit: 50,
    itemsPerPage: 20,
  },
};

// Función para obtener proyectos de un cluster
export const getProjectsForCluster = (cluster: string) => {
  return config.projects[cluster as keyof typeof config.projects] || [];
};

// Función para obtener configuración de cluster
export const getClusterConfig = (cluster: string) => {
  const projects = getProjectsForCluster(cluster);
  return {
    cluster,
    projects,
    defaultProject: projects[0]?.value || "",
  };
};

// Función para validar si un cluster existe
export const isValidCluster = (cluster: string) => {
  return config.clusters.available.includes(cluster);
};

// Función para validar si un proyecto existe en un cluster
export const isValidProject = (cluster: string, project: string) => {
  const projects = getProjectsForCluster(cluster);
  return projects.some((p) => p.value === project);
};
