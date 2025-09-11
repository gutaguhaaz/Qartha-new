
export interface TabConfig {
  key: string;
  label: string;
  icon?: string;
  component?: string;
  default?: boolean;
  hidden?: boolean;
}

export const IDF_TABS: TabConfig[] = [
  { 
    key: 'dfo', 
    label: 'Fiber Optic Information (DFO)', 
    icon: 'fas fa-table',
    component: 'FiberAllocationTab', 
    default: true 
  },
  { 
    key: 'gallery', 
    label: 'Gallery', 
    icon: 'fas fa-images',
    component: 'GalleryTab' 
  },
  { 
    key: 'location', 
    label: 'Location', 
    icon: 'fas fa-map-marker-alt',
    component: 'LocationTab' 
  },
  { 
    key: 'diagram', 
    label: 'Diagram', 
    icon: 'fas fa-project-diagram',
    component: 'DiagramImagesTab' 
  },
  { 
    key: 'documents', 
    label: 'Documents', 
    icon: 'fas fa-file-alt',
    component: 'DocumentsTab' 
  },
  { 
    key: 'overview', 
    label: 'Overview', 
    icon: 'fas fa-info-circle',
    component: 'OverviewTab', 
    hidden: true 
  }
];

export const getVisibleTabs = () => IDF_TABS.filter(tab => !tab.hidden);

export const getDefaultTab = () => IDF_TABS.find(tab => tab.default)?.key || 'dfo';
