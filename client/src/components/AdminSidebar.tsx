import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { X, Upload, Trash2, Plus, Edit3, Save, ArrowUp, ArrowDown } from "lucide-react";
import { getIdfs, getIdf, uploadAsset } from "@/lib/api";
import EditableDataTable from "./EditableDataTable";

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
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
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const [selectedCluster, setSelectedCluster] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedIdf, setSelectedIdf] = useState("");
  const [editingIdf, setEditingIdf] = useState<IdfData | null>(null);
  const [idfs, setIdfs] = useState<any[]>([]); // State to hold the list of IDFs
  const [adminToken, setAdminToken] = useState(import.meta.env.VITE_ADMIN_TOKEN || "changeme-demo-token");

  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const { data: idfDetails } = useQuery({
    queryKey: ['admin', 'idf-details', selectedCluster, selectedProject, selectedIdf],
    queryFn: async () => {
      if (!selectedCluster || !selectedProject || !selectedIdf) return null;
      const response = await fetch(`/api/${selectedCluster}/${selectedProject}/idfs/${selectedIdf}`);
      if (!response.ok) throw new Error('Failed to fetch IDF details');
      return response.json();
    },
    enabled: !!selectedCluster && !!selectedProject && !!selectedIdf
  });

  // Update editing data when IDF details change
  useEffect(() => {
    if (idfDetails) {
      setEditingIdf(idfDetails);
    }
  }, [idfDetails]);

  const handleFileUpload = async (files: FileList | null, type: 'images' | 'documents' | 'diagram') => {
    if (!files || files.length === 0 || !selectedIdf) return;

    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('file', files[i]);
        formData.append('code', selectedIdf);

        const response = await fetch(`/api/${selectedCluster}/${selectedProject}/assets/${type}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${adminToken}`
          },
          body: formData
        });

        if (!response.ok) throw new Error(`Failed to upload ${files[i].name}`);
      }

      toast({
        title: "Success",
        description: `${files.length} file(s) uploaded successfully`
      });

      // Refresh IDF details
      queryClient.invalidateQueries({
        queryKey: ['admin', 'idf-details', selectedCluster, selectedProject, selectedIdf]
      });

    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Upload failed",
        variant: "destructive"
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

  const handleSaveChanges = async () => {
    if (!selectedCluster || !selectedProject || !selectedIdf || !editingIdf) return;

    try {
      const response = await fetch(`/api/${selectedCluster}/${selectedProject}/idfs/${selectedIdf}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          title: editingIdf.title,
          description: editingIdf.description,
          site: editingIdf.site,
          room: editingIdf.room,
          table: editingIdf.table
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save changes');
      }

      // Refresh IDF details after saving
      queryClient.invalidateQueries({
        queryKey: ['admin', 'idf-details', selectedCluster, selectedProject, selectedIdf]
      });
      toast({
        title: "Success",
        description: "Changes saved successfully"
      });

    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive"
      });
    }
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
      <div className={`fixed left-0 top-0 h-full w-96 bg-card border-r border-border z-50 transform transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold">Admin Panel</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded-md transition-colors"
              data-testid="button-close-admin"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Selection */}
            <div className="space-y-4">
              <h3 className="font-medium">Select IDF to Edit</h3>

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
                <h3 className="font-medium">Editing: {editingIdf.title}</h3>

                {/* Basic Info */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Basic Information</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <input
                      type="text"
                      value={editingIdf.title}
                      onChange={(e) => setEditingIdf({...editingIdf, title: e.target.value})}
                      placeholder="Title"
                      className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      value={editingIdf.site || ""}
                      onChange={(e) => setEditingIdf({...editingIdf, site: e.target.value})}
                      placeholder="Site"
                      className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      value={editingIdf.room || ""}
                      onChange={(e) => setEditingIdf({...editingIdf, room: e.target.value})}
                      placeholder="Room"
                      className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                    />
                    <textarea
                      value={editingIdf.description || ""}
                      onChange={(e) => setEditingIdf({...editingIdf, description: e.target.value})}
                      placeholder="Description"
                      rows={3}
                      className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                {/* Images */}
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

                {/* Documents */}
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

                {/* Diagram */}
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

                {/* Device Table */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Device Table</h4>
                  <EditableDataTable
                    table={editingIdf.table}
                    onChange={(newTable) =>
                      setEditingIdf({ ...editingIdf, table: newTable })
                    }
                  />
                </div>

                {/* Save Changes */}
                <div className="pt-4 border-t border-border">
                  <button 
                    onClick={handleSaveChanges} 
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