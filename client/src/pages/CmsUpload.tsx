import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { uploadCsv, uploadAsset, downloadCsvTemplate, uploadLogo } from "@/lib/api";
import AddIdfDialog from "@/components/AddIdfDialog";

interface CmsUploadProps {
  cluster: string;
  project: string;
}

export default function CmsUpload({ params }: { params: CmsUploadProps }) {
  const { cluster, project } = params;
  const [idfCode, setIdfCode] = useState("");
  const [adminToken, setAdminToken] = useState(import.meta.env.VITE_ADMIN_TOKEN || "changeme-demo-token");
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (files: FileList | null, type: 'csv' | 'images' | 'documents' | 'diagram') => {
    if (!files || files.length === 0) return;
    if (!idfCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter the IDF code",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    
    try {
      if (type === 'csv') {
        const result = await uploadCsv(cluster, project, idfCode, files[0], adminToken);
        toast({
          title: "Success",
          description: result.message || "CSV uploaded successfully"
        });
      } else {
        // Upload each file for assets
        for (let i = 0; i < files.length; i++) {
          const result = await uploadAsset(cluster, project, idfCode, files[i], type, adminToken);
          toast({
            title: "Success", 
            description: `${files[i].name} uploaded successfully`
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error uploading file",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleLogoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const result = await uploadLogo(cluster, project, files[0], adminToken);
      toast({
        title: "Success",
        description: result.message || "Logo uploaded successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error uploading logo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleLogoUpload(e.dataTransfer.files);
  };

  const handleLogoSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.jpg,.jpeg,.png,.gif';
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      handleLogoUpload(target.files);
    };
    input.click();
  };

  const handleDrop = (e: React.DragEvent, type: 'csv' | 'images' | 'documents' | 'diagram') => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files, type);
  };

  const handleFileSelect = (type: 'csv' | 'images' | 'documents' | 'diagram', multiple = false) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = multiple;
    
    switch (type) {
      case 'csv':
        input.accept = '.csv';
        break;
      case 'images':
        input.accept = '.jpg,.jpeg,.png,.gif';
        break;
      case 'documents':
        input.accept = '.pdf,.doc,.docx,.xls,.xlsx';
        break;
      case 'diagram':
        input.accept = '.pdf,.png,.jpg,.jpeg';
        break;
    }
    
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      handleFileUpload(target.files, type);
    };
    
    input.click();
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8" data-testid="cms-upload">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2" data-testid="page-title">
            Content Management System
          </h2>
          <p className="text-muted-foreground">Upload and manage files for IDFs</p>
        </div>
        <AddIdfDialog cluster={cluster} project={project} token={adminToken} />
      </div>

      {/* Configuration */}
      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Cluster</label>
            <input
              type="text"
              value={cluster === 'trk' ? 'Trinity Project' : cluster.toUpperCase()}
              disabled
              className="w-full bg-muted border border-border rounded-md px-3 py-2 text-foreground"
              data-testid="input-cluster"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Project</label>
            <input
              type="text"
              value={project === 'trinity' ? 'Sabinas Project' : project.charAt(0).toUpperCase() + project.slice(1)}
              disabled
              className="w-full bg-muted border border-border rounded-md px-3 py-2 text-foreground"
              data-testid="input-project"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">IDF Code</label>
            <input
              type="text"
              placeholder="IDF-1004"
              value={idfCode}
              onChange={(e) => setIdfCode(e.target.value)}
              className="w-full bg-input border border-border rounded-md px-3 py-2 text-foreground placeholder-muted-foreground"
              data-testid="input-idf-code"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Admin Token</label>
          <input
            type="password"
            value={adminToken}
            onChange={(e) => setAdminToken(e.target.value)}
            className="w-full bg-input border border-border rounded-md px-3 py-2 text-foreground font-mono text-sm"
            data-testid="input-admin-token"
          />
        </div>
      </div>

      {/* Upload Sections */}
      <div className="space-y-8">
        {/* CSV Upload */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Devices (CSV)</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <i className="fas fa-download text-blue-400"></i>
                <div>
                  <p className="font-medium">Download CSV Template</p>
                  <p className="text-sm text-muted-foreground">Headers: name, model, serial, rack, site, notes</p>
                </div>
              </div>
              <button
                onClick={downloadCsvTemplate}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                data-testid="button-download-template"
              >
                Download
              </button>
            </div>

            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-ring transition-colors"
              onDrop={(e) => handleDrop(e, 'csv')}
              onDragOver={(e) => e.preventDefault()}
              data-testid="dropzone-csv"
            >
              <i className="fas fa-file-csv text-3xl text-muted-foreground mb-4"></i>
              <p className="text-lg font-medium mb-2">Drag your CSV file here</p>
              <p className="text-muted-foreground mb-4">or click to select</p>
              <button
                onClick={() => handleFileSelect('csv')}
                disabled={uploading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                data-testid="button-select-csv"
              >
                {uploading ? 'Uploading...' : 'Select File'}
              </button>
            </div>
          </div>
        </div>

        {/* Image Upload */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Images</h3>
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-ring transition-colors"
            onDrop={(e) => handleDrop(e, 'images')}
            onDragOver={(e) => e.preventDefault()}
            data-testid="dropzone-images"
          >
            <i className="fas fa-image text-3xl text-muted-foreground mb-4"></i>
            <p className="text-lg font-medium mb-2">Upload Images</p>
            <p className="text-muted-foreground mb-4">JPG, PNG up to 10MB</p>
            <button
              onClick={() => handleFileSelect('images', true)}
              disabled={uploading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              data-testid="button-select-images"
            >
              {uploading ? 'Uploading...' : 'Select Images'}
            </button>
          </div>
        </div>

        {/* Document Upload */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Documents</h3>
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-ring transition-colors"
            onDrop={(e) => handleDrop(e, 'documents')}
            onDragOver={(e) => e.preventDefault()}
            data-testid="dropzone-documents"
          >
            <i className="fas fa-file-alt text-3xl text-muted-foreground mb-4"></i>
            <p className="text-lg font-medium mb-2">Upload Documents</p>
            <p className="text-muted-foreground mb-4">PDF, DOC, DOCX, XLS, XLSX up to 50MB</p>
            <button
              onClick={() => handleFileSelect('documents', true)}
              disabled={uploading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              data-testid="button-select-documents"
            >
              {uploading ? 'Uploading...' : 'Select Documents'}
            </button>
          </div>
        </div>

        {/* Diagram Upload */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Diagram</h3>
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-ring transition-colors"
            onDrop={(e) => handleDrop(e, 'diagram')}
            onDragOver={(e) => e.preventDefault()}
            data-testid="dropzone-diagram"
          >
            <i className="fas fa-project-diagram text-3xl text-muted-foreground mb-4"></i>
            <p className="text-lg font-medium mb-2">Upload Diagram</p>
            <p className="text-muted-foreground mb-4">PDF, PNG, JPG up to 25MB</p>
            <button
              onClick={() => handleFileSelect('diagram')}
              disabled={uploading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              data-testid="button-select-diagram"
            >
              {uploading ? 'Uploading...' : 'Select Diagram'}
            </button>
          </div>
        </div>

        {/* Logo Upload */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Cluster Logo</h3>
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-ring transition-colors"
            onDrop={handleLogoDrop}
            onDragOver={(e) => e.preventDefault()}
            data-testid="dropzone-logo"
          >
            <i className="fas fa-image text-3xl text-muted-foreground mb-4"></i>
            <p className="text-lg font-medium mb-2">Drag your logo here</p>
            <p className="text-muted-foreground mb-4">PNG, JPG, GIF up to 10MB</p>
            <button
              onClick={handleLogoSelect}
              disabled={uploading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              data-testid="button-select-logo"
            >
              {uploading ? 'Uploading...' : 'Select Logo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
