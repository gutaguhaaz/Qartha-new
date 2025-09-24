import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Trash2,
  Save,
  ImageIcon,
  FileIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  deleteAsset,
  getIdf,
  getIdfs,
  updateIdf,
  updateDocumentTitle,
  uploadAsset,
  uploadIdfLogo,
  uploadAssets,
} from "@/lib/api";
import { config, getProjectsForCluster } from "../config";
import type { IdfPublic, MediaItem } from "@shared/schema";
import LogoWidget from "@/components/LogoWidget";

const TABS = [
  { value: "general", label: "General" },
  { value: "dfo", label: "DFO" },
  { value: "gallery", label: "Gallery" },
  { value: "location", label: "Location" },
  { value: "diagrams", label: "Diagrams" },
  { value: "documents", label: "Documents" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  preloadIdf?: {
    cluster: string;
    project: string;
    code: string;
  };
}

type MediaList = MediaItem[];

const normalizeProject = (value: string) => value || config.defaults.project;

export default function AdminSidebar({
  isOpen,
  onClose,
  preloadIdf,
}: AdminSidebarProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<TabValue>("general");
  const [selectedCluster, setSelectedCluster] = useState(
    preloadIdf?.cluster ?? config.defaults.cluster,
  );
  const [selectedProject, setSelectedProject] = useState(
    normalizeProject(preloadIdf?.project ?? config.defaults.project),
  );
  const [selectedCode, setSelectedCode] = useState(preloadIdf?.code ?? "");
  const [isExpanded, setIsExpanded] = useState(false);

  const [generalForm, setGeneralForm] = useState({
    title: "",
    description: "",
    site: "",
    room: "",
  });
  const [gallery, setGallery] = useState<MediaList>([]);
  const [documents, setDocuments] = useState<MediaList>([]);
  const [diagrams, setDiagrams] = useState<MediaList>([]);
  const [locationItems, setLocationItems] = useState<MediaList>([]);
  const [dfo, setDfo] = useState<MediaList>([]);
  const [tableData, setTableData] = useState<any>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false); // State for handling upload progress

  // Mock handlers for upload/delete for each section
  const handleRemoveGalleryItem = (index: number) => handleDeleteAsset("images", index); // Renamed for clarity
  const handleUploadLocation = (files: FileList | null) => handleUploadAsset("location", files);
  const handleRemoveLocationItem = (index: number) => handleDeleteAsset("location", index); // Renamed for clarity
  const handleUploadDiagrams = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedCode) return;
    try {
      const fileArray = Array.from(files);
      const result = await uploadAssets(selectedCluster, selectedProject, selectedCode, fileArray, "diagrams");

      // Invalidate all relevant queries to refresh both admin and public views
      await queryClient.invalidateQueries({
        queryKey: ["admin", "idfs", selectedCluster, selectedProject],
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin", "idf-detail", selectedCluster, selectedProject, selectedCode],
      });
      await queryClient.invalidateQueries({
        queryKey: ["/api", selectedCluster, selectedProject, "idfs", selectedCode],
      });

      // Trigger reload in the diagrams tab if it's currently active
      const diagramsTabReloadEvent = new CustomEvent("reloadDiagramsTab");
      window.dispatchEvent(diagramsTabReloadEvent);

      toast({
        title: "Diagrams updated",
        description: `Uploaded ${fileArray.length} diagram(s) successfully`,
      });
    } catch (error) {
      console.error("Failed to upload diagrams:", error);
      toast({
        title: "Error",
        description: "Failed to upload diagrams",
        variant: "destructive",
      });
    }
  };

  const handleRemoveDiagramItem = async (index: number) => {
    if (!selectedCode) return;
    try {
      await deleteAsset(selectedCluster, selectedProject, selectedCode, "diagrams", index);

      // Invalidate all relevant queries to refresh both admin and public views
      await queryClient.invalidateQueries({
        queryKey: ["admin", "idfs", selectedCluster, selectedProject],
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin", "idf-detail", selectedCluster, selectedProject, selectedCode],
      });
      await queryClient.invalidateQueries({
        queryKey: ["/api", selectedCluster, selectedProject, "idfs", selectedCode],
      });

      toast({ title: "Diagram deleted successfully" });
    } catch (error) {
      console.error("Failed to delete diagram:", error);
      toast({
        title: "Error",
        description: "Failed to delete diagram",
        variant: "destructive",
      });
    }
  };
  const handleUploadDocuments = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!selectedCluster || !selectedProject || !selectedCode) return;

    setUploading(true);
    try {
      const filesArray = Array.from(files);
      const result = await uploadAssets(selectedCluster, selectedProject, selectedCode, filesArray, "documents");

      if (result?.documents) {
        // Use the documents returned by the API which include titles
        setDocuments(prev => [...prev, ...result.documents]);

        // Specifically invalidate the current IDF detail query
        await queryClient.invalidateQueries({
          queryKey: ["admin", "idf-detail", selectedCluster, selectedProject, selectedCode],
        });

        // Also invalidate public queries to refresh the documents tab
        await queryClient.invalidateQueries({
          queryKey: ["/api", selectedCluster, selectedProject, "idfs", selectedCode],
        });

        toast({
          title: "Documents uploaded successfully",
          description: `${files.length} file(s) uploaded. The documents will update automatically.`,
        });
      }
    } catch (error) {
      console.error("Error uploading documents:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };
  const handleUpdateDocumentTitle = async (index: number, newTitle: string) => {
    if (!selectedCluster || !selectedProject || !selectedCode) return;

    try {
      await updateDocumentTitle(selectedCluster, selectedProject, selectedCode, index, newTitle);

      // Update local state immediately
      setDocuments(prev => prev.map((doc, i) => 
        i === index ? { ...doc, title: newTitle } : doc
      ));

      // Invalidate ALL relevant queries to ensure complete refresh
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin", "idf-detail", selectedCluster, selectedProject, selectedCode],
        }),
        queryClient.invalidateQueries({
          queryKey: ["admin", "idfs", selectedCluster, selectedProject],
        }),
        queryClient.invalidateQueries({
          queryKey: ["/api", selectedCluster, selectedProject, "idfs", selectedCode],
        }),
      ]);

      // Force refetch the current IDF data
      await queryClient.refetchQueries({
        queryKey: ["/api", selectedCluster, selectedProject, "idfs", selectedCode],
      });

      // Trigger custom reload event for documents tab
      window.dispatchEvent(new CustomEvent("reloadDocumentsTab"));

      toast({
        title: "Document title updated",
        description: "Title has been updated successfully",
      });
    } catch (error) {
      console.error("Error updating document title:", error);
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleRemoveDocumentItem = async (index: number) => {
    if (!selectedCluster || !selectedProject || !selectedCode) return;

    try {
      await deleteAsset(selectedCluster, selectedProject, selectedCode, "documents", index);

      // Update local state
      setDocuments(prev => prev.filter((_, i) => i !== index));

      // Invalidate both the general list and specific IDF queries to refresh data
      await queryClient.invalidateQueries({
        queryKey: ["admin", "idfs", selectedCluster, selectedProject],
      });

      await queryClient.invalidateQueries({
        queryKey: ["admin", "idf-detail", selectedCluster, selectedProject, selectedCode],
      });

      // Also invalidate public queries to refresh the documents tab
      await queryClient.invalidateQueries({
        queryKey: ["/api", selectedCluster, selectedProject, "idfs", selectedCode],
      });

      // Trigger custom reload event for documents tab
      window.dispatchEvent(new CustomEvent("reloadDocumentsTab"));

      toast({
        title: "Document removed",
        description: "Document has been deleted successfully",
      });
    } catch (error) {
      console.error("Error removing document:", error);
      toast({
        title: "Remove failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // Function to reload the diagrams tab without a full page refresh
  const handleReloadDiagramsTab = () => {
    if (activeTab === "diagrams") {
      // Invalidate queries to refresh data without page reload
      queryClient.invalidateQueries({
        queryKey: ["admin", "idf-detail", selectedCluster, selectedProject, selectedCode],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api", selectedCluster, selectedProject, "idfs", selectedCode],
      });
    }
  };

  useEffect(() => {
    if (preloadIdf && isOpen) {
      setSelectedCluster(preloadIdf.cluster);
      setSelectedProject(preloadIdf.project);
      setSelectedCode(preloadIdf.code);
    }
  }, [isOpen, preloadIdf]);

  const projects = useMemo(
    () => getProjectsForCluster(selectedCluster),
    [selectedCluster],
  );

  useEffect(() => {
    if (
      projects.length > 0 &&
      !projects.some((project) => project.value === selectedProject)
    ) {
      setSelectedProject(projects[0].value);
    }
  }, [projects, selectedProject]);

  const idfsQuery = useQuery({
    queryKey: ["admin", "idfs", selectedCluster, selectedProject],
    queryFn: async () => {
      const response = await getIdfs(selectedCluster, selectedProject, {
        limit: 100,
        include_health: 0,
      });
      return response as IdfPublic[];
    },
    enabled: isOpen,
  });

  useEffect(() => {
    if (!selectedCode && idfsQuery.data && idfsQuery.data.length > 0) {
      setSelectedCode(idfsQuery.data[0].code);
    }
  }, [idfsQuery.data, selectedCode]);

  const idfDetailQuery = useQuery({
    queryKey: [
      "admin",
      "idf-detail",
      selectedCluster,
      selectedProject,
      selectedCode,
    ],
    queryFn: async () => {
      const detail = await getIdf(
        selectedCluster,
        selectedProject,
        selectedCode,
      );
      return detail as IdfPublic;
    },
    enabled: isOpen && Boolean(selectedCode),
  });

  // Function to refresh the selected IDF data
  const refreshSelectedIdf = () => {
    queryClient.invalidateQueries({
      queryKey: [
        "admin",
        "idf-detail",
        selectedCluster,
        selectedProject,
        selectedCode,
      ],
    });
  };

  useEffect(() => {
    if (idfDetailQuery.data) {
      const idf = idfDetailQuery.data;
      setGeneralForm({
        title: idf.title ?? "",
        description: idf.description ?? "",
        site: idf.site ?? "",
        room: idf.room ?? "",
      });

      // Normalize media arrays to handle both string and object formats
      const normalizeMediaArray = (items: any[]): MediaList => {
        return (items || []).map(item => {
          if (typeof item === 'string') {
            // Clean up malformed URLs - handle incomplete JSON strings
            let cleanUrl = item;

            // Handle malformed JSON-like strings
            if (item.includes("{'url':") || item.includes('{"url":')) {
              // Try to extract URL from malformed string
              const urlMatch = item.match(/['"](\/static\/[^'"]+)['"]/);
              if (urlMatch) {
                cleanUrl = urlMatch[1];
              } else {
                // If we can't extract URL, mark as invalid
                cleanUrl = '/static/invalid-url';
              }
            }

            // Convert absolute URLs to relative
            if (cleanUrl.includes('replit.dev/')) {
              const staticIndex = cleanUrl.indexOf('/static/');
              if (staticIndex !== -1) {
                cleanUrl = cleanUrl.substring(staticIndex);
              }
            }

            // Ensure it starts with /static/
            if (!cleanUrl.startsWith('/static/')) {
              cleanUrl = `/static/${cleanUrl.replace(/^\/+/, '')}`;
            }

            return { url: cleanUrl, name: '', kind: 'unknown' };
          }

          // Clean up object URLs too
          if (item.url) {
            let cleanUrl = item.url;

            if (cleanUrl.includes("{'url':") || cleanUrl.includes('{"url":')) {
              const urlMatch = cleanUrl.match(/['"](\/static\/[^'"]+)['"]/);
              if (urlMatch) {
                cleanUrl = urlMatch[1];
              }
            }

            // Convert absolute URLs to relative
            if (cleanUrl.includes('replit.dev/')) {
              const staticIndex = cleanUrl.indexOf('/static/');
              if (staticIndex !== -1) {
                cleanUrl = cleanUrl.substring(staticIndex);
              }
            }

            // Ensure it starts with /static/
            if (!cleanUrl.startsWith('/static/')) {
              cleanUrl = `/static/${cleanUrl.replace(/^\/+/, '')}`;
            }

            item.url = cleanUrl;
          }

          return item;
        });
      };

      setGallery(normalizeMediaArray(idf.images ?? []));
      setDocuments(normalizeMediaArray(idf.documents ?? []));
      setDiagrams(normalizeMediaArray(idf.diagrams ?? []));

      // Handle location as MediaItem object or string
      if (idf.location) {
        if (typeof idf.location === 'object' && idf.location.url) {
          // Location is already a MediaItem object
          setLocationItems([idf.location]);
        } else if (typeof idf.location === 'string') {
          // Location is a string path
          const cleanUrl = idf.location.startsWith('/static/') ? idf.location : `/static/${idf.location}`;
          setLocationItems([{
            url: cleanUrl,
            name: 'Location Image',
            kind: 'image'
          }]);
        } else {
          setLocationItems([]);
        }
      } else {
        setLocationItems([]);
      }

      // Handle DFO data properly, ensuring names are preserved
      const dfoData = idf.dfo ?? [];
      const normalizedDfo = Array.isArray(dfoData) ? dfoData.map(item => {
        if (typeof item === 'string') return { url: item, name: 'DFO', kind: 'diagram' };
        if (typeof item === 'object' && item.url) return { ...item, name: item.name || 'DFO' };
        return { url: '', name: 'DFO', kind: 'diagram' };
      }) : [];
      setDfo(normalizedDfo);
      setTableData(idf.table ?? null);
      setLogoPreview(idf.media?.logo?.url ?? null);
    }
  }, [idfDetailQuery.data]);

  const closeSidebar = () => {
    setActiveTab("general");
    onClose();
  };

  const refreshIdf = () => {
    queryClient.invalidateQueries({
      queryKey: [
        "admin",
        "idf-detail",
        selectedCluster,
        selectedProject,
        selectedCode,
      ],
    });
    queryClient.invalidateQueries({
      queryKey: ["admin", "idfs", selectedCluster, selectedProject],
    });
  };

  const handleSaveGeneral = async () => {
    if (!selectedCode || !idfDetailQuery.data) return;
    try {
      // Only send the general form fields - no media fields at all
      await updateIdf(selectedCluster, selectedProject, selectedCode, {
        title: generalForm.title,
        description: generalForm.description,
        site: generalForm.site,
        room: generalForm.room,
      });
      toast({ title: "IDF updated", description: "General information saved" });
      refreshIdf();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Unable to save changes",
        variant: "destructive",
      });
    }
  };

  const handleUploadAsset = async (
    type: "images" | "documents" | "diagrams" | "location",
    files: FileList | null,
  ) => {
    if (!files || !selectedCode) return;
    try {
      if (type === "location") {
        // Location only supports single file
        const file = files[0];
        await uploadAsset(
          selectedCluster,
          selectedProject,
          selectedCode,
          file,
          type,
        );

        // Invalidate all relevant queries to refresh both admin and public views
        await queryClient.invalidateQueries({
          queryKey: ["admin", "idfs", selectedCluster, selectedProject],
        });
        await queryClient.invalidateQueries({
          queryKey: ["admin", "idf-detail", selectedCluster, selectedProject, selectedCode],
        });
        await queryClient.invalidateQueries({
          queryKey: ["/api", selectedCluster, selectedProject, "idfs", selectedCode],
        });

        toast({
          title: "Location uploaded successfully",
          description: "Location image uploaded and updated automatically",
        });
      } else {
        // Multiple files for other types
        for (const file of Array.from(files)) {
          await uploadAsset(
            selectedCluster,
            selectedProject,
            selectedCode,
            file,
            type,
          );
        }
        toast({
          title: "Upload complete",
          description: `Uploaded ${files.length} file(s)`,
        });
        refreshIdf();
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Upload failed",
        description: "Could not upload files",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAsset = async (
    type: "images" | "documents" | "diagrams" | "location",
    index: number,
  ) => {
    if (!selectedCode) return;
    try {
      await deleteAsset(
        selectedCluster,
        selectedProject,
        selectedCode,
        type,
        index,
      );

      // For location deletions, invalidate all relevant queries
      if (type === "location") {
        await queryClient.invalidateQueries({
          queryKey: ["admin", "idfs", selectedCluster, selectedProject],
        });
        await queryClient.invalidateQueries({
          queryKey: ["admin", "idf-detail", selectedCluster, selectedProject, selectedCode],
        });
        await queryClient.invalidateQueries({
          queryKey: ["/api", selectedCluster, selectedProject, "idfs", selectedCode],
        });
        toast({ title: "Location image removed successfully" });
      } else {
        toast({ title: "Asset removed" });
        refreshIdf();
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Removal failed",
        description: "Could not remove asset",
        variant: "destructive",
      });
    }
  };

  const handleUploadLogo = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedCode) {
      console.log("No files selected or no IDF code");
      return;
    }
    try {
      const file = files[0];
      console.log("Uploading logo file:", file.name, file.type, file.size);
      await uploadIdfLogo(selectedCluster, selectedProject, selectedCode, file);
      toast({ title: "Logo updated" });
      refreshIdf();
    } catch (error) {
      console.error("Logo upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Could not upload logo",
        variant: "destructive",
      });
    }
  };

  const handleUploadDfo = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedCluster || !selectedProject || !selectedCode) return;

    try {
      setUploading(true);
      const result = await uploadAsset( // Changed from uploadAssets to uploadAsset
        selectedCluster,
        selectedProject,
        selectedCode,
        files[0], // Assuming uploadAsset handles single file, adjust if it takes array
        "dfo"
      );

      if (result) {
        // Invalidate both the general list and specific IDF queries to refresh data
        await queryClient.invalidateQueries({
          queryKey: ["admin", "idfs", selectedCluster, selectedProject],
        });

        // Specifically invalidate the current IDF detail query
        await queryClient.invalidateQueries({
          queryKey: ["admin", "idf-detail", selectedCluster, selectedProject, selectedCode],
        });

        // Also invalidate public queries to refresh the DFO tab
        await queryClient.invalidateQueries({
          queryKey: ["/api", selectedCluster, selectedProject, "idfs", selectedCode],
        });

        toast({
          title: "DFO uploaded successfully",
          description: `${files.length} file(s) uploaded. The diagram will update automatically.`,
        });
      }
    } catch (error) {
      console.error("Error uploading DFO:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveDfoItem = async (index: number) => {
    if (!selectedCluster || !selectedProject || !selectedCode) return;

    try {
      await deleteAsset(selectedCluster, selectedProject, selectedCode, "dfo", index);

      // Update local state
      setDfo(prev => prev.filter((_, i) => i !== index));

      // Invalidate both the general list and specific IDF queries to refresh data
      await queryClient.invalidateQueries({
        queryKey: ["admin", "idfs", selectedCluster, selectedProject],
      });

      // Specifically invalidate the current IDF detail query
      await queryClient.invalidateQueries({
        queryKey: ["admin", "idf-detail", selectedCluster, selectedProject, selectedCode],
      });

      // Also invalidate public queries to refresh the DFO tab
      await queryClient.invalidateQueries({
        queryKey: ["/api", selectedCluster, selectedProject, "idfs", selectedCode],
      });

      toast({
        title: "DFO item removed",
        description: "File has been deleted successfully. The diagram will update automatically.",
      });
    } catch (error) {
      console.error("Error removing DFO item:", error);
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDfo = async (index: number) => {
    if (!selectedCode) return;
    try {
      await deleteAsset(selectedCluster, selectedProject, selectedCode, "dfo", index);
      toast({ title: "DFO deleted successfully" });
      refreshSelectedIdf();
    } catch (error) {
      console.error("Failed to delete DFO:", error);
      toast({
        title: "Error",
        description: "Failed to delete DFO file",
        variant: "destructive",
      });
    }
  };

  const handleUploadGallery = async (files: FileList | null) => {
    if (!files || !selectedCode) return;
    try {
      const fileArray = Array.from(files);
      await uploadAssets(selectedCluster, selectedProject, selectedCode, fileArray, "images");

      // Invalidate all relevant queries to refresh both admin and public views
      await queryClient.invalidateQueries({
        queryKey: ["admin", "idfs", selectedCluster, selectedProject],
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin", "idf-detail", selectedCluster, selectedProject, selectedCode],
      });
      await queryClient.invalidateQueries({
        queryKey: ["/api", selectedCluster, selectedProject, "idfs", selectedCode],
      });

      toast({
        title: "Gallery updated",
        description: `Uploaded ${fileArray.length} image(s) successfully`,
      });
    } catch (error) {
      console.error("Failed to upload gallery images:", error);
      toast({
        title: "Error",
        description: "Failed to upload images",
        variant: "destructive",
      });
    }
  };

  const handleDeleteGalleryImage = async (index: number) => {
    if (!selectedCode) return;
    try {
      await deleteAsset(selectedCluster, selectedProject, selectedCode, "images", index);

      // Invalidate all relevant queries to refresh both admin and public views
      await queryClient.invalidateQueries({
        queryKey: ["admin", "idfs", selectedCluster, selectedProject],
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin", "idf-detail", selectedCluster, selectedProject, selectedCode],
      });
      await queryClient.invalidateQueries({
        queryKey: ["/api", selectedCluster, selectedProject, "idfs", selectedCode],
      });

      toast({ title: "Image deleted successfully" });
    } catch (error) {
      console.error("Failed to delete gallery image:", error);
      toast({
        title: "Error",
        description: "Failed to delete image",
        variant: "destructive",
      });
    }
  };

  if (!isOpen || !isAdmin) {
    return null;
  }

  const idfList = idfsQuery.data ?? [];
  const detail = idfDetailQuery.data;

  return (
    <TooltipProvider>
      <div
        className={`fixed inset-0 z-50 flex transition-all duration-300 ${isExpanded ? "w-full" : "w-auto"}`}
      >
        <div
          className={`fixed inset-0 bg-black/40 transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0"}`}
          onClick={isExpanded ? closeSidebar : undefined}
        />
        <aside
          className={`relative flex h-full flex-col bg-background shadow-xl transition-all duration-300 ${isExpanded ? "ml-0 w-full" : "ml-auto w-full max-w-3xl"}`}
        >
          <header className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold">Admin Panel</h2>
              <p className="text-sm text-muted-foreground">
                Manage IDF content and assets
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsExpanded((prev) => !prev)}
                  >
                    <i
                      className={`${isExpanded ? "fa fa-compress" : "fa fa-expand"} text-sm`}
                    ></i>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {isExpanded ? "Collapse Panel" : "Expand Panel"}
                </TooltipContent>
              </Tooltip>
              <Button variant="ghost" size="icon" onClick={closeSidebar}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </header>

          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Cluster</Label>
                  <select
                    value={selectedCluster}
                    onChange={(event) => {
                      setSelectedCluster(event.target.value);
                      setSelectedCode("");
                    }}
                    className="w-full rounded border border-border bg-input px-3 py-2 text-sm"
                  >
                    {config.clusters.available.map((cluster) => (
                      <option key={cluster} value={cluster}>
                        {cluster}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Project</Label>
                  <select
                    value={selectedProject}
                    onChange={(event) => {
                      setSelectedProject(event.target.value);
                      setSelectedCode("");
                    }}
                    className="w-full rounded border border-border bg-input px-3 py-2 text-sm"
                  >
                    {projects.map((project) => (
                      <option key={project.value} value={project.value}>
                        {project.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>IDF</Label>
                  <select
                    value={selectedCode}
                    onChange={(event) => setSelectedCode(event.target.value)}
                    className="w-full rounded border border-border bg-input px-3 py-2 text-sm"
                  >
                    <option value="" disabled>
                      Select IDF
                    </option>
                    {idfList.map((idf) => (
                      <option key={idf.code} value={idf.code}>
                        {idf.code} — {idf.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {detail ? (
                <Tabs
                  value={activeTab}
                  onValueChange={(value) => {
                    setActiveTab(value as TabValue);
                    handleReloadDiagramsTab(); // Ensure reload logic runs on tab change
                  }}
                  className="admin-tabs tabpaneladmin"
                >
                  <TabsList className="admin-tabs grid w-full grid-cols-6 gap-1 h-auto p-1">
                    {TABS.map((tab) => (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="text-xs px-1.5 py-2 min-w-0 tab-trigger whitespace-nowrap"
                      >
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  <TabsContent value="general" className="space-y-4 ">
                    <Card>
                      <CardHeader>
                        <CardTitle>General information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div>
                            <Label htmlFor="idf-title">Title</Label>
                            <Input
                              id="idf-title"
                              value={generalForm.title}
                              onChange={(event) =>
                                setGeneralForm((prev) => ({
                                  ...prev,
                                  title: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="idf-site">Site</Label>
                            <Input
                              id="idf-site"
                              value={generalForm.site}
                              onChange={(event) =>
                                setGeneralForm((prev) => ({
                                  ...prev,
                                  site: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="idf-room">Room</Label>
                            <Input
                              id="idf-room"
                              value={generalForm.room}
                              onChange={(event) =>
                                setGeneralForm((prev) => ({
                                  ...prev,
                                  room: event.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="idf-description">Description</Label>
                          <Textarea
                            id="idf-description"
                            rows={4}
                            value={generalForm.description}
                            onChange={(event) =>
                              setGeneralForm((prev) => ({
                                ...prev,
                                description: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="flex justify-end">
                          <Button onClick={handleSaveGeneral}>
                            <Save className="mr-2 h-4 w-4" /> Save changes
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="dfo" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Logo</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <LogoWidget
                          cluster={selectedCluster}
                          project={selectedProject}
                          code={selectedCode}
                          currentLogo={detail?.media?.logo}
                          idfLogo={detail?.logo}
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>DFO</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Upload DFO diagrams and documents
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="dfo-upload">Upload files</Label>
                          <Input
                            id="dfo-upload"
                            type="file"
                            accept="image/*,application/pdf"
                            multiple
                            onChange={(event) => handleUploadDfo(event.target.files)}
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {dfo.map((item, index) => {
                            const isImage = item.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                            const isPdf = item.url?.match(/\.pdf$/i);

                            return (
                              <div
                                key={index}
                                className="flex items-start space-x-3 rounded border border-border p-3"
                              >
                                <div className="flex-shrink-0">
                                  {isImage ? (
                                    <img
                                      src={item.url}
                                      alt={item.name || `DFO ${index + 1}`}
                                      className="w-16 h-16 object-cover rounded border border-border"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        target.nextElementSibling!.style.display = 'flex';
                                      }}
                                    />
                                  ) : (
                                    <div className="w-16 h-16 flex items-center justify-center bg-muted rounded border border-border">
                                      <i className="fas fa-file-pdf text-red-500"></i>
                                    </div>
                                  )}
                                  <div className="hidden w-16 h-16 flex items-center justify-center bg-muted rounded border border-border">
                                    <i className="fas fa-exclamation-triangle text-yellow-500"></i>
                                  </div>
                                </div>

                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      {isImage && <i className="fas fa-image text-blue-500"></i>}
                                      {isPdf && <i className="fas fa-file-pdf text-red-500"></i>}
                                      <span className="text-sm font-medium">DFO {index + 1}</span>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveDfoItem(index)}
                                    >
                                      Remove
                                    </Button>
                                  </div>

                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="gallery" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Gallery images</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Upload high quality images for the gallery
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="gallery-upload">Upload files</Label>
                          <Input
                            id="gallery-upload"
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(event) =>
                              handleUploadGallery(event.target.files)
                            }
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {gallery.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center space-x-3 p-3 border rounded-lg"
                            >
                              <img
                                src={typeof item === 'string' ? item : item.url}
                                alt={`Gallery ${index + 1}`}
                                className="w-16 h-16 object-cover rounded"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.nextElementSibling!.style.display = 'flex';
                                }}
                              />
                              <div className="hidden w-16 h-16 flex items-center justify-center bg-muted rounded border border-border">
                                <i className="fas fa-exclamation-triangle text-yellow-500"></i>
                              </div>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">Gallery Image {index + 1}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveGalleryItem(index)}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="location" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Location</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Upload blueprints or location photos
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="location-upload">Upload location image</Label>
                          <Input
                            id="location-upload"
                            type="file"
                            accept="image/*"
                            onChange={(event) =>
                              handleUploadLocation(event.target.files)
                            }
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {locationItems.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-start space-x-3 rounded border border-border p-3"
                            >
                              <div className="flex-shrink-0">
                                <img
                                  src={item.url}
                                  alt={item.name || `Location image ${index + 1}`}
                                  className="w-16 h-16 object-cover rounded border border-border"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.nextElementSibling!.style.display = 'flex';
                                  }}
                                />
                                <div className="hidden w-16 h-16 flex items-center justify-center bg-muted rounded border border-border">
                                  <i className="fas fa-exclamation-triangle text-yellow-500"></i>
                                </div>
                              </div>

                              <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">Location Image {index + 1}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveLocationItem(index)}
                                  >
                                    Remove
                                  </Button>
                                </div>
                                <div>
                                  <Label htmlFor={`location-name-${index}`} className="text-xs">Display Name</Label>
                                  <Input
                                    id={`location-name-${index}`}
                                    value={item.name || ''}
                                    onChange={(e) => {
                                      const newLocationItems = [...locationItems];
                                      newLocationItems[index] = { ...item, name: e.target.value };
                                      setLocationItems(newLocationItems);
                                    }}
                                    placeholder="Enter location name"
                                    className="text-xs"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="diagrams" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Diagrams</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Upload network diagrams
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="diagrams-upload">Upload files</Label>
                          <Input
                            id="diagrams-upload"
                            type="file"
                            accept="image/*,application/pdf"
                            multiple
                            onChange={(event) =>
                              handleUploadDiagrams(event.target.files)
                            }
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {diagrams.map((item, index) => {
                            const isImage = item.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                            const isPdf = item.url?.match(/\.pdf$/i);

                            return (
                              <div
                                key={index}
                                className="flex items-start space-x-3 rounded border border-border p-3"
                              >
                                <div className="flex-shrink-0">
                                  {isImage ? (
                                    <img
                                      src={item.url}
                                      alt={item.name || `Diagram ${index + 1}`}
                                      className="w-16 h-16 object-cover rounded border border-border"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        target.nextElementSibling!.style.display = 'flex';
                                      }}
                                    />
                                  ) : (
                                    <div className="w-16 h-16 flex items-center justify-center bg-muted rounded border border-border">
                                      <i className="fas fa-file-pdf text-red-500"></i>
                                    </div>
                                  )}
                                  <div className="hidden w-16 h-16 flex items-center justify-center bg-muted rounded border border-border">
                                    <i className="fas fa-exclamation-triangle text-yellow-500"></i>
                                  </div>
                                </div>

                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      {isImage && <i className="fas fa-image text-blue-500"></i>}
                                      {isPdf && <i className="fas fa-file-pdf text-red-500"></i>}
                                      <span className="text-sm font-medium">Diagram {index + 1}</span>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveDiagramItem(index)}
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="documents" className="space-y-4">
                    <AssetSection
                      title="Documents"
                      description="Upload related documentation"
                      items={documents}
                      onUpload={(files) =>
                        handleUploadDocuments(files)
                      }
                      onDelete={(index) =>
                        handleRemoveDocumentItem(index)
                      }
                      onUpdateTitle={(index, title) =>
                        handleUpdateDocumentTitle(index, title)
                      }
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                      allowTitleEdit={true}
                    />
                  </TabsContent>
                </Tabs>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select an IDF to begin editing.
                </p>
              )}
            </div>
          </ScrollArea>
        </aside>
      </div>
    </TooltipProvider>
  );
}

interface AssetSectionProps {
  title: string;
  description: string;
  items: MediaItem[];
  onUpload: (files: FileList | null) => void;
  onDelete: (index: number) => void;
  onUpdateTitle?: (index: number, title: string) => void;
  accept: string;
  allowTitleEdit?: boolean;
}

function AssetSection({
  title,
  description,
  items,
  onUpload,
  onDelete,
  onUpdateTitle,
  accept,
  allowTitleEdit = false,
}: AssetSectionProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const handleStartEditing = (index: number, currentTitle: string) => {
    setEditingIndex(index);
    setEditingTitle(currentTitle || "");
  };

  const handleSaveTitle = async (index: number) => {
    if (onUpdateTitle && editingTitle.trim()) {
      await onUpdateTitle(index, editingTitle.trim());
    }
    setEditingIndex(null);
    setEditingTitle("");
  };

  const handleCancelEditing = () => {
    setEditingIndex(null);
    setEditingTitle("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="mb-2 block">Upload files</Label>
          <Input
            type="file"
            accept={accept}
            multiple
            onChange={(event) => onUpload(event.target.files)}
          />
        </div>
        <div className="space-y-2">
          {items && items.length > 0 ? (
            items.map((item, index) => (
              <div
                key={`${item.url}-${index}`}
                className="flex items-center justify-between rounded border border-border px-3 py-2 text-sm"
              >
                <div className="flex items-center space-x-2 flex-1">
                  {item.kind === "document" ? (
                    <FileIcon className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <ImageIcon className="h-4 w-4 flex-shrink-0" />
                  )}
                  <div className="flex flex-col flex-1 min-w-0">
                    {allowTitleEdit && editingIndex === index ? (
                      <div className="flex items-center space-x-2 w-full">
                        <Input
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveTitle(index);
                            } else if (e.key === 'Escape') {
                              handleCancelEditing();
                            }
                          }}
                          className="text-xs h-8 flex-1"
                          placeholder="Enter title"
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSaveTitle(index)}
                          className="h-8 px-2"
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEditing}
                          className="h-8 px-2"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium truncate">
                            {item.title || item.name || `Document ${index + 1}`}
                          </span>
                          {allowTitleEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartEditing(index, item.title || item.name || "")}
                              className="h-6 px-2 text-xs opacity-60 hover:opacity-100"
                            >
                              Edit
                            </Button>
                          )}
                        </div>
                        {item.title && item.name && item.title !== item.name && (
                          <span className="text-xs text-muted-foreground truncate">{item.name}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {editingIndex !== index && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(index)}
                    className="flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No assets uploaded.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}