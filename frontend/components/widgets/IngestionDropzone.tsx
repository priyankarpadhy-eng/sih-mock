import React, { useState } from 'react';
import { Upload, FileText, Cpu, Check, Terminal } from 'lucide-react';

interface IngestionDropzoneProps {
  rawConfig: string;
  onConfigChange: (newConfig: string) => void;
  detectedVendor: string;
  onEvaluate: () => void;
  onLoadSample: (key: string) => void;
  isLoading: boolean;
}

export const IngestionDropzone: React.FC<IngestionDropzoneProps> = ({
  rawConfig,
  onConfigChange,
  detectedVendor,
  onEvaluate,
  onLoadSample,
  isLoading,
}) => {
  const [dragActive, setDragActive] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onConfigChange(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onConfigChange(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <section className="bg-toc-surface border border-toc-border rounded-lg p-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-toc-heading flex items-center gap-2">
            <Terminal className="w-5 h-5 text-tactical-cyan" />
            Config Ingestion & Syntax Pre-Scan
          </h2>
          <p className="text-xs text-toc-text mt-0.5">
            Ingest raw network configuration dumps, syslog streams, or cloud security group definitions.
          </p>
        </div>

        {/* Sample Selectors */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="text-toc-text">LOAD PRESETS:</span>
          <button
            onClick={() => onLoadSample('cisco_ios')}
            className="px-2.5 py-1 bg-toc-bg hover:bg-toc-hover border border-toc-border rounded text-toc-heading transition-colors"
          >
            Cisco IOS
          </button>
          <button
            onClick={() => onLoadSample('palo_alto')}
            className="px-2.5 py-1 bg-toc-bg hover:bg-toc-hover border border-toc-border rounded text-toc-heading transition-colors"
          >
            Palo Alto
          </button>
          <button
            onClick={() => onLoadSample('juniper_junos')}
            className="px-2.5 py-1 bg-toc-bg hover:bg-toc-hover border border-toc-border rounded text-toc-heading transition-colors"
          >
            JunOS
          </button>
          <button
            onClick={() => onLoadSample('fortinet_fortios')}
            className="px-2.5 py-1 bg-toc-bg hover:bg-toc-hover border border-toc-border rounded text-toc-heading transition-colors"
          >
            FortiOS
          </button>
          <button
            onClick={() => onLoadSample('aws_sg')}
            className="px-2.5 py-1 bg-toc-bg hover:bg-toc-hover border border-toc-border rounded text-toc-heading transition-colors"
          >
            AWS SG
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Upload Dropzone & Vendor Detection */}
        <div className="lg:col-span-1 space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center min-h-[220px] ${
              dragActive ? 'border-tactical-cyan bg-tactical-cyan/5' : 'border-toc-border hover:border-toc-text bg-toc-bg'
            }`}
          >
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".cfg,.txt,.log,.xml,.json"
              onChange={handleFileUpload}
            />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
              <Upload className="w-8 h-8 text-tactical-cyan mb-2" />
              <span className="text-sm font-medium text-toc-heading">Drag & drop raw config file</span>
              <span className="text-xs text-toc-text mt-1">Supports .cfg, .txt, .log, .json, .xml</span>
            </label>
          </div>

          <div className="bg-toc-bg p-4 rounded-md border border-toc-border space-y-2">
            <div className="text-xs font-mono text-toc-text uppercase tracking-wider flex items-center justify-between">
              <span>VENDOR AUTO-DETECTION</span>
              <Cpu className="w-3.5 h-3.5 text-tactical-cyan" />
            </div>
            <div className="text-sm font-semibold text-tactical-cyan font-mono">
              {detectedVendor || "Detecting..."}
            </div>
          </div>

          <button
            onClick={onEvaluate}
            disabled={isLoading || !rawConfig.trim()}
            className="w-full py-3 bg-tactical-cyan hover:bg-tactical-cyan/90 text-toc-bg font-semibold font-mono text-sm rounded shadow transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? "ANALYZING BASELINE..." : "EXECUTE COMPLIANCE AUDIT"}
          </button>
        </div>

        {/* Right Col: Live Raw Syntax Preview */}
        <div className="lg:col-span-2 bg-toc-bg border border-toc-border rounded-lg p-4 font-mono text-xs overflow-hidden flex flex-col min-h-[280px]">
          <div className="flex items-center justify-between pb-3 border-b border-toc-border mb-3 text-toc-text">
            <span className="flex items-center gap-2 text-toc-heading font-medium">
              <FileText className="w-4 h-4 text-tactical-cyan" />
              RAW CONFIGURATION INPUT STREAM
            </span>
            <span>{rawConfig.split('\n').length} LINES</span>
          </div>

          <textarea
            value={rawConfig}
            onChange={(e) => onConfigChange(e.target.value)}
            placeholder="Paste raw router, firewall, or switch configuration commands here..."
            className="w-full h-full min-h-[220px] bg-transparent text-toc-text focus:outline-none resize-none font-mono leading-relaxed"
          />
        </div>

      </div>
    </section>
  );
};
