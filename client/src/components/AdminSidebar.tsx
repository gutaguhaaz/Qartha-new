import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { X, Upload, Trash2, Edit3, Save, ArrowUp, ArrowDown, Maximize, Minimize, Plus } from "lucide-react";
import { getIdfs, getIdf, uploadAsset } from "@/lib/api";
import EditableDataTable from "./EditableDataTable";
import DataTable from "./DataTable";
import AddIdfDialog from "./AddIdfDialog";
import LogoWidget from "./LogoWidget"; // Assuming LogoWidget is in this path

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  preloadIdf?: {
    cluster: string;
    project: string;
    code: string;
  };
}

interface IdfData {
  cluster: string;
  project: string;
  code: string;
  title: string;
  description?: string;
  site?: string;
  room?: string;
  gallery: any[];
  documents: any[];
  diagram?: any;
  table?: any;
  media?: { // Added media property
    logo?: { name: string; url: string };
  };
}

export default function AdminSidebar({ isOpen, onClose, preloadIdf }: AdminSidebarProps) {
  const [selectedCluster, setSelectedCluster] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedIdf, setSelectedIdf] = useState<string>("");
  const [editingIdf, setEditingIdf] = useState<any>(null);
  const [idfs, setIdfs] = useState<any[]>([]); // State to hold the list of IDFs
  const [adminToken, setAdminToken] = useState(import.meta.env.VITE_ADMIN_TOKEN || "changeme-demo-token");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState("table");
  const [showTableEditor, setShowTableEditor] = useState(false); // State for showing/hiding table editor

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Effect to preload IDF data when sidebar opens with preloadIdf
  useEffect(() => {
    if (isOpen && preloadIdf) {
      setSelectedCluster(preloadIdf.cluster);
      setSelectedProject(preloadIdf.project);
      setSelectedIdf(preloadIdf.code);

      // Fetch IDFs for this cluster/project to populate the dropdown
      getIdfs(preloadIdf.cluster, preloadIdf.project, { limit: 100 })
        .then(data => {
          setIdfs(data);
          // Auto-load the specific IDF
          getIdf(preloadIdf.cluster, preloadIdf.project, preloadIdf.code)
            .then(idfData => {
              setEditingIdf(idfData);
            });
        });
    }
  }, [isOpen, preloadIdf]);

  // API calls to get data for dropdowns
  const { data: clusters = [] } = useQuery({
    queryKey: ['admin', 'clusters'],
    queryFn: async () => {
      // Using predefined clusters for now
      return [
        { value: "trk", label: "TRK" },
        { value: "lab", label: "LAB" },
        { value: "alpha", label: "ALPHA" }
      ];
    }
  });

  // Define projects based on cluster selection
  const projectsByCluster = {
    trk: [
      { value: "trinity", label: "Trinity" },
      { value: "alpha", label: "Alpha" }
    ],
    lab: [
      { value: "demo", label: "Demo" },
      { value: "research", label: "Research" }
    ],
    alpha: [
      { value: "prototype", label: "Prototype" }
    ]
  };

  // Dynamically get projects based on selected cluster
  const projects = selectedCluster ? projectsByCluster[selectedCluster as keyof typeof projectsByCluster] || [] : [];

  // Fetch IDFs using the getIdfs function from api
  useEffect(() => {
    const loadIdfs = async () => {
      if (selectedCluster && selectedProject) {
        try {
          console.log(`Loading IDFs for ${selectedCluster}/${selectedProject}`);
          const data = await getIdfs(selectedCluster, selectedProject);
          console.log('Loaded IDFs:', data);
          setIdfs(data);
        } catch (error) {
          console.error('Error loading IDFs:', error);
          setIdfs([]);
        }
      } else {
        setIdfs([]);
      }
    };

    loadIdfs();
  }, [selectedCluster, selectedProject]);

  // Reset dependent fields when cluster changes
  useEffect(() => {
    setSelectedProject('');
    setSelectedIdf('');
    setIdfs([]);
  }, [selectedCluster]);

  // Reset IDF when project changes
  useEffect(() => {
    setSelectedIdf('');
  }, [selectedProject]);

  // Get selected IDF data
  const { data: idfData, refetch: refetchIdf } = useQuery({
    queryKey: ['admin', 'idf-details', selectedCluster, selectedProject, selectedIdf],
    queryFn: async () => {
      if (!selectedCluster || !selectedProject || !selectedIdf) return null;
      const response = await fetch(`/api/${selectedCluster}/${selectedProject}/idfs/${selectedIdf}`);
      if (!response.ok) throw new Error('Failed to fetch IDF details');
      return response.json();
    },
    enabled: !!selectedCluster && !!selectedProject && !!selectedIdf
  });

  // Initialize editingIdf and map data to the expected structure
  useEffect(() => {
    if (idfData && selectedIdf) {
      const initialData = {
        ...idfData,
        basic_info: idfData.basic_info || {
          title: idfData.title || "",
          location: idfData.site || "", // Assuming site maps to location
          description: idfData.description || ""
        },
        gallery: Array.isArray(idfData.gallery) ? idfData.gallery : [],
        documents: Array.isArray(idfData.documents) ? idfData.documents : [],
        diagram: idfData.diagram || null,
        table: idfData.table || null, // Keep as single table, not array
        media: idfData.media || {} // Ensure media object exists
      };
      setEditingIdf(initialData);
    } else if (!selectedIdf) {
      setEditingIdf(null); // Clear editingIdf when no IDF is selected
    }
  }, [idfData, selectedIdf]);


  // Save IDF mutation
  const saveIdfMutation = useMutation({
    mutationFn: async (data: any) => {
      // Ensure data format matches backend expectations
      const cleanData = {
        title: data.basic_info?.title || data.title || "",
        description: data.basic_info?.description || data.description || "",
        site: data.basic_info?.location || data.site || "",
        room: data.room || "",
        table: data.table || undefined
      };

      const response = await fetch(`/api/${selectedCluster}/${selectedProject}/idfs/${selectedIdf}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(cleanData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save IDF: ${response.status} - ${errorText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "IDF saved successfully" });
      queryClient.invalidateQueries({ queryKey: ['admin', 'idf-details', selectedCluster, selectedProject, selectedIdf] });
      refetchIdf(); // Refetch to get the latest data
    },
    onError: (error) => {
      console.error("Save error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save: ${error}",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (files: FileList | null, type: 'images' | 'documents' | 'diagram') => {
    if (!files || files.length === 0 || !selectedIdf) {
      toast({
        title: "Error",
        description: "Please select an IDF first",
        variant: "destructive",
      });
      return;
    }

    if (!adminToken || adminToken === "changeme-demo-token") {
      toast({
        title: "Error",
        description: "Please set a valid admin token",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update the editingIdf immediately for UI feedback
      const updatedIdf = { ...editingIdf };

      for (let i = 0; i < files.length; i++) {
        const result = await uploadAsset(selectedCluster || "", selectedProject || "", selectedIdf, files[i], type, adminToken);

        // Add to local state immediately
        const mediaItem = {
          url: result.url,
          name: files[i].name,
          kind: type === 'diagram' ? 'diagram' : type.slice(0, -1) // Remove 's' from 'images'/'documents'
        };

        if (type === 'images') {
          if (!updatedIdf.gallery) updatedIdf.gallery = [];
          updatedIdf.gallery.push(mediaItem);
        } else if (type === 'documents') {
          if (!updatedIdf.documents) updatedIdf.documents = [];
          updatedIdf.documents.push(mediaItem);
        } else if (type === 'diagram') {
          updatedIdf.diagram = mediaItem;
        }

        toast({
          title: "Success",
          description: `${files[i].name} uploaded successfully`,
        });
      }

      // Update local state
      setEditingIdf(updatedIdf);

      // Refresh from server to get the absolute URLs
      setTimeout(() => {
        refetchIdf();
      }, 500);
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Upload failed",
        variant: "destructive",
      });
    }
  };

  const removeMedia = (
    item: any,
    type: 'images' | 'documents' | 'diagram'
  ) => {
    if (!editingIdf) return;

    if (type === 'diagram') {
      setEditingIdf({ ...editingIdf, diagram: null });
    } else {
      const key: 'gallery' | 'documents' =
        type === 'images' ? 'gallery' : 'documents';
      const currentItems = editingIdf[key] || [];
      const updatedItems = currentItems.filter((i: any) => i.url !== item.url);
      setEditingIdf({ ...editingIdf, [key]: updatedItems });
    }
  };

  const handleSave = () => {
    if (!editingIdf) {
      toast({
        title: "Error",
        description: "No data to save",
        variant: "destructive",
      });
      return;
    }

    if (!adminToken || adminToken === "changeme-demo-token") {
      toast({
        title: "Error",
        description: "Please set a valid admin token",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    if (!editingIdf.basic_info?.title?.trim()) {
      toast({
        title: "Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    saveIdfMutation.mutate(editingIdf);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full bg-card border-r border-border z-50 transform transition-all duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } ${isFullscreen ? 'w-full' : 'w-96'}`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold">Admin Panel</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 hover:bg-accent rounded-md transition-colors"
                data-testid="button-toggle-fullscreen"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize className="w-5 h-5" />
                ) : (
                  <Maximize className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-accent rounded-md transition-colors"
                data-testid="button-close-admin"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Select IDF to Edit</h3>
                {/* Add IDF Button Removed */}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Cluster</label>
                  <select
                    value={selectedCluster}
                    onChange={(e) => {
                      setSelectedCluster(e.target.value);
                      setSelectedProject(""); // Reset project when cluster changes
                      setSelectedIdf("");     // Reset IDF when cluster changes
                    }}
                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">Select Cluster</option>
                    {clusters.map((cluster: { value: string; label: string }) => (
                      <option key={cluster.value} value={cluster.value}>
                        {cluster.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Project</label>
                  <select
                    value={selectedProject}
                    onChange={(e) => {
                      setSelectedProject(e.target.value);
                      setSelectedIdf(""); // Reset IDF when project changes
                    }}
                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                    disabled={!selectedCluster}
                  >
                    <option value="">Select Project</option>
                    {projects.map((project: { value: string; label: string }) => (
                      <option key={project.value} value={project.value}>
                        {project.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">IDF</label>
                  <select
                    value={selectedIdf}
                    onChange={(e) => setSelectedIdf(e.target.value)}
                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                    disabled={!selectedProject}
                  >
                    <option value="">Select IDF</option>
                    {idfs.map((idf: any) => (
                      <option key={idf.code} value={idf.code}>
                        {idf.code} - {idf.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Admin Token</label>
                <input
                  type="password"
                  value={adminToken}
                  onChange={(e) => setAdminToken(e.target.value)}
                  className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm font-mono"
                  placeholder="Enter admin token"
                />
              </div>
            </div>

            {/* IDF Editor */}
            {editingIdf && (
              <div className="space-y-6 border-t border-border pt-6">
                <h3 className="font-medium">Editing: {editingIdf?.basic_info?.title || editingIdf?.title || 'Untitled'}</h3>

                {/* Tab Navigation */}
                <div className="flex flex-wrap gap-1 mb-6">
                  <button
                    onClick={() => setActiveTab("table")}
                    className={`px-3 py-2 text-sm rounded transition-colors ${
                      activeTab === "table"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    DFO
                  </button>
                  <button
                    onClick={() => setActiveTab("gallery")}
                    className={`px-3 py-2 text-sm rounded transition-colors ${
                      activeTab === "gallery"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    Gallery
                  </button>
                  <button
                    onClick={() => setActiveTab("location")}
                    className={`px-3 py-2 text-sm rounded transition-colors ${
                      activeTab === "location"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    Location
                  </button>
                  <button
                    onClick={() => setActiveTab("diagram")}
                    className={`px-3 py-2 text-sm rounded transition-colors ${
                      activeTab === "diagram"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    Diagram
                  </button>
                  <button
                    onClick={() => setActiveTab("documents")}
                    className={`px-3 py-2 text-sm rounded transition-colors ${
                      activeTab === "documents"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    Documents
                  </button>
                  {/* Overview tab - Hidden but kept in code */}
                  <button
                    onClick={() => setActiveTab("overview")}
                    className={`hidden px-3 py-2 text-sm rounded transition-colors ${
                      activeTab === "overview"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    Overview
                  </button>
                </div>

                {/* Tab Content */}
                {activeTab === "table" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Fiber Optic Information (DFO)</h4>
                      <button
                        onClick={() => setShowTableEditor(!showTableEditor)}
                        className="px-3 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
                      >
                        {showTableEditor ? 'Hide Editor' : 'Show Editor'}
                      </button>
                    </div>
                    {showTableEditor && (
                      <div className="border rounded-md p-4 bg-muted/50">
                        <EditableDataTable
                          table={editingIdf.table}
                          onChange={(table) => setEditingIdf({ ...editingIdf, table })}
                        />
                      </div>
                    )}
                    {editingIdf.table && !showTableEditor && (
                      <div className="text-sm text-muted-foreground">
                        Table configured with {editingIdf.table.columns?.length || 0} columns and {editingIdf.table.rows?.length || 0} rows
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "gallery" && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Gallery management - Upload images via CMS Upload page
                    </p>
                    {editingIdf?.gallery && editingIdf.gallery.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Current Images:</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {editingIdf.gallery.map((item, index) => (
                            <div key={index} className="relative">
                              <img
                                src={item.url}
                                alt={item.name || `Gallery image ${index + 1}`}
                                className="w-full h-20 object-cover rounded border"
                              />
                              <span className="text-xs text-muted-foreground block mt-1 truncate">
                                {item.name || `Image ${index + 1}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "location" && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Location images - All gallery images are shown here
                    </p>
                    {editingIdf?.gallery && editingIdf.gallery.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Location Images:</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {editingIdf.gallery.map((item, index) => (
                            <div key={index} className="relative">
                              <img
                                src={item.url}
                                alt={item.name || `Location image ${index + 1}`}
                                className="w-full h-20 object-cover rounded border"
                              />
                              <span className="text-xs text-muted-foreground block mt-1 truncate">
                                {item.name || `Image ${index + 1}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "diagram" && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Diagram management - Images only (PDFs moved to Documents)
                    </p>
                    {editingIdf?.diagram && editingIdf.diagram.kind === 'image' && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Current Diagram:</h4>
                        <div className="flex items-center space-x-2 p-2 border rounded">
                          <i className="fas fa-image text-muted-foreground"></i>
                          <span className="text-sm">{editingIdf.diagram.name || 'Diagram'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "documents" && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Document management - PDF, DOC/DOCX, XLS/XLSX files
                    </p>
                    {((editingIdf?.documents && editingIdf.documents.filter(doc => doc.kind === 'document').length > 0) ||
                      (editingIdf?.diagram && editingIdf.diagram.kind === 'document')) && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Current Documents:</h4>
                        <div className="space-y-2">
                          {editingIdf.documents?.filter(doc => doc.kind === 'document').map((doc, index) => (
                            <div key={index} className="flex items-center space-x-2 p-2 border rounded">
                              <i className="fas fa-file-alt text-muted-foreground"></i>
                              <span className="text-sm">{doc.name || `Document ${index + 1}`}</span>
                            </div>
                          ))}
                          {editingIdf?.diagram && editingIdf.diagram.kind === 'document' && (
                            <div className="flex items-center space-x-2 p-2 border rounded">
                              <i className="fas fa-file-pdf text-muted-foreground"></i>
                              <span className="text-sm">{editingIdf.diagram.name || 'Diagram PDF'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Overview tab content - Hidden but kept in code */}
                {activeTab === "overview" && (
                  <div className="hidden space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Title</label>
                      <input
                        type="text"
                        value={editingIdf?.basic_info?.title || ""}
                        onChange={(e) =>
                          setEditingIdf((prev: any) => ({
                            ...prev,
                            basic_info: { ...prev.basic_info, title: e.target.value },
                          }))
                        }
                        className="w-full bg-input border border-border rounded-md px-3 py-2 text-foreground"
                        placeholder="IDF Title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Description</label>
                      <textarea
                        value={editingIdf?.basic_info?.description || ""}
                        onChange={(e) =>
                          setEditingIdf((prev: any) => ({
                            ...prev,
                            basic_info: { ...prev.basic_info, description: e.target.value },
                          }))
                        }
                        className="w-full bg-input border border-border rounded-md px-3 py-2 text-foreground h-24 resize-none"
                        placeholder="IDF Description"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Site</label>
                        <input
                          type="text"
                          value={editingIdf?.basic_info?.location || ""}
                          onChange={(e) =>
                            setEditingIdf((prev: any) => ({
                              ...prev,
                              basic_info: { ...prev.basic_info, location: e.target.value },
                            }))
                          }
                          className="w-full bg-input border border-border rounded-md px-3 py-2 text-foreground"
                          placeholder="Site Name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Room</label>
                        <input
                          type="text"
                          value={editingIdf?.room || ""}
                          onChange={(e) => setEditingIdf((prev:any) => ({...prev, room: e.target.value}))}
                          placeholder="Room Number"
                          className="w-full bg-input border border-border rounded-md px-3 py-2 text-foreground"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Health Status / traffic-light widget placeholder */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Health Status</h4>
                  <div className="bg-card border border-border rounded-lg p-4 text-sm text-muted-foreground">
                    <p>Health Status widget would be here.</p>
                    <p>This widget is hidden as per requirements.</p>
                  </div>
                </div>

                {/* Basic Info (moved from overview to be always visible when editing) */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Basic Information</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <input
                      type="text"
                      value={editingIdf?.basic_info?.title || ""}
                      onChange={(e) =>
                        setEditingIdf((prev: any) => ({
                          ...prev,
                          basic_info: { ...prev.basic_info, title: e.target.value },
                        }))
                      }
                      className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                      placeholder="IDF Title"
                    />
                    <input
                      type="text"
                      value={editingIdf?.basic_info?.location || ""}
                      onChange={(e) =>
                        setEditingIdf((prev: any) => ({
                          ...prev,
                          basic_info: { ...prev.basic_info, location: e.target.value },
                        }))
                      }
                      className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                      placeholder="Location"
                    />
                    <input
                      type="text"
                      value={editingIdf?.room || ""}
                      onChange={(e) => setEditingIdf((prev:any) => ({...prev, room: e.target.value}))}
                      placeholder="Room"
                      className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                    />
                    <textarea
                      value={editingIdf?.basic_info?.description || ""}
                      onChange={(e) =>
                        setEditingIdf((prev: any) => ({
                          ...prev,
                          basic_info: { ...prev.basic_info, description: e.target.value },
                        }))
                      }
                      className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm min-h-[100px]"
                      placeholder="Description"
                    />
                  </div>
                </div>


                {/* Images (moved from gallery tab content) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Images ({editingIdf.gallery?.length || 0})</h4>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e.target.files, 'images')}
                      />
                      <div className="flex items-center space-x-1 text-xs bg-primary text-primary-foreground px-2 py-1 rounded-md hover:bg-primary/90">
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </div>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {editingIdf.gallery?.map((img: any, index: number) => (
                      <div key={index} className="relative group">
                        <img
                          src={img.url}
                          alt={img.filename}
                          className="w-full h-20 object-cover rounded border"
                        />
                        <button
                          onClick={() => removeMedia(img, 'images')}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Documents (moved from documents tab content) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Documents ({editingIdf.documents?.length || 0})</h4>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.xls,.xlsx"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e.target.files, 'documents')}
                      />
                      <div className="flex items-center space-x-1 text-xs bg-primary text-primary-foreground px-2 py-1 rounded-md hover:bg-primary/90">
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </div>
                    </label>
                  </div>
                  <div className="space-y-2">
                    {editingIdf.documents?.map((doc: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-accent rounded border">
                        <span className="text-xs truncate">{doc.filename}</span>
                        <button
                          onClick={() => removeMedia(doc, 'documents')}
                          className="text-destructive hover:bg-destructive/10 rounded p-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Diagram (moved from diagram tab content) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Diagram</h4>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e.target.files, 'diagram')}
                      />
                      <div className="flex items-center space-x-1 text-xs bg-primary text-primary-foreground px-2 py-1 rounded-md hover:bg-primary/90">
                        <Upload className="w-3 h-3" />
                        <span>Upload</span>
                      </div>
                    </label>
                  </div>
                  {editingIdf.diagram && (
                    <div className="relative group">
                      <div className="p-2 bg-accent rounded border">
                        <span className="text-xs">{editingIdf.diagram.filename}</span>
                      </div>
                      <button
                        onClick={() => removeMedia(editingIdf.diagram, 'diagram')}
                        className="absolute top-1 right-1 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Logo Widget Section */}
                {selectedIdf && adminToken && (
                  <div className="space-y-3">
                    <LogoWidget
                      cluster={selectedCluster || ""}
                      project={selectedProject || ""}
                      code={selectedIdf}
                      currentLogo={editingIdf?.media?.logo}
                      adminToken={adminToken}
                    />
                  </div>
                )}

                {/* Fiber Allocation Table Section (moved from table tab content) */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Fiber Allocation Table</h4>
                  <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <DataTable
                      table={editingIdf.table || undefined}
                      isEditable={true}
                      onChange={(newTable) =>
                        setEditingIdf({ ...editingIdf, table: newTable })
                      }
                    />
                  </div>
                </div>

                {/* Save Changes */}
                <div className="pt-4 border-t border-border">
                  <button
                    onClick={handleSave}
                    className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors flex items-center justify-center space-x-2">
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}