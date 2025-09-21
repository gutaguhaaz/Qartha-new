import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  createIdf,
  deleteAsset,
  IdfCreatePayload,
  uploadAsset,
  uploadIdfLogo,
  updateIdf,
} from "@/lib/api";

const CODE_PATTERN = /^IDF-\d{4}$/i;

const steps = [
  { value: "basic", label: "General" },
  { value: "dfo", label: "Fiber / DFO" },
  { value: "location", label: "Location" },
  { value: "gallery", label: "Gallery" },
  { value: "diagrams", label: "Diagrams" },
  { value: "documents", label: "Documents" },
] as const;
type Step = (typeof steps)[number]["value"];

interface AddIdfDialogProps {
  cluster: string;
  project: string;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreated?: (idf: any) => void;
}

interface UploadQueue {
  dfo: File | null;
  location: File[];
  gallery: File[];
  diagrams: File[];
  documents: File[];
  logo: File | null;
}

const emptyQueue: UploadQueue = {
  dfo: null,
  location: [],
  gallery: [],
  diagrams: [],
  documents: [],
  logo: null,
};

export default function AddIdfDialog({
  cluster,
  project,
  disabled,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onCreated,
}: AddIdfDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const [step, setStep] = useState<Step>("basic");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [formValues, setFormValues] = useState<IdfCreatePayload>({
    code: "",
    title: "",
    site: "",
    room: "",
    description: "",
  });

  const [uploadQueue, setUploadQueue] = useState<UploadQueue>(emptyQueue);

  const isLastStep = useMemo(() => step === steps[steps.length - 1].value, [step]);

  const goToNextStep = () => {
    const currentIndex = steps.findIndex((item) => item.value === step);
    const next = steps[currentIndex + 1];
    if (next) {
      setStep(next.value);
    }
  };

  const goToPreviousStep = () => {
    const currentIndex = steps.findIndex((item) => item.value === step);
    const prev = steps[currentIndex - 1];
    if (prev) {
      setStep(prev.value);
    }
  };

  const resetState = () => {
    setFormValues({ code: "", title: "", site: "", room: "", description: "" });
    setUploadQueue(emptyQueue);
    setStep("basic");
    setError(null);
  };

  const handleFileSelection = (key: keyof UploadQueue, files: FileList | null) => {
    if (!files) return;
    setUploadQueue((prev) => ({
      ...prev,
      [key]: key === "dfo" || key === "logo"
        ? files[0]
        : [...(Array.isArray(prev[key]) ? (prev[key] as File[]) : []), ...Array.from(files)],
    }));
  };

  const handleRemoveFile = (key: keyof UploadQueue, index: number) => {
    setUploadQueue((prev) => {
      if (key === "dfo" || key === "logo") {
        return { ...prev, [key]: null };
      }
      const updated = [...((prev[key] as File[]) || [])];
      updated.splice(index, 1);
      return { ...prev, [key]: updated };
    });
  };

  const handleCreate = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      if (!CODE_PATTERN.test(formValues.code.trim())) {
        throw new Error("Code must follow the pattern IDF-0000");
      }

      if (!formValues.title.trim() || !formValues.site.trim()) {
        throw new Error("Title and Site are required");
      }

      const payload: IdfCreatePayload = {
        ...formValues,
        code: formValues.code.trim().toUpperCase(),
        title: formValues.title.trim(),
        site: formValues.site.trim(),
        room: formValues.room?.trim() || undefined,
        description: formValues.description?.trim() || undefined,
      };

      const created = await createIdf(cluster, project, payload);

      if (uploadQueue.logo) {
        await uploadIdfLogo(cluster, project, payload.code, uploadQueue.logo);
      }

      if (uploadQueue.dfo) {
        const result = await uploadAsset(cluster, project, payload.code, uploadQueue.dfo, "diagram");
        try {
          await deleteAsset(cluster, project, payload.code, "diagrams", 0);
        } catch (removeError) {
          console.warn("Failed to remove temporary DFO diagram", removeError);
        }
        await updateIdf(cluster, project, payload.code, {
          title: payload.title,
          description: payload.description,
          site: payload.site,
          room: payload.room,
          gallery: [],
          documents: [],
          diagrams: [],
          location: [],
          dfo: {
            url: result.url,
            name: uploadQueue.dfo.name,
            kind: "diagram",
          },
          table: null,
        });
      }

      for (const file of uploadQueue.location) {
        await uploadAsset(cluster, project, payload.code, file, "location");
      }

      for (const file of uploadQueue.gallery) {
        await uploadAsset(cluster, project, payload.code, file, "images");
      }

      for (const file of uploadQueue.diagrams) {
        await uploadAsset(cluster, project, payload.code, file, "diagram");
      }

      for (const file of uploadQueue.documents) {
        await uploadAsset(cluster, project, payload.code, file, "documents");
      }

      toast({ title: "IDF created", description: `${payload.code} was created successfully.` });
      onCreated?.(created);
      resetState();
      setOpen(false);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to create IDF");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFileList = (key: keyof UploadQueue) => {
    const files = uploadQueue[key];
    if (!files || (Array.isArray(files) && files.length === 0)) {
      return <p className="text-sm text-muted-foreground">No files selected</p>;
    }

    if (files instanceof File) {
      return (
        <div className="flex items-center justify-between rounded border border-border px-3 py-2 text-sm">
          <span>{files.name}</span>
          <Button variant="ghost" size="sm" onClick={() => handleRemoveFile(key, 0)}>
            Remove
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {files.map((file, index) => (
          <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded border border-border px-3 py-2 text-sm">
            <span>{file.name}</span>
            <Button variant="ghost" size="sm" onClick={() => handleRemoveFile(key, index)}>
              Remove
            </Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) resetState(); }}>
      {!controlledOpen && (
        <DialogTrigger asChild>
          <Button size="sm" disabled={disabled}>
            Create IDF
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New IDF wizard</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Tabs value={step} onValueChange={(value) => setStep(value as Step)}>
            <TabsList className="grid grid-cols-3 lg:grid-cols-6 gap-2">
              {steps.map((item) => (
                <TabsTrigger key={item.value} value={item.value} className="text-xs">
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div>
                <Label htmlFor="idf-code">Code</Label>
                <Input
                  id="idf-code"
                  value={formValues.code}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, code: e.target.value }))}
                  placeholder="IDF-0000"
                />
                <p className="text-xs text-muted-foreground mt-1">Format: IDF-0000</p>
              </div>
              <div>
                <Label htmlFor="idf-title">Title</Label>
                <Input
                  id="idf-title"
                  value={formValues.title}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="idf-site">Site</Label>
                  <Input
                    id="idf-site"
                    value={formValues.site}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, site: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="idf-room">Room</Label>
                  <Input
                    id="idf-room"
                    value={formValues.room ?? ""}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, room: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="idf-description">Description</Label>
                <Textarea
                  id="idf-description"
                  value={formValues.description ?? ""}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, description: e.target.value }))}
                  rows={4}
                />
              </div>
            </TabsContent>

            <TabsContent value="dfo" className="space-y-4">
              <div>
                <Label htmlFor="idf-logo">IDF logo (optional)</Label>
                <Input
                  id="idf-logo"
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleFileSelection("logo", event.target.files)}
                />
                {renderFileList("logo")}
              </div>
              <div>
                <Label htmlFor="idf-dfo">DFO file</Label>
                <Input
                  id="idf-dfo"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(event) => handleFileSelection("dfo", event.target.files)}
                />
                {renderFileList("dfo")}
              </div>
            </TabsContent>

            <TabsContent value="location" className="space-y-4">
              <div>
                <Label htmlFor="idf-location">Location images</Label>
                <Input
                  id="idf-location"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => handleFileSelection("location", event.target.files)}
                />
              </div>
              {renderFileList("location")}
            </TabsContent>

            <TabsContent value="gallery" className="space-y-4">
              <div>
                <Label htmlFor="idf-gallery">Gallery images</Label>
                <Input
                  id="idf-gallery"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => handleFileSelection("gallery", event.target.files)}
                />
              </div>
              {renderFileList("gallery")}
            </TabsContent>

            <TabsContent value="diagrams" className="space-y-4">
              <div>
                <Label htmlFor="idf-diagrams">Diagrams</Label>
                <Input
                  id="idf-diagrams"
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  onChange={(event) => handleFileSelection("diagrams", event.target.files)}
                />
              </div>
              {renderFileList("diagrams")}
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <div>
                <Label htmlFor="idf-documents">Documents</Label>
                <Input
                  id="idf-documents"
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  multiple
                  onChange={(event) => handleFileSelection("documents", event.target.files)}
                />
              </div>
              {renderFileList("documents")}
            </TabsContent>
          </Tabs>

          {error && (
            <div className="rounded border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex space-x-2">
            <Button variant="outline" onClick={goToPreviousStep} disabled={step === "basic" || isSubmitting}>
              Previous
            </Button>
            {!isLastStep && (
              <Button onClick={goToNextStep} disabled={isSubmitting}>
                Next
              </Button>
            )}
          </div>
          {isLastStep && (
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create IDF"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
