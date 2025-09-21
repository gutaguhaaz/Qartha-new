import { useState } from "react";
import { useRoute } from "wouter";

import AddIdfDialog from "@/components/AddIdfDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { downloadCsvTemplate, uploadCsv } from "@/lib/api";

interface RouteParams {
  cluster: string;
  project: string;
}

export default function CmsUpload() {
  const [, params] = useRoute<RouteParams>("/:cluster/:project/cms");
  const cluster = params?.cluster ?? "Trinity";
  const project = params?.project ?? "sabinas";

  const [idfCode, setIdfCode] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleCsvUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!idfCode.trim()) {
      toast({ title: "IDF code required", description: "Please enter an IDF code", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      await uploadCsv(cluster, project, idfCode.trim().toUpperCase(), files[0]);
      toast({ title: "Devices uploaded", description: "CSV processed successfully" });
    } catch (error) {
      console.error(error);
      toast({ title: "Upload failed", description: "Unable to process CSV", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-8" data-testid="cms-upload">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Content Management</h1>
        <p className="text-muted-foreground">
          Create new IDFs, upload device inventories, and manage media assets using the admin panel.
        </p>
      </header>

      

      <Card>
        <CardHeader>
          <CardTitle>Upload devices CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="idf-code">IDF code</Label>
              <Input
                id="idf-code"
                value={idfCode}
                onChange={(event) => setIdfCode(event.target.value)}
                placeholder="IDF-1001"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={downloadCsvTemplate} type="button">
                Download template
              </Button>
              <Label
                htmlFor="devices-csv"
                className="inline-flex cursor-pointer items-center justify-center rounded-md border border-border bg-input px-4 py-2 text-sm font-medium"
              >
                {isUploading ? "Uploading..." : "Upload CSV"}
              </Label>
              <input
                id="devices-csv"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(event) => handleCsvUpload(event.target.files)}
                disabled={isUploading}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            CSV columns: <code>name, model, serial, rack, site, notes</code>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Need advanced editing?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Use the admin sidebar (settings icon in the navigation bar) to manage gallery images, diagrams, documents and DFO for
            each IDF.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
