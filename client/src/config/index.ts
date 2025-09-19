// Configuración centralizada de la aplicación
export const config = {
  // Configuración de clusters y proyectos
  clusters: {
    available: ["Trinity"],
    default: "Trinity",
  },

  // Configuración de proyectos por cluster
  projects: {
    Trinity: [
      {
        value: "sabinas",
        label: "Sabinas Project",
        apiValue: "Sabinas",
      },
      {
        value: "monclova",
        label: "Monclova Project",
        apiValue: "Monclova",
      },
    ],
  },

  // Configuración por defecto
  defaults: {
    cluster: "Trinity",
    project: "sabinas",
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
      // Decodifica la URL por si viene como "trinity%20project"
      const decoded = decodeURIComponent(urlPath);
      if (decoded === "trinity") return "trinity";
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
