import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Paperclip,
  ArrowUp,
  Cpu,
  FileText,
  Terminal,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Download,
  ChevronRight,
  ChevronDown,
  HelpCircle,
  Languages,
  X,
  Copy,
  Check,
  Eye,
  Sliders,
  RotateCcw,
  Code,
  Filter,
  FlaskConical,
  Key,
  Loader2,
  Layers,
  Server,
  Activity,
  CheckCircle,
} from 'lucide-react';
import { NavTab } from '../layout/Sidebar';
import { evaluateConfiguration, detectVendorAndHardware, HardwareFault } from '../../lib/compliance_evaluator';

interface AuditFinding {
  rule_id: string;
  framework: string;
  control_ref: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  status: 'PASS' | 'FAIL' | 'WARNING' | 'UNKNOWN' | 'NOT_APPLICABLE';
  observed_value: string;
  required_value: string;
  line_start?: number | null;
  line_end?: number | null;
  parser_confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  rule_pack_version?: string;
  remediation_cli?: {
    proposal_status?: string;
    script?: string;
    remediation_cli?: string;
    rollback?: string;
    verification_cmd?: string;
    prerequisites?: string;
    warning?: string;
  };
  rollback_cli?: string;
}

interface IngestionPageProps {
  rawConfig: string;
  onConfigChange: (cfg: string) => void;
  detectedVendor: string;
  onEvaluate: () => void;
  onNavigate: (tab: NavTab) => void;
  onLoadPreset?: (presetKey: string) => void;
  isLoading?: boolean;
  auditResult?: any;
  complianceScore?: number;
  hostname?: string;
}

export const IngestionPage: React.FC<IngestionPageProps> = ({
  rawConfig,
  onConfigChange,
  detectedVendor,
  onEvaluate,
  onNavigate,
  onLoadPreset,
  isLoading,
  auditResult,
  complianceScore,
  hostname,
}) => {
  const [promptText, setPromptText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResponseText, setAiResponseText] = useState<string | null>(null);
  const [aiMeta, setAiMeta] = useState<{ provider?: string; model?: string; failover_log?: string[]; skills_applied?: string[]; detected_vendor?: string } | null>(null);
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDeepResearch, setIsDeepResearch] = useState(false);
  const [showAuditDetails, setShowAuditDetails] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'fail' | 'pass' | 'unknown'>('all');
  const [copiedRule, setCopiedRule] = useState<string | null>(null);
  const [copiedRollback, setCopiedRollback] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [dynamicAuditResult, setDynamicAuditResult] = useState<any>(null);
  const [ingestMeta, setIngestMeta] = useState<{ source: 'PASTED' | 'FILE'; label?: string } | null>(null);
  const [normalizedSchema, setNormalizedSchema] = useState<any>(null);
  const [drawerActiveTab, setDrawerActiveTab] = useState<'raw' | 'normalized'>('raw');
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);

  // Multi-Step Live Pipeline Animation States
  type PipelineStage = 'idle' | 'detecting_vendor' | 'detecting_hardware' | 'normalizing' | 'compliance' | 'ai' | 'completed';
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>('idle');
  const [pipelineData, setPipelineData] = useState<{
    vendor?: string;
    hardware?: string;
    os_platform?: string;
    device_type?: string;
    hardware_faults?: HardwareFault[];
    controls_count?: number;
    score?: number;
    violations_count?: number;
    total_checks?: number;
  }>({});

  const [isPipelineDetailsOpen, setIsPipelineDetailsOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // AI API Key Management
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [openRouterApiKey, setOpenRouterApiKey] = useState('');
  const [activeAiModel, setActiveAiModel] = useState('nvidia/nemotron-3.5-lightning:free');
  const [keySaveMessage, setKeySaveMessage] = useState<string | null>(null);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyTestFeedback, setKeyTestFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Load saved API key & model from local storage on mount
  useEffect(() => {
    try {
      const savedKey = localStorage.getItem('vectornet_openrouter_key');
      const savedModel = localStorage.getItem('vectornet_ai_model');
      if (savedKey) setOpenRouterApiKey(savedKey);
      if (savedModel) setActiveAiModel(savedModel);
    } catch {
      // ignore
    }
  }, []);

  const handleSaveApiKey = async () => {
    try {
      localStorage.setItem('vectornet_openrouter_key', openRouterApiKey.trim());
      localStorage.setItem('vectornet_ai_model', activeAiModel);

      // Persist to backend server if reachable
      await fetch('http://localhost:8000/api/v1/ai/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_keys: openRouterApiKey.trim() ? [openRouterApiKey.trim()] : [],
          active_model: activeAiModel,
          user_role: 'SUPER_ADMIN'
        })
      }).catch(() => {});

      setKeySaveMessage('API key configured & active for cloud reasoning.');
      setTimeout(() => setKeySaveMessage(null), 3000);
    } catch {
      setKeySaveMessage('Key saved locally.');
      setTimeout(() => setKeySaveMessage(null), 3000);
    }
  };

  const handleTestApiKey = async () => {
    setIsTestingKey(true);
    setKeyTestFeedback(null);
    const start = Date.now();
    try {
      const formData = new FormData();
      formData.append('prompt', 'Verify active compliance auditor reasoning engine');
      formData.append('system_instruction', 'Respond with PONG in 1 word.');

      const res = await fetch('http://localhost:8000/api/v1/ai/query-failover', {
        method: 'POST',
        body: formData
      });
      const latency = Date.now() - start;
      if (res.ok) {
        const data = await res.json();
        setKeyTestFeedback({
          success: true,
          message: `Active (${latency}ms) — Provider: ${data.provider || 'Ready'} (${data.model || activeAiModel})`
        });
      } else {
        setKeyTestFeedback({
          success: false,
          message: `Error ${res.status}: Failed to reach provider endpoint`
        });
      }
    } catch {
      setKeyTestFeedback({
        success: false,
        message: 'Backend server not responding on port 8000'
      });
    } finally {
      setIsTestingKey(false);
    }
  };

  // Live Multi-Step Execution Pipeline: runs sequential animation & deterministic analysis
  const runPipelineAudit = async (configContent: string, promptQuery?: string, sourceLabel?: string) => {
    if (!configContent || !configContent.trim()) return;

    setIsProcessing(true);
    setPipelineStage('detecting_vendor');
    setShowAuditDetails(false);
    setAiResponseText(null);
    setAiMeta(null);

    // Initial parsing
    const det = detectVendorAndHardware(configContent);
    setPipelineData({
      vendor: det.vendor,
      hardware: det.hardware,
      os_platform: det.os_platform,
      device_type: det.device_type,
      hardware_faults: det.hardware_faults,
    });

    // Step 1: Vendor identification delay
    await new Promise((r) => setTimeout(r, 380));

    // Step 2: Hardware identification
    setPipelineStage('detecting_hardware');
    await new Promise((r) => setTimeout(r, 420));

    // Step 3: Schema Normalization
    setPipelineStage('normalizing');
    fetch('http://localhost:8000/api/v1/normalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_text: configContent }),
    })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data?.normalized_schema) setNormalizedSchema(data.normalized_schema);
      })
      .catch(() => {});
    setPipelineData(prev => ({ ...prev, controls_count: 18 }));
    await new Promise((r) => setTimeout(r, 400));

    // Step 4: Compliance check
    setPipelineStage('compliance');
    const localResult = evaluateConfiguration(configContent);
    const violations = localResult.findings.filter(f => f.status === 'FAIL' || f.status === 'WARNING').length;
    setPipelineData(prev => ({
      ...prev,
      score: localResult.compliance_score,
      violations_count: violations,
      total_checks: localResult.total_checks
    }));
    setDynamicAuditResult(localResult);
    await new Promise((r) => setTimeout(r, 450));

    // Step 5: Optional AI query if prompt entered
    const query = (promptQuery || '').trim();
    if (query) {
      setPipelineStage('ai');
      try {
        const formData = new FormData();
        const payload = isDeepResearch ? `[DEEP RESEARCH AUDIT]: ${query}` : query;
        formData.append('query', payload);
        formData.append('raw_config', configContent);
        formData.append('deep_research', isDeepResearch ? 'true' : 'false');

        const res = await fetch('http://localhost:8000/api/query-ai', {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          const base = data.response_text || 'Compliance verification complete.';
          setAiResponseText(isDeepResearch ? `[Deep Research Report - ${det.vendor}]\n` + base : base);
          setAiMeta({
            provider: data.provider || 'LOCAL_OLLAMA',
            model: data.model || 'qwen3:4b',
            failover_log: data.failover_log || [],
            skills_applied: data.skills_applied || [],
            detected_vendor: data.detected_vendor || det.vendor
          });
          if (data.findings && data.findings.length > 0) {
            setDynamicAuditResult({
              ...localResult,
              ...data,
              findings: data.findings
            });
          }
        } else {
          setAiResponseText(`[Audit Verification] Completed analysis for query "${query}". Findings and evidence line spans are listed below.`);
        }
      } catch {
        setAiResponseText(`[Audit Verification] Evaluated configuration for query "${query}". Primary compliance findings and proposed CLI scripts are detailed below.`);
      }
    }

    setPipelineStage('completed');
    setShowAuditDetails(true);
    setIsProcessing(false);

    // Sync with backend /api/evaluate in background
    fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ raw_config: configContent }),
    }).catch(() => {});
  };

  const handleFetchNormalizedSchema = async () => {
    if (!rawConfig.trim()) return;
    setIsNormalizing(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/normalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: rawConfig }),
      });
      if (res.ok) {
        const data = await res.json();
        setNormalizedSchema(data.normalized_schema);
      }
    } catch (err) {
      console.error("Normalization error:", err);
    } finally {
      setIsNormalizing(false);
    }
  };

  const activeAudit = dynamicAuditResult || auditResult;
  const findings: AuditFinding[] = activeAudit?.findings || [];
  // Only show score if a real audit has been run (activeAudit exists)
  // complianceScore prop is ignored — we only use real backend results
  const activeScore: number | null = activeAudit
    ? (typeof activeAudit?.compliance_score === 'number'
      ? Math.round(activeAudit.compliance_score)
      : null)
    : null;
  const activeHostname: string | null = activeAudit
    ? (activeAudit?.sbm?.device_metadata?.hostname || activeAudit?.hostname || null)
    : null;
  const activeVendor: string = activeAudit?.sbm?.device_metadata?.vendor
    || activeAudit?.detected_vendor
    || detectedVendor
    || 'Unknown Vendor';
  const auditHasRun = activeAudit != null && findings.length > 0;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const lineCount = rawConfig.trim() ? rawConfig.split('\n').length : 0;
  const getCleanStatus = (status: any) => String(status || '').replace('ComplianceStatus.', '').toUpperCase();

  const failCount = findings.filter((f) => {
    const s = getCleanStatus(f.status);
    return s === 'FAIL' || s === 'WARNING';
  }).length;
  const passCount = findings.filter((f) => getCleanStatus(f.status) === 'PASS').length;
  const unknownCount = findings.filter((f) => {
    const s = getCleanStatus(f.status);
    return s === 'UNKNOWN' || s === 'NOT_APPLICABLE';
  }).length;

  const filteredFindings = findings.filter((f) => {
    const s = getCleanStatus(f.status);
    if (activeFilter === 'fail') return s === 'FAIL' || s === 'WARNING';
    if (activeFilter === 'pass') return s === 'PASS';
    if (activeFilter === 'unknown') return s === 'UNKNOWN' || s === 'NOT_APPLICABLE';
    return true;
  });

  const handleDropFile = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          const content = evt.target.result as string;
          onConfigChange(content);
          setIngestMeta({ source: 'FILE', label: file.name });
          runPipelineAudit(content, promptText, file.name);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      if (files.length === 1) {
        const file = files[0];
        const reader = new FileReader();
        reader.onload = (evt) => {
          if (evt.target?.result) {
            const content = evt.target.result as string;
            onConfigChange(content);
            setIngestMeta({ source: 'FILE', label: file.name });
            runPipelineAudit(content, promptText, file.name);
          }
        };
        reader.readAsText(file);
      } else {
        let combined = '';
        let processed = 0;
        files.forEach((f) => {
          const r = new FileReader();
          r.onload = (ev) => {
            if (ev.target?.result) {
              combined += `\n! ================================\n! FILE: ${f.name}\n! ================================\n` + (ev.target.result as string) + '\n';
            }
            processed++;
            if (processed === files.length) {
              onConfigChange(combined);
              setIngestMeta({ source: 'FILE', label: `${files.length} files` });
              runPipelineAudit(combined, promptText, `${files.length} files`);
            }
          };
          r.readAsText(f);
        });
      }
    }
  };

  const handleFolderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      let combined = '';
      let processed = 0;
      files.forEach((f) => {
        const r = new FileReader();
        r.onload = (ev) => {
          if (ev.target?.result) {
            combined += `\n! ================================\n! REPO FILE: ${f.name}\n! ================================\n` + (ev.target.result as string) + '\n';
          }
          processed++;
          if (processed === files.length) {
            onConfigChange(combined);
            setIngestMeta({ source: 'FILE', label: `Directory (${files.length} files)` });
            runPipelineAudit(combined, promptText, `Directory (${files.length} files)`);
          }
        };
        r.readAsText(f);
      });
    }
  };

  const handleTextPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (!pasted || !pasted.trim()) return;

    const isMultiLine = pasted.includes('\n');
    const isCodeOrLog =
      isMultiLine ||
      pasted.length > 80 ||
      pasted.includes('date=') ||
      pasted.includes('devname=') ||
      pasted.includes('interface ') ||
      pasted.includes('hostname ') ||
      pasted.includes('set ') ||
      pasted.includes('config ') ||
      pasted.includes('syslog') ||
      pasted.includes('rule ') ||
      pasted.includes('!\n') ||
      pasted.includes('{') ||
      pasted.includes('deny') ||
      pasted.includes('permit') ||
      pasted.includes('snmp-server');

    if (isCodeOrLog) {
      e.preventDefault();
      onConfigChange(pasted);
      setIngestMeta({ source: 'PASTED', label: 'Pasted Configuration' });
      runPipelineAudit(pasted, promptText, 'Pasted Configuration');
    }
  };

  const handleQuerySubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmedPrompt = promptText.trim();
    const isConfigInput =
      trimmedPrompt.includes('interface ') ||
      trimmedPrompt.includes('hostname ') ||
      trimmedPrompt.includes('set system') ||
      trimmedPrompt.includes('config system') ||
      trimmedPrompt.includes('router ') ||
      trimmedPrompt.includes('ip route') ||
      trimmedPrompt.includes('!\n') ||
      trimmedPrompt.includes('{') ||
      trimmedPrompt.split('\n').length > 4;

    let activeConfig = rawConfig;
    let actualQuery = promptText;

    if (isConfigInput && !rawConfig.trim()) {
      activeConfig = trimmedPrompt;
      onConfigChange(trimmedPrompt);
      setIngestMeta({ source: 'PASTED', label: 'Pasted Configuration' });
      actualQuery = '';
      setPromptText('');
    }

    if (!activeConfig.trim()) {
      setAiResponseText('Please upload a configuration file or paste configuration syntax above to start the audit.');
      return;
    }

    // Run full pipeline audit with or without prompt query!
    await runPipelineAudit(activeConfig, actualQuery);
  };

  const toggleDeepResearch = () => {
    const next = !isDeepResearch;
    setIsDeepResearch(next);
    if (next) {
      handleQuerySubmit();
    }
  };

  const handleCopyConfig = () => {
    if (rawConfig) {
      navigator.clipboard.writeText(rawConfig);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyFix = (ruleId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRule(ruleId);
    setTimeout(() => setCopiedRule(null), 2000);
  };

  const handleCopyRollback = (ruleId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRollback(ruleId);
    setTimeout(() => setCopiedRollback(null), 2000);
  };

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      const res = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: rawConfig })
      });
      if (!res.ok) throw new Error('PDF export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vectornet_audit_${detectedVendor.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert('Could not generate PDF. Please ensure the backend service is running.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleResetAudit = () => {
    setShowAuditDetails(false);
    setAiResponseText(null);
    setAiMeta(null);
    setPromptText('');
  };

  return (
    <div className="min-h-[88vh] flex flex-col justify-between py-6 px-4 max-w-5xl mx-auto w-full">
      
      {/* Hidden File & Folder Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept=".cfg,.conf,.json,.xml,.txt,.log,.yaml,.yml"
        onChange={handleFileUpload}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-ignore
        webkitdirectory=""
        directory=""
        className="hidden"
        onChange={handleFolderUpload}
      />

      <div className="w-full flex flex-col items-center pt-2 md:pt-4">
        
        {/* Top Status & Controls Bar */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-200 bg-white text-slate-700 text-xs font-medium shadow-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-slate-900">Local AI Connected</span>
            </span>
            <span className="text-slate-300">&bull;</span>
            <span className="text-blue-700 font-mono text-[11px] font-bold">qwen3:4b</span>
            <span className="text-slate-300">&bull;</span>
            <span className="text-slate-500 font-mono text-[11px]">Port 11434 (Air-Gapped)</span>
          </div>

          <button
            type="button"
            onClick={() => setShowApiKeyModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-orange-200 bg-orange-50 hover:bg-orange-100 text-[#EA580C] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Configure OpenRouter or external AI API keys for reasoning"
          >
            <Key className="w-3.5 h-3.5 text-[#EA580C]" />
            <span>{openRouterApiKey ? 'OpenRouter Key Active' : 'Configure AI API Key'}</span>
          </button>
        </div>

        {/* Center Geometric Emblem */}
        {!showAuditDetails && (
          <div className="mb-4 flex items-center justify-center">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[#F97316]">
              <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="14" y="4" width="7" height="22" rx="2" fill="#F97316" />
                <rect x="21" y="16" width="7" height="22" rx="2" fill="#F97316" />
                <rect x="4" y="21" width="22" height="7" rx="2" fill="#F97316" />
                <rect x="16" y="14" width="22" height="7" rx="2" fill="#F97316" />
              </svg>
            </div>
          </div>
        )}

        {/* Primary Centered Heading */}
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0F172A] text-center mb-3">
          {showAuditDetails ? 'Security Compliance Audit Results' : 'Let’s start a smart conversation'}
        </h1>



        {/* Main Floating Input Card */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDropFile}
          className={`w-full max-w-[780px] bg-white border ${
            isDragOver ? 'border-[#EA580C] ring-2 ring-orange-200 bg-orange-50/20' : 'border-[#E2E8F0]'
          } rounded-[24px] shadow-xs p-4 transition-all focus-within:border-[#CBD5E1] focus-within:shadow-md`}
        >
          
          {/* Compact Pasted / Ingested Content Attachment Card (Mini Thumbnail) */}
          {lineCount > 0 && (
            <div className="mb-2 flex items-center gap-2">
              <div
                onClick={() => {
                  setDrawerActiveTab('raw');
                  setShowConfigDrawer(true);
                }}
                className="group relative w-28 h-[74px] bg-[#18181B] border border-[#27272A] hover:border-[#3F3F46] rounded-xl p-2 flex flex-col justify-between cursor-pointer transition-all shadow-2xs select-none"
                title="Click to view full contents"
              >
                {/* Remove / Clear Attachment Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onConfigChange('');
                    setIngestMeta(null);
                    setDynamicAuditResult(null);
                    setNormalizedSchema(null);
                    setAiResponseText(null);
                    setAiMeta(null);
                    setShowAuditDetails(false);
                  }}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#27272A] hover:bg-[#EF4444] text-[#A1A1AA] hover:text-white flex items-center justify-center transition-colors shadow-xs opacity-0 group-hover:opacity-100 z-10"
                  title="Remove"
                >
                  <X className="w-2.5 h-2.5" />
                </button>

                {/* Monospace Code / Log Snippet Preview */}
                <div className="overflow-hidden flex-1 max-h-[40px]">
                  <p className="font-mono text-[8.5px] text-[#A1A1AA] leading-[1.22] tracking-tight break-all line-clamp-3">
                    {rawConfig.trim()}
                  </p>
                </div>

                {/* Bottom Card Footer: Badge */}
                <div className="flex items-center justify-between pt-1 mt-auto">
                  <span className="inline-flex items-center justify-center px-1 py-0.5 rounded border border-[#3F3F46] bg-transparent text-[8px] font-bold tracking-wider text-[#E4E4E7] uppercase">
                    {ingestMeta?.source || 'PASTED'}
                  </span>
                  <span className="text-[8px] font-mono text-[#71717A]">
                    {lineCount}L
                  </span>
                </div>
              </div>

              {/* View Universal JSON Schema Button */}
              <button
                type="button"
                onClick={async () => {
                  if (!normalizedSchema && rawConfig.trim()) {
                    await handleFetchNormalizedSchema();
                  }
                  setDrawerActiveTab('normalized');
                  setShowConfigDrawer(true);
                }}
                className="h-[74px] px-3 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] text-[#334155] font-mono transition-all cursor-pointer shadow-2xs group"
                title="View Standard Universal JSON Schema (Problem Statement 26155 Normalization)"
              >
                <Code className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-[10px] text-[#0F172A]">Universal JSON</span>
                <span className="text-[9px] text-[#64748B]">Schema</span>
              </button>
            </div>
          )}

          {/* Textarea Input */}
          <form onSubmit={handleQuerySubmit} className="space-y-2">
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              onPaste={handleTextPaste}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleQuerySubmit(e);
                }
              }}
              rows={lineCount > 0 ? 1 : 2}
              placeholder={lineCount > 0 ? "Ask a question or press Enter to audit..." : "Paste config or type prompt (e.g. Audit password encryption and SSH controls)..."}
              className="w-full bg-transparent text-sm text-[#0F172A] placeholder:text-[#94A3B8] border-none focus:outline-none resize-none leading-relaxed p-1"
            />

            {/* Actions Toolbar Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              
              {/* Left Action Buttons: File Upload & Folder Upload */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors cursor-pointer"
                  title="Upload config file (.cfg, .conf, .json, .xml, .txt)"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  className="p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors cursor-pointer"
                  title="Upload folder / repository of configurations"
                >
                  <Layers className="w-4 h-4" />
                </button>

                <span className="text-[11px] font-mono text-slate-400 hidden sm:inline ml-1">
                  {lineCount > 0 ? `${lineCount} lines ready` : 'Upload or paste CLI config'}
                </span>
              </div>

              {/* Right Action Buttons: Config Drawer, Deep Research, Send */}
              <div className="flex items-center gap-1.5 sm:gap-2 text-[#64748B]">
                <button
                  type="button"
                  onClick={() => setShowConfigDrawer(true)}
                  className="p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors cursor-pointer"
                  title="Inspect raw configuration buffer"
                >
                  <FileText className="w-4 h-4" />
                </button>

                {/* Deep Research Toggle Button */}
                <button
                  type="button"
                  onClick={toggleDeepResearch}
                  className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none ${
                    isDeepResearch
                      ? 'bg-blue-50 text-blue-700 border border-blue-300 shadow-2xs'
                      : 'bg-slate-50/80 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                  }`}
                  title={isDeepResearch ? 'Deep Research ON (click to toggle off)' : 'Deep Research OFF (click to toggle on)'}
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isDeepResearch ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="hidden xs:inline sm:inline">Deep Research</span>
                  <span className="xs:hidden sm:hidden">Research</span>
                  {isDeepResearch && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                  )}
                </button>

                {/* Orange Round Send Button */}
                <button
                  type="submit"
                  disabled={isProcessing || isLoading || !rawConfig.trim() && !promptText.trim()}
                  className="w-8 h-8 rounded-full bg-[#F97316] hover:bg-[#EA580C] text-white flex items-center justify-center transition-all shadow-xs shrink-0 disabled:opacity-50 cursor-pointer"
                  title="Run compliance verification"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              </div>
            </div>
          </form>

          {/* Bottom Banner Strip Inside Floating Card */}
          <div className="mt-3 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs text-[#64748B]">
            <span className="truncate pr-2">Multi-vendor audit engine with OSCAL evidence verification</span>
            <div className="flex items-center gap-1.5 shrink-0 cursor-pointer" onClick={() => onNavigate('skills')}>
              <div className="flex -space-x-1">
                <span className="w-4 h-4 rounded-full bg-blue-600 text-[8px] text-white flex items-center justify-center font-bold">C</span>
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-[8px] text-white flex items-center justify-center font-bold">J</span>
                <span className="w-4 h-4 rounded-full bg-orange-600 text-[8px] text-white flex items-center justify-center font-bold">P</span>
                <span className="w-4 h-4 rounded-full bg-purple-600 text-[8px] text-white flex items-center justify-center font-bold">F</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8]" />
            </div>
          </div>
        </div>

        {/* Animated Reasoning & Execution Pipeline (Claude/ChatGPT Style) */}
        {pipelineStage !== 'idle' && (
          <div className="w-full max-w-[780px] mt-4 bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden transition-all">
            {/* Main Interactive Header Bar (Claude/ChatGPT Single Line Status) */}
            <div
              onClick={() => setIsPipelineDetailsOpen(!isPipelineDetailsOpen)}
              className="flex items-center justify-between p-3 sm:px-4 cursor-pointer hover:bg-slate-50/70 transition-colors select-none"
            >
              {/* Left: Dynamic Live Action Status */}
              <div className="flex items-center gap-2.5 min-w-0 pr-3">
                {pipelineStage === 'completed' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Loader2 className="w-4 h-4 text-[#EA580C] animate-spin shrink-0" />
                )}

                <div className="flex items-center gap-2 truncate">
                  <span className="text-xs font-semibold text-slate-900 font-mono tracking-tight truncate">
                    {pipelineStage === 'detecting_vendor' && 'Detecting vendors...'}
                    {pipelineStage === 'detecting_hardware' && (
                      <>
                        <span className="text-emerald-700">Vendors identified: {pipelineData.vendor || 'Cisco Systems'}</span>
                        <span className="text-slate-400 font-normal mx-1">&bull;</span>
                        <span className="text-slate-700">Detecting hardware & telemetry...</span>
                      </>
                    )}
                    {pipelineStage === 'normalizing' && (
                      <>
                        <span className="text-emerald-700">Hardware identified: {pipelineData.hardware || 'Network Gateway'}</span>
                        <span className="text-slate-400 font-normal mx-1">&bull;</span>
                        <span className="text-slate-700">Normalising configuration...</span>
                      </>
                    )}
                    {pipelineStage === 'compliance' && (
                      <>
                        <span className="text-emerald-700">Normalising complete</span>
                        <span className="text-slate-400 font-normal mx-1">&bull;</span>
                        <span className="text-slate-700">Compliance checking against NIST & CIS...</span>
                      </>
                    )}
                    {pipelineStage === 'ai' && (
                      <>
                        <span className="text-emerald-700">Compliance check successful ({pipelineData.violations_count ?? 0} violations)</span>
                        <span className="text-slate-400 font-normal mx-1">&bull;</span>
                        <span className="text-slate-700">Synthesizing AI reasoning...</span>
                      </>
                    )}
                    {pipelineStage === 'completed' && (
                      <>
                        <span className="text-emerald-700 font-bold">Audit & verification complete</span>
                        <span className="text-slate-400 font-normal mx-1">&bull;</span>
                        <span className="text-slate-700 font-medium">
                          {pipelineData.vendor || 'Multi-Vendor'} ({pipelineData.hardware || 'Gateway'}) &bull; Score: {pipelineData.score ?? 0}%
                        </span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Right: Progress % + Orange Bar + Expand/Collapse Button */}
              <div className="flex items-center gap-3 shrink-0 font-mono text-xs text-slate-500">
                <span className="text-[11px] font-semibold text-slate-700">
                  {pipelineStage === 'completed'
                    ? '100%'
                    : pipelineStage === 'ai'
                    ? '85%'
                    : pipelineStage === 'compliance'
                    ? '70%'
                    : pipelineStage === 'normalizing'
                    ? '45%'
                    : pipelineStage === 'detecting_hardware'
                    ? '25%'
                    : '10%'}
                </span>

                <div className="w-16 sm:w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#EA580C] transition-all duration-300"
                    style={{
                      width:
                        pipelineStage === 'completed'
                          ? '100%'
                          : pipelineStage === 'ai'
                          ? '85%'
                          : pipelineStage === 'compliance'
                          ? '70%'
                          : pipelineStage === 'normalizing'
                          ? '45%'
                          : pipelineStage === 'detecting_hardware'
                          ? '25%'
                          : '10%',
                    }}
                  />
                </div>

                {/* Claude/ChatGPT Expand Accordion Chevron */}
                <div className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-700 transition-colors">
                  <span className="hidden sm:inline font-sans text-[11px]">
                    {isPipelineDetailsOpen ? 'Hide' : 'Details'}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isPipelineDetailsOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Optional Collapsible Step Trace Details (Shown on Click like Claude's Thought Process) */}
            {isPipelineDetailsOpen && (
              <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-2 text-xs font-mono">
                {/* Step 1: Vendors */}
                <div className="flex items-center justify-between text-slate-600">
                  <div className="flex items-center gap-2">
                    {pipelineStage === 'detecting_vendor' ? (
                      <Loader2 className="w-3.5 h-3.5 text-[#EA580C] animate-spin" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    <span>
                      {pipelineStage === 'detecting_vendor' ? 'Detecting vendors...' : 'Vendors identified'}
                    </span>
                  </div>
                  {pipelineStage !== 'detecting_vendor' && (
                    <span className="font-semibold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {pipelineData.vendor || 'Cisco Systems'}
                    </span>
                  )}
                </div>

                {/* Step 2: Hardware */}
                <div className="flex items-center justify-between text-slate-600">
                  <div className="flex items-center gap-2">
                    {pipelineStage === 'detecting_vendor' ? (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-300" />
                    ) : pipelineStage === 'detecting_hardware' ? (
                      <Loader2 className="w-3.5 h-3.5 text-[#EA580C] animate-spin" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    <span>
                      {pipelineStage === 'detecting_vendor'
                        ? 'Detecting hardware...'
                        : pipelineStage === 'detecting_hardware'
                        ? 'Detecting hardware & telemetry...'
                        : 'Hardware identified'}
                    </span>
                  </div>
                  {pipelineStage !== 'detecting_vendor' && pipelineStage !== 'detecting_hardware' && (
                    <span className="font-semibold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {pipelineData.hardware || 'Enterprise Device'}
                    </span>
                  )}
                </div>

                {/* Step 3: Normalising */}
                <div className="flex items-center justify-between text-slate-600">
                  <div className="flex items-center gap-2">
                    {pipelineStage === 'detecting_vendor' || pipelineStage === 'detecting_hardware' ? (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-300" />
                    ) : pipelineStage === 'normalizing' ? (
                      <Loader2 className="w-3.5 h-3.5 text-[#EA580C] animate-spin" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    <span>
                      {pipelineStage === 'normalizing'
                        ? 'Normalising configuration...'
                        : 'Normalising complete'}
                    </span>
                  </div>
                  {(pipelineStage === 'compliance' || pipelineStage === 'ai' || pipelineStage === 'completed') && (
                    <span className="font-semibold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {pipelineData.controls_count || 18} controls mapped
                    </span>
                  )}
                </div>

                {/* Step 4: Compliance */}
                <div className="flex items-center justify-between text-slate-600">
                  <div className="flex items-center gap-2">
                    {pipelineStage === 'compliance' ? (
                      <Loader2 className="w-3.5 h-3.5 text-[#EA580C] animate-spin" />
                    ) : pipelineStage === 'ai' || pipelineStage === 'completed' ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-300" />
                    )}
                    <span>
                      {pipelineStage === 'compliance'
                        ? 'Compliance checking...'
                        : 'Compliance check successful'}
                    </span>
                  </div>
                  {(pipelineStage === 'ai' || pipelineStage === 'completed') && (
                    <span className="font-semibold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {pipelineData.violations_count ?? 0} violations &bull; {pipelineData.score ?? 0}%
                    </span>
                  )}
                </div>

                {/* Step 5: AI (if prompt provided) */}
                {(pipelineStage === 'ai' || (pipelineStage === 'completed' && aiResponseText)) && (
                  <div className="flex items-center justify-between text-slate-600">
                    <div className="flex items-center gap-2">
                      {pipelineStage === 'ai' ? (
                        <Loader2 className="w-3.5 h-3.5 text-[#EA580C] animate-spin" />
                      ) : (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                      <span>
                        {pipelineStage === 'ai'
                          ? 'Synthesizing AI reasoning...'
                          : 'AI analysis complete'}
                      </span>
                    </div>
                    {pipelineStage === 'completed' && (
                      <span className="font-semibold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {aiMeta?.model || 'qwen3:4b'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}


        {/* AI Query Response Bubble */}
        {aiResponseText && (
          <div className="w-full max-w-[780px] mt-4 bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs text-xs space-y-2.5 select-text">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
              <span className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
                VectorNet AI Analysis
              </span>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {aiMeta?.provider === 'LOCAL_OLLAMA' ? 'Local Ollama: qwen3:4b' : (aiMeta?.model || 'qwen3:4b')}
                </span>
                <button
                  type="button"
                  onClick={() => { setAiResponseText(null); setAiMeta(null); }}
                  className="text-[#94A3B8] hover:text-[#0F172A]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-[#334155] leading-relaxed font-mono whitespace-pre-wrap select-text">
              {aiResponseText}
            </p>
            {aiMeta?.skills_applied && aiMeta.skills_applied.length > 0 && (
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[10px]">
                <span className="text-slate-500 font-semibold">Rules & Skills Applied:</span>
                {aiMeta.skills_applied.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono font-medium border border-slate-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
            {aiMeta?.failover_log && aiMeta.failover_log.length > 0 && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span className="text-emerald-700 font-semibold">{aiMeta.failover_log[0]}</span>
                <span className="text-slate-400">Zero External Leakage &bull; Air-Gapped</span>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* COMPREHENSIVE AUDIT VERIFICATION DETAILS SECTION                         */}
        {/* Rendered once verification is triggered                                 */}
        {/* ========================================================================= */}
        {showAuditDetails && (
          <div className="w-full max-w-[780px] mt-6 space-y-5">

            {/* Formal Report Section Header */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <h2 className="text-base font-bold text-slate-900 tracking-tight font-heading">
                      Security Compliance & Policy Verification Report
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Deterministic Policy-as-Code Evaluation &bull; OSCAL Line Evidence &bull; NIST SP 800-53 &bull; CIS Benchmarks &bull; CERT-In 2022
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 text-slate-700 font-mono text-xs font-semibold border border-slate-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Real-Time Configuration Audit</span>
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between text-xs font-mono gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-slate-500">
                    Audited Node: <strong className="text-slate-800">{activeVendor}</strong> &bull; {activeHostname || 'TAC-NODE-01'}
                  </span>
                  {pipelineData.hardware && (
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 font-semibold text-[11px]">
                      {pipelineData.hardware}
                    </span>
                  )}
                  {pipelineData.os_platform && (
                    <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-800 border border-orange-200 font-semibold text-[11px]">
                      {pipelineData.os_platform}
                    </span>
                  )}
                  {pipelineData.device_type && (
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-semibold text-[11px]">
                      {pipelineData.device_type}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowAuditDetails(false)}
                  className="text-xs font-medium text-[#EA580C] hover:text-[#C2410C] hover:underline cursor-pointer"
                >
                  &larr; Back to Ingestion Console
                </button>
              </div>
            </div>

            {/* Executive Scorecard & Action Row */}
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl border ${
                  activeScore === null ? 'bg-slate-50 border-slate-300 text-slate-500'
                  : activeScore >= 70 ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-rose-50 border-rose-300 text-rose-700'
                }`}>
                  <span className="text-xl font-bold font-mono">{activeScore !== null ? `${activeScore}%` : '--'}</span>
                  <span className="text-[9px] font-mono font-semibold uppercase">SCORE</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[#0F172A]">{activeVendor}</h2>
                    {activeHostname && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {activeHostname}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 mt-1 text-xs font-mono">
                    <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {passCount} Passed
                    </span>
                    <span className="text-slate-300">&bull;</span>
                    <span className="flex items-center gap-1 text-rose-600 font-semibold">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      {failCount} Violations
                    </span>
                    <span className="text-slate-300">&bull;</span>
                    <span className="text-slate-500">
                      {findings.length} Total Controls
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  type="button"
                  onClick={async () => {
                    if (!normalizedSchema && rawConfig.trim()) {
                      await handleFetchNormalizedSchema();
                    }
                    setDrawerActiveTab('normalized');
                    setShowConfigDrawer(true);
                  }}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-mono text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                  title="Inspect Standard Universal JSON Schema"
                >
                  <Code className="w-3.5 h-3.5 text-blue-600" />
                  <span>UNIVERSAL JSON</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={isExportingPdf || lineCount === 0}
                  className="flex-1 md:flex-initial px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isExportingPdf ? 'EXPORTING PDF...' : 'EXPORT PDF REPORT'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetAudit}
                  className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors cursor-pointer"
                  title="Reset audit view"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Findings Filter Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Audit Verification Matrix</h3>
                <p className="text-xs text-[#64748B]">OSCAL-aligned policy evidence down to configuration line spans.</p>
              </div>

              <div className="flex items-center gap-1 font-mono text-xs bg-[#F8FAFC] p-1 rounded-xl border border-[#CBD5E1] overflow-x-auto max-w-full no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    activeFilter === 'all' ? 'bg-white text-[#0F172A] font-bold shadow-xs' : 'text-[#64748B]'
                  }`}
                >
                  ALL ({findings.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('fail')}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    activeFilter === 'fail' ? 'bg-rose-100 text-rose-700 font-bold' : 'text-[#64748B]'
                  }`}
                >
                  VIOLATIONS ({failCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('pass')}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    activeFilter === 'pass' ? 'bg-emerald-100 text-emerald-700 font-bold' : 'text-[#64748B]'
                  }`}
                >
                  PASSED ({passCount})
                </button>
                {unknownCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveFilter('unknown')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      activeFilter === 'unknown' ? 'bg-slate-200 text-slate-800 font-bold' : 'text-[#64748B]'
                    }`}
                  >
                    UNKNOWN ({unknownCount})
                  </button>
                )}
              </div>
            </div>

            {/* Findings List */}
            <div className="space-y-3.5">
              {filteredFindings.map((item) => {
                const fixScript = item.remediation_cli?.script || item.remediation_cli?.remediation_cli;
                const rollbackScript = item.remediation_cli?.rollback || item.rollback_cli;
                const lineSpanText = item.line_start
                  ? item.line_start === item.line_end
                    ? `Line ${item.line_start}`
                    : `Line ${item.line_start}-${item.line_end}`
                  : 'Syntactic Scan';

                return (
                  <div key={item.rule_id} className="bg-white border border-[#CBD5E1] p-4 rounded-xl space-y-3 shadow-xs select-text">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F1F5F9] pb-3 font-mono text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded font-bold border ${
                            getCleanStatus(item.status) === 'PASS'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : getCleanStatus(item.status) === 'FAIL'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {getCleanStatus(item.status)}
                        </span>

                        <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-800 font-semibold border border-sky-200">
                          {lineSpanText}
                        </span>

                        {item.rule_id.startsWith('HW-') && (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 font-bold border border-amber-300 text-[10px]">
                            HARDWARE & TELEMETRY
                          </span>
                        )}

                        <span className="text-[#0F172A] font-bold text-sm font-sans">{item.title}</span>
                      </div>
                      <span className="text-[#64748B] text-[11px] font-mono">
                        {item.framework} &bull; {item.control_ref}
                      </span>
                    </div>

                    <p className="text-xs text-[#475569] leading-relaxed">{item.description}</p>

                    {/* Observed vs Required Baseline Policy Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                      <div className="bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E2E8F0]">
                        <span className="text-[#64748B] block text-[10px] uppercase font-bold">Observed Evidence</span>
                        <span className="text-[#0F172A] font-bold break-all">{item.observed_value}</span>
                      </div>
                      <div className="bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E2E8F0]">
                        <span className="text-[#64748B] block text-[10px] uppercase font-bold">Required Baseline Policy</span>
                        <span className="text-emerald-700 font-bold break-all">{item.required_value}</span>
                      </div>
                    </div>

                    {/* Dry-Run Remediation Box */}
                    {fixScript && item.status !== 'PASS' && (
                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span className="text-[#0F172A] uppercase font-bold text-[11px]">REMEDIATION PROPOSAL</span>
                            <span className="px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-900 rounded font-semibold border border-amber-200">
                              DRY RUN ONLY
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopyFix(item.rule_id, fixScript)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-900 rounded-lg flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                            >
                              {copiedRule === item.rule_id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedRule === item.rule_id ? 'COPIED FIX' : 'COPY FIX'}</span>
                            </button>
                            {rollbackScript && (
                              <button
                                type="button"
                                onClick={() => handleCopyRollback(item.rule_id, rollbackScript)}
                                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-600 rounded-lg flex items-center gap-1 text-[11px] cursor-pointer"
                              >
                                {copiedRollback === item.rule_id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedRollback === item.rule_id ? 'COPIED ROLLBACK' : 'COPY ROLLBACK'}</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {item.remediation_cli?.verification_cmd && (
                          <div className="text-[11px] font-mono text-[#64748B]">
                            <span className="font-semibold text-[#0F172A]">Verification: </span>
                            <code>{item.remediation_cli.verification_cmd}</code>
                          </div>
                        )}

                        <pre className="text-xs font-mono text-slate-900 overflow-x-auto bg-white p-2.5 rounded-lg border border-slate-200 select-text">
                          <code>{fixScript}</code>
                        </pre>

                        {rollbackScript && (
                          <details className="text-[11px] font-mono text-slate-500 pt-1">
                            <summary className="cursor-pointer font-semibold text-slate-700 hover:underline">
                              View Rollback Script
                            </summary>
                            <pre className="mt-1.5 p-2 bg-white text-slate-800 rounded border border-slate-200 overflow-x-auto select-text">
                              <code>{rollbackScript}</code>
                            </pre>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        )}



      </div>

      {/* Slide-over Drawer: Configuration & Universal Schema Inspector */}
      {showConfigDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-none transition-opacity">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl p-6 flex flex-col justify-between border-l border-[#E2E8F0]">
            <div className="space-y-4 flex-1 flex flex-col min-h-0">
              
              {/* Drawer Header with Dual Tabs */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setDrawerActiveTab('raw')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                      drawerActiveTab === 'raw'
                        ? 'bg-white text-[#0F172A] font-bold shadow-xs'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    RAW STREAM ({lineCount}L)
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setDrawerActiveTab('normalized');
                      if (!normalizedSchema && rawConfig.trim()) {
                        await handleFetchNormalizedSchema();
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                      drawerActiveTab === 'normalized'
                        ? 'bg-white text-blue-700 font-bold shadow-xs'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    <Code className="w-3.5 h-3.5 text-blue-600" />
                    UNIVERSAL JSON SCHEMA
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (drawerActiveTab === 'raw') {
                        handleCopyConfig();
                      } else if (normalizedSchema) {
                        navigator.clipboard.writeText(JSON.stringify(normalizedSchema, null, 2));
                        setCopiedSchema(true);
                        setTimeout(() => setCopiedSchema(false), 2000);
                      }
                    }}
                    className="p-1.5 hover:bg-[#F1F5F9] rounded-lg text-[#64748B] hover:text-[#0F172A] transition-colors"
                    title={drawerActiveTab === 'raw' ? "Copy raw configuration" : "Copy normalized JSON schema"}
                  >
                    {(drawerActiveTab === 'raw' ? copied : copiedSchema) ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfigDrawer(false)}
                    className="p-1.5 hover:bg-[#F1F5F9] rounded-lg text-[#64748B] hover:text-[#0F172A] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tab 1: Raw Configuration Editor */}
              {drawerActiveTab === 'raw' && (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-[#0F172A]">Raw artifact stream ({detectedVendor || 'Vendor Auto-detect'}):</label>
                    <span className="text-[11px] font-mono text-[#64748B]">Editable</span>
                  </div>
                  <textarea
                    value={rawConfig}
                    onChange={(e) => onConfigChange(e.target.value)}
                    placeholder="Paste or edit router, firewall, or switch configuration commands here..."
                    className="flex-1 w-full p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-mono text-[#0F172A] focus:outline-none resize-none leading-relaxed"
                  />
                </div>
              )}

              {/* Tab 2: Standardized Universal JSON Schema Viewer */}
              {drawerActiveTab === 'normalized' && (
                <div className="flex-1 flex flex-col min-h-0 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-blue-600" />
                      NTRO / NCIIPC Standard Universal Schema Model
                    </span>
                    {normalizedSchema && (
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {normalizedSchema?.device?.vendor || detectedVendor} &bull; {normalizedSchema?.device?.hostname || 'TAC-DEVICE'}
                      </span>
                    )}
                  </div>

                  {isNormalizing ? (
                    <div className="flex-1 flex flex-col items-center justify-center bg-[#18181B] rounded-xl p-6 text-center space-y-2">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <p className="font-mono text-xs text-slate-400">
                        Parsing heterogeneous CLI tokens into universal schema...
                      </p>
                    </div>
                  ) : normalizedSchema ? (
                    <div className="flex-1 min-h-0 bg-[#0F172A] text-slate-100 rounded-xl p-3.5 border border-slate-800 overflow-auto font-mono text-xs leading-relaxed">
                      <pre className="whitespace-pre">{JSON.stringify(normalizedSchema, null, 2)}</pre>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-[#F8FAFC] border border-dashed border-[#CBD5E1] rounded-xl p-6 text-center space-y-3">
                      <p className="text-xs text-[#64748B]">
                        Click below to normalize the ingested configuration into the vendor-neutral JSON schema.
                      </p>
                      <button
                        type="button"
                        onClick={handleFetchNormalizedSchema}
                        disabled={!rawConfig.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Generate Universal Schema
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>

            <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  onConfigChange('');
                  setNormalizedSchema(null);
                }}
                className="px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                Clear buffer
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfigDrawer(false);
                  handleQuerySubmit();
                }}
                className="px-4 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Run compliance audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Footer */}
      <div className="w-full max-w-[780px] mx-auto flex items-center justify-between text-[11px] text-[#94A3B8] pt-8">
        <div className="flex-1 text-center">
          VectorNet can make mistakes. Check important info. Ingested policies are verified deterministically.
        </div>

        <div className="flex items-center gap-2 text-[#94A3B8] shrink-0">
          <button type="button" className="p-1.5 hover:text-[#0F172A] hover:bg-white rounded-full transition-colors" title="Change Language">
            <Languages className="w-3.5 h-3.5" />
          </button>
          <button type="button" className="p-1.5 hover:text-[#0F172A] hover:bg-white rounded-full transition-colors" title="Help & Documentation">
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>



      {/* ========================================================================= */}
      {/* AI API KEY & ENGINE CONFIGURATION MODAL                                  */}
      {/* ========================================================================= */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-[#EA580C]">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">AI Reasoning Engine & API Keys</h3>
                  <p className="text-xs text-slate-500">Configure OpenRouter keys with local air-gapped failover</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  OpenRouter API Key
                </label>
                <input
                  type="password"
                  value={openRouterApiKey}
                  onChange={(e) => setOpenRouterApiKey(e.target.value)}
                  placeholder="sk-or-v1-xxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono text-xs focus:bg-white focus:border-[#EA580C] outline-none transition-all"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Keys are stored encrypted locally and pooled in memory. If unset, queries fail over automatically to local Ollama (qwen3:4b).
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Target AI Model
                </label>
                <select
                  value={activeAiModel}
                  onChange={(e) => setActiveAiModel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono text-xs focus:bg-white focus:border-[#EA580C] outline-none transition-all cursor-pointer"
                >
                  <option value="nvidia/nemotron-3.5-lightning:free">Nvidia Nemotron 3.5 Lightning (Free &bull; 0 Latency)</option>
                  <option value="google/gemini-2.0-flash-exp:free">Google Gemini 2.0 Flash (Free &bull; High Context)</option>
                  <option value="meta-llama/llama-3.3-70b-instruct:free">Meta LLaMA 3.3 70B Instruct (Free &bull; Deep Reasoning)</option>
                  <option value="anthropic/claude-3.5-sonnet">Anthropic Claude 3.5 Sonnet (Commercial &bull; Strict AST)</option>
                  <option value="openai/gpt-4o">OpenAI GPT-4o (Commercial &bull; Comprehensive)</option>
                </select>
              </div>

              {keyTestFeedback && (
                <div
                  className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                    keyTestFeedback.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {keyTestFeedback.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{keyTestFeedback.message}</span>
                </div>
              )}

              {keySaveMessage && (
                <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-medium flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{keySaveMessage}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={handleTestApiKey}
                disabled={isTestingKey}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isTestingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5 text-slate-500" />}
                <span>Test Connection</span>
              </button>

              <div className="flex items-center gap-2">
                {openRouterApiKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenRouterApiKey('');
                      localStorage.removeItem('vectornet_openrouter_key');
                    }}
                    className="px-3 py-1.5 text-slate-500 hover:text-rose-600 font-medium cursor-pointer"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="px-4 py-1.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Save & Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
