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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  deleteAsset,
  getIdf,
  getIdfs,
  MediaPayload,
  updateIdf,
  uploadAsset,
  uploadIdfLogo,
} from "@/lib/api";
import { config, getProjectsForCluster } from "../config";
import type { IdfPublic, MediaItem } from "@shared/schema";

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

type MediaList = MediaPayload[];

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
  const [dfo, setDfo] = useState<MediaPayload | null>(null);
  const [tableData, setTableData] = useState<any>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Mock handlers for upload/delete for each section
  const handleUploadGallery = (files: FileList | null) => handleUploadAsset("images", files);
  const handleRemoveGallery = (index: number) => handleDeleteAsset("images", index);
  const handleUploadLocation = (files: FileList | null) => handleUploadAsset("location", files);
  const handleRemoveLocation = (index: number) => handleDeleteAsset("location", index);
  const handleUploadDiagrams = (files: FileList | null) => handleUploadAsset("diagram", files);
  const handleRemoveDiagram = (index: number) => handleDeleteAsset("diagrams", index);

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

  useEffect(() => {
    if (idfDetailQuery.data) {
      const idf = idfDetailQuery.data;
      setGeneralForm({
        title: idf.title ?? "",
        description: idf.description ?? "",
        site: idf.site ?? "",
        room: idf.room ?? "",
      });
      setGallery(idf.gallery ?? []);
      setDocuments(idf.documents ?? []);
      setDiagrams(idf.diagrams ?? []);
      const locations =
        idf.location_items ?? (idf.location ? [idf.location] : []);
      setLocationItems(locations ?? []);
      setDfo(idf.dfo ?? null);
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
      await updateIdf(selectedCluster, selectedProject, selectedCode, {
        title: generalForm.title,
        description: generalForm.description,
        site: generalForm.site,
        room: generalForm.room,
        gallery,
        documents,
        diagrams,
        location: locationItems,
        dfo,
        table: tableData,
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
    type: "images" | "documents" | "diagram" | "location",
    files: FileList | null,
  ) => {
    if (!files || !selectedCode) return;
    try {
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
      toast({ title: "Asset removed" });
      refreshIdf();
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
    if (!files || !selectedCode) return;
    try {
      const file = files[0];
      await uploadIdfLogo(selectedCluster, selectedProject, selectedCode, file);
      toast({ title: "Logo updated" });
      refreshIdf();
    } catch (error) {
      console.error(error);
      toast({
        title: "Upload failed",
        description: "Could not upload logo",
        variant: "destructive",
      });
    }
  };

  const handleUploadDfo = async (files: FileList | null) => {
    if (!files || !selectedCode) return;
    const file = files[0];
    try {
      const previousDiagramCount = diagrams.length;
      const result = await uploadAsset(
        selectedCluster,
        selectedProject,
        selectedCode,
        file,
        "diagram",
      );
      try {
        await deleteAsset(
          selectedCluster,
          selectedProject,
          selectedCode,
          "diagrams",
          previousDiagramCount,
        );
      } catch (error) {
        console.warn("Failed to clean temporary DFO diagram", error);
      }
      await updateIdf(selectedCluster, selectedProject, selectedCode, {
        title: generalForm.title,
        description: generalForm.description,
        site: generalForm.site,
        room: generalForm.room,
        gallery,
        documents,
        diagrams,
        location: locationItems,
        dfo: { url: (result as any).url, name: file.name, kind: "diagram" },
        table: tableData,
      });
      toast({ title: "DFO updated" });
      refreshIdf();
    } catch (error) {
      console.error(error);
      toast({
        title: "DFO upload failed",
        description: "Could not upload DFO",
        variant: "destructive",
      });
    }
  };

  const handleRemoveDfo = async () => {
    if (!selectedCode) return;
    try {
      await updateIdf(selectedCluster, selectedProject, selectedCode, {
        title: generalForm.title,
        description: generalForm.description,
        site: generalForm.site,
        room: generalForm.room,
        gallery,
        documents,
        diagrams,
        location: locationItems,
        dfo: null,
        table: tableData,
      });
      toast({ title: "DFO removed" });
      refreshIdf();
    } catch (error) {
      console.error(error);
      toast({
        title: "Unable to remove DFO",
        description: "Please try again",
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
                  onValueChange={(value) => setActiveTab(value as TabValue)}
                  className="admin-tabs tabpaneladmin"
                >
                  <TabsList className="grid grid-cols-6 w-full gap-1 h-auto p-1">
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
                        {logoPreview ? (
                          <img
                            src={logoPreview}
                            alt="IDF logo"
                            className="h-20 w-20 rounded border border-border object-contain"
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No logo uploaded
                          </p>
                        )}
                        <div>
                          <Label htmlFor="idf-logo-upload">Upload logo</Label>
                          <Input
                            id="idf-logo-upload"
                            type="file"
                            accept="image/*"
                            onChange={(event) =>
                              handleUploadLogo(event.target.files)
                            }
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>DFO</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {dfo ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between rounded border border-border px-3 py-2 text-sm">
                              <span>{dfo.name ?? dfo.url}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleRemoveDfo}
                              >
                                Remove
                              </Button>
                            </div>
                            {/* DFO Preview */}
                            <div className="mt-3">
                              <Label className="text-sm font-medium">Preview</Label>
                              <div className="mt-2 rounded border border-border overflow-hidden">
                                {dfo.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                  <img
                                    src={dfo.url}
                                    alt={dfo.name || 'DFO Preview'}
                                    className="w-full h-48 object-contain bg-muted"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      target.nextElementSibling!.style.display = 'flex';
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-48 flex items-center justify-center bg-muted">
                                    <div className="text-center">
                                      <i className="fas fa-file-pdf text-4xl text-red-500 mb-2"></i>
                                      <p className="text-sm text-muted-foreground">PDF Document</p>
                                    </div>
                                  </div>
                                )}
                                <div className="hidden w-full h-48 flex items-center justify-center bg-muted">
                                  <div className="text-center">
                                    <i className="fas fa-exclamation-triangle text-4xl text-yellow-500 mb-2"></i>
                                    <p className="text-sm text-muted-foreground">Preview not available</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No DFO associated
                          </p>
                        )}
                        <div>
                          <Label htmlFor="dfo-upload">Upload new DFO</Label>
                          <Input
                            id="dfo-upload"
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(event) =>
                              handleUploadDfo(event.target.files)
                            }
                          />
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
                              className="flex items-center justify-between rounded border border-border p-3"
                            >
                              <div className="flex items-center space-x-3">
                                <img
                                  src={item.url}
                                  alt={item.name || `Gallery image ${index + 1}`}
                                  className="h-16 w-16 rounded object-cover border border-border"
                                  onError={(e) => {
                                    // Fallback to icon if image fails to load
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.nextElementSibling!.style.display = 'flex';
                                  }}
                                />
                                <div className="hidden h-16 w-16 items-center justify-center rounded border border-border bg-muted">
                                  <i className="fas fa-image text-blue-500"></i>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">{item.name ?? item.url}</span>
                                  <span className="text-xs text-muted-foreground">Gallery Image</span>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveGallery(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
                          <Label htmlFor="location-upload">Upload files</Label>
                          <Input
                            id="location-upload"
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(event) =>
                              handleUploadLocation(event.target.files)
                            }
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {locationItems.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between rounded border border-border p-3"
                            >
                              <div className="flex items-center space-x-3">
                                <img
                                  src={item.url}
                                  alt={item.name || `Location image ${index + 1}`}
                                  className="h-16 w-16 rounded object-cover border border-border"
                                  onError={(e) => {
                                    // Fallback to icon if image fails to load
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.nextElementSibling!.style.display = 'flex';
                                  }}
                                />
                                <div className="hidden h-16 w-16 items-center justify-center rounded border border-border bg-muted">
                                  <i className="fas fa-map-marker-alt text-red-500"></i>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">{item.name ?? item.url}</span>
                                  <span className="text-xs text-muted-foreground">Location Photo</span>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveLocation(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
                            const isImage = item.url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                            const isPdf = item.url.match(/\.pdf$/i);

                            return (
                              <div
                                key={index}
                                className="flex items-center justify-between rounded border border-border p-3"
                              >
                                <div className="flex items-center space-x-3">
                                  {isImage ? (
                                    <img
                                      src={item.url}
                                      alt={item.name || `Diagram ${index + 1}`}
                                      className="h-16 w-16 rounded object-cover border border-border"
                                      onError={(e) => {
                                        // Fallback to icon if image fails to load
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        target.nextElementSibling!.style.display = 'flex';
                                      }}
                                    />
                                  ) : (
                                    <div className="h-16 w-16 flex items-center justify-center rounded border border-border bg-muted">
                                      <i className={`fas ${isPdf ? 'fa-file-pdf text-red-500' : 'fa-project-diagram text-green-500'} text-xl`}></i>
                                    </div>
                                  )}
                                  <div className="hidden h-16 w-16 items-center justify-center rounded border border-border bg-muted">
                                    <i className="fas fa-project-diagram text-green-500"></i>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium">{item.name ?? item.url}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {isPdf ? 'PDF Diagram' : 'Network Diagram'}
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveDiagram(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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
                        handleUploadAsset("documents", files)
                      }
                      onDelete={(index) =>
                        handleDeleteAsset("documents", index)
                      }
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
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
  accept: string;
}

function AssetSection({
  title,
  description,
  items,
  onUpload,
  onDelete,
  accept,
}: AssetSectionProps) {
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
                <div className="flex items-center space-x-2">
                  {item.kind === "document" ? (
                    <FileIcon className="h-4 w-4" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                  <span>{item.name ?? item.url}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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