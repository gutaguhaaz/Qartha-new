import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { getIdf } from "@/lib/api";
import { IdfPublic } from "@shared/schema";
import Gallery from "@/components/Gallery";
import DocList from "@/components/DocList";
import PdfOrImage from "@/components/PdfOrImage";
import DataTable from "@/components/DataTable";

interface PublicDetailProps {
  cluster: string;
  project: string;
  code: string;
}

export default function PublicDetail({ params }: { params: PublicDetailProps }) {
  const { cluster, project, code } = params;
  const [activeTab, setActiveTab] = useState<string>('overview');

  const { data: idf, isLoading, error } = useQuery({
    queryKey: ['/api', cluster, project, 'idfs', code],
    queryFn: () => getIdf(cluster, project, code)
  });

  const getHealthIndicatorClass = (level?: string) => {
    switch (level) {
      case 'green': return 'bg-green-500';
      case 'yellow': return 'bg-yellow-500'; 
      case 'red': return 'bg-red-500';
      case 'gray': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getHealthLabel = (level?: string) => {
    switch (level) {
      case 'green': return 'Operational';
      case 'yellow': return 'Under Review';
      case 'red': return 'Critical Failure';
      case 'gray': return 'No Data';
      default: return 'No Data';
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-12 bg-muted rounded w-full mb-6"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !idf) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="text-center py-12">
          <i className="fas fa-exclamation-triangle text-4xl text-destructive mb-4"></i>
          <h2 className="text-xl font-semibold mb-2">Error Loading IDF</h2>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : 'IDF not found'}
          </p>
          <Link href={`/${cluster}/${project}`} className="mt-4 inline-block text-primary hover:underline">
            Back to Directory
          </Link>
        </div>
      </div>
    );
  }

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
  const qrUrl = `${API_BASE}/api/${cluster}/${project}/idfs/${code}/qr.png`;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8" data-testid="public-detail">
      {/* Header */}
      <div className="mb-8">
        <nav className="text-sm mb-4" data-testid="breadcrumb">
          <Link href={`/${cluster}/${project}`} className="text-muted-foreground hover:text-foreground">
            Directory
          </Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <span className="text-foreground">{idf.title}</span>
        </nav>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="idf-title">
              {idf.title}
            </h1>
            <p className="text-muted-foreground mb-4" data-testid="idf-metadata">
              {idf.code} • {idf.site} • {idf.room}
            </p>

            {/* Global Health Status */}
            {idf.health && (
              <div className="flex items-center space-x-4" data-testid="health-status">
                <div className="flex items-center space-x-2">
                  <div className={`health-indicator ${getHealthIndicatorClass(idf.health.level)}`}></div>
                  <span className="font-medium">{getHealthLabel(idf.health.level)}</span>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  {idf.health.counts.ok > 0 && (
                    <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded-full">
                      {idf.health.counts.ok} OK
                    </span>
                  )}
                  {idf.health.counts.revision > 0 && (
                    <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded-full">
                      {idf.health.counts.revision} Review
                    </span>
                  )}
                  {idf.health.counts.falla > 0 && (
                    <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded-full">
                      {idf.health.counts.falla} Critical
                    </span>
                  )}
                  {idf.health.counts.libre > 0 && (
                    <span className="px-2 py-1 bg-gray-500/10 text-gray-400 rounded-full">
                      {idf.health.counts.libre} Available
                    </span>
                  )}
                  {idf.health.counts.reservado > 0 && (
                    <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded-full">
                      {idf.health.counts.reservado} Reserved
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* QR Code */}
          <div className="bg-card border border-border rounded-lg p-4" data-testid="qr-code">
            <img
              src={qrUrl}
              alt="QR Code"
              className="w-24 h-24"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement!.innerHTML = `
                  <div class="w-24 h-24 bg-muted rounded flex items-center justify-center">
                    <i class="fas fa-qrcode text-2xl text-muted-foreground"></i>
                  </div>
                `;
              }}
            />
            <p className="text-xs text-muted-foreground mt-2 text-center">QR Code</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-muted rounded-lg p-1" data-testid="tab-navigation">
          <button
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
            data-testid="tab-overview"
          >
            <i className="fas fa-info-circle mr-2"></i>Overview
          </button>
          <button
            className={`tab-button ${activeTab === 'gallery' ? 'active' : ''}`}
            onClick={() => setActiveTab('gallery')}
            data-testid="tab-gallery"
          >
            <i className="fas fa-images mr-2"></i>Gallery
          </button>
          <button
            className={`tab-button ${activeTab === 'documents' ? 'active' : ''}`}
            onClick={() => setActiveTab('documents')}
            data-testid="tab-documents"
          >
            <i className="fas fa-file-alt mr-2"></i>Documents
          </button>
          <button
            className={`tab-button ${activeTab === 'diagram' ? 'active' : ''}`}
            onClick={() => setActiveTab('diagram')}
            data-testid="tab-diagram"
          >
            <i className="fas fa-project-diagram mr-2"></i>Diagram
          </button>
          <button
            className={`tab-button ${activeTab === 'table' ? 'active' : ''}`}
            onClick={() => setActiveTab('table')}
            data-testid="tab-table"
          >
            <i className="fas fa-table mr-2"></i>Device Table
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" data-testid="tab-content-overview">
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">IDF Details</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-muted-foreground">Code</dt>
                  <dd className="font-mono" data-testid="detail-code">{idf.code}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Title</dt>
                  <dd data-testid="detail-title">{idf.title}</dd>
                </div>
                {idf.site && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Site</dt>
                    <dd data-testid="detail-site">{idf.site}</dd>
                  </div>
                )}
                {idf.room && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Room</dt>
                    <dd data-testid="detail-room">{idf.room}</dd>
                  </div>
                )}
                {idf.description && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Description</dt>
                    <dd className="text-muted-foreground" data-testid="detail-description">
                      {idf.description}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {idf.health && (
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Health Status</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Operational (OK)</span>
                    </div>
                    <span className="font-semibold" data-testid="count-ok">
                      {idf.health.counts.ok}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span>Under Review</span>
                    </div>
                    <span className="font-semibold" data-testid="count-revision">
                      {idf.health.counts.revision}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span>Critical Failure</span>
                    </div>
                    <span className="font-semibold" data-testid="count-falla">
                      {idf.health.counts.falla}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span>Reserved</span>
                    </div>
                    <span className="font-semibold" data-testid="count-reservado">
                      {idf.health.counts.reservado}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                      <span>Available</span>
                    </div>
                    <span className="font-semibold" data-testid="count-libre">
                      {idf.health.counts.libre}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'gallery' && (
          <div data-testid="tab-content-gallery">
            <Gallery images={idf.gallery} />
          </div>
        )}

        {activeTab === 'documents' && (
          <div data-testid="tab-content-documents">
            <DocList documents={idf.documents} />
          </div>
        )}

        {activeTab === 'diagram' && (
          <div data-testid="tab-content-diagram">
            <PdfOrImage diagram={idf.diagram} />
          </div>
        )}

        {activeTab === 'table' && (
          <div data-testid="tab-content-table">
            <DataTable table={idf.table} />
          </div>
        )}
      </div>
    </div>
  );
}
