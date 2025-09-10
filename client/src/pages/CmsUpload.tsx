import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { uploadCsv, uploadAsset, downloadCsvTemplate } from "@/lib/api";

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
        description: "Por favor ingresa el código del IDF",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    
    try {
      if (type === 'csv') {
        const result = await uploadCsv(cluster, project, idfCode, files[0], adminToken);
        toast({
          title: "Éxito",
          description: result.message || "CSV subido exitosamente"
        });
      } else {
        // Upload each file for assets
        for (let i = 0; i < files.length; i++) {
          const result = await uploadAsset(cluster, project, idfCode, files[i], type, adminToken);
          toast({
            title: "Éxito", 
            description: `${files[i].name} subido exitosamente`
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al subir archivo",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
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
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2" data-testid="page-title">
          Sistema de gestión de contenidos
        </h2>
        <p className="text-muted-foreground">Subir y gestionar archivos para IDFs</p>
      </div>

      {/* Configuration */}
      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Configuración</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Cluster</label>
            <input
              type="text"
              value={cluster.toUpperCase()}
              disabled
              className="w-full bg-muted border border-border rounded-md px-3 py-2 text-foreground"
              data-testid="input-cluster"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Proyecto</label>
            <input
              type="text"
              value={project.charAt(0).toUpperCase() + project.slice(1)}
              disabled
              className="w-full bg-muted border border-border rounded-md px-3 py-2 text-foreground"
              data-testid="input-project"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Código IDF</label>
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
          <label className="block text-sm font-medium mb-2">Token de administrador</label>
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
          <h3 className="text-lg font-semibold mb-4">Dispositivos (CSV)</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <i className="fas fa-download text-blue-400"></i>
                <div>
                  <p className="font-medium">Descargar plantilla CSV</p>
                  <p className="text-sm text-muted-foreground">Headers: name, model, serial, rack, site, notes</p>
                </div>
              </div>
              <button
                onClick={downloadCsvTemplate}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                data-testid="button-download-template"
              >
                Descargar
              </button>
            </div>

            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-ring transition-colors"
              onDrop={(e) => handleDrop(e, 'csv')}
              onDragOver={(e) => e.preventDefault()}
              data-testid="dropzone-csv"
            >
              <i className="fas fa-file-csv text-3xl text-muted-foreground mb-4"></i>
              <p className="text-lg font-medium mb-2">Arrastra tu archivo CSV aquí</p>
              <p className="text-muted-foreground mb-4">o haz clic para seleccionar</p>
              <button
                onClick={() => handleFileSelect('csv')}
                disabled={uploading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                data-testid="button-select-csv"
              >
                {uploading ? 'Subiendo...' : 'Seleccionar archivo'}
              </button>
            </div>
          </div>
        </div>

        {/* Image Upload */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Imágenes</h3>
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-ring transition-colors"
            onDrop={(e) => handleDrop(e, 'images')}
            onDragOver={(e) => e.preventDefault()}
            data-testid="dropzone-images"
          >
            <i className="fas fa-image text-3xl text-muted-foreground mb-4"></i>
            <p className="text-lg font-medium mb-2">Subir imágenes</p>
            <p className="text-muted-foreground mb-4">JPG, PNG hasta 10MB</p>
            <button
              onClick={() => handleFileSelect('images', true)}
              disabled={uploading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              data-testid="button-select-images"
            >
              {uploading ? 'Subiendo...' : 'Seleccionar imágenes'}
            </button>
          </div>
        </div>

        {/* Document Upload */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Documentos</h3>
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-ring transition-colors"
            onDrop={(e) => handleDrop(e, 'documents')}
            onDragOver={(e) => e.preventDefault()}
            data-testid="dropzone-documents"
          >
            <i className="fas fa-file-alt text-3xl text-muted-foreground mb-4"></i>
            <p className="text-lg font-medium mb-2">Subir documentos</p>
            <p className="text-muted-foreground mb-4">PDF, DOC, DOCX, XLS, XLSX hasta 50MB</p>
            <button
              onClick={() => handleFileSelect('documents', true)}
              disabled={uploading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              data-testid="button-select-documents"
            >
              {uploading ? 'Subiendo...' : 'Seleccionar documentos'}
            </button>
          </div>
        </div>

        {/* Diagram Upload */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Diagrama</h3>
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-ring transition-colors"
            onDrop={(e) => handleDrop(e, 'diagram')}
            onDragOver={(e) => e.preventDefault()}
            data-testid="dropzone-diagram"
          >
            <i className="fas fa-project-diagram text-3xl text-muted-foreground mb-4"></i>
            <p className="text-lg font-medium mb-2">Subir diagrama</p>
            <p className="text-muted-foreground mb-4">PDF, PNG, JPG hasta 25MB</p>
            <button
              onClick={() => handleFileSelect('diagram')}
              disabled={uploading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              data-testid="button-select-diagram"
            >
              {uploading ? 'Subiendo...' : 'Seleccionar diagrama'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
