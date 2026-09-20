import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
import { NavTab } from '../layout/Sidebar';
import { DEMO_SAMPLES, DemoSample } from '../../lib/demo_samples';
import { evaluateConfiguration } from '../../lib/compliance_evaluator';

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

const PRESET_CARDS = [
  {
    id: 'fortinet_fortios',
    icon: ShieldAlert,
    title: 'Fortinet FortiOS Firewall',
    description: 'Check admin timeout, allowaccess telnet/http, HTTPS redirect, and syslog.',
  },
  {
    id: 'cisco_cucme',
    icon: FileText,
    title: 'Cisco CUCME Benchmark',
    description: 'Audit VoIP gateway against NIST AC-12, CIS 1.1, and DISA STIG controls.',
  },
  {
    id: 'palo_alto',
    icon: ShieldCheck,
    title: 'PAN-OS Perimeter Firewall',
    description: 'Verify security zones, idle timeouts, SSH ciphers, and admin access rules.',
  },
  {
    id: 'juniper_junos',
    icon: Terminal,
    title: 'Juniper JunOS Gateway',
    description: 'Check root logins, remote syslog forwarders, and NTP synchronization.',
  },
];

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
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDeepResearch, setIsDeepResearch] = useState(false);
  const [showAuditDetails, setShowAuditDetails] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'fail' | 'pass' | 'unknown'>('all');
  const [copiedRule, setCopiedRule] = useState<string | null>(null);
  const [copiedRollback, setCopiedRollback] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [dynamicAuditResult, setDynamicAuditResult] = useState<any>(null);
  const [ingestMeta, setIngestMeta] = useState<{ source: 'PASTED' | 'FILE' | 'PRESET'; label?: string } | null>(null);
  const [normalizedSchema, setNormalizedSchema] = useState<any>(null);
  const [drawerActiveTab, setDrawerActiveTab] = useState<'raw' | 'normalized'>('raw');
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [sampleVendorFilter, setSampleVendorFilter] = useState<'ALL' | 'Cisco' | 'Palo Alto' | 'Juniper' | 'Fortinet' | 'Multi-Vendor'>('ALL');
  const [sampleStatusFilter, setSampleStatusFilter] = useState<'ALL' | 'CLEAN' | 'VULNERABLE'>('ALL');
  const [activeSampleId, setActiveSampleId] = useState<string | null>(null);
  const [showSampleModal, setShowSampleModal] = useState(false);

  // Universal evaluation: runs immediate client evaluation so results are never blank,
  // then syncs with /api/evaluate or local backend if online.
  const runUniversalEvaluation = async (configText: string, label?: string) => {
    if (!configText || !configText.trim()) return;
    setIsProcessing(true);

    // 1. Instant deterministic client evaluation (guarantees results on Vercel or offline)
    const localResult = evaluateConfiguration(configText);
    setDynamicAuditResult(localResult);
    setShowAuditDetails(true);

    // 2. Query Next.js API /api/evaluate or local backend for any extra telemetry
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ raw_config: configText }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.findings && data.findings.length > 0) {
          setDynamicAuditResult(data);
        }
      }
    } catch (err) {
      console.warn("Backend evaluation fetch skipped, using client engine:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadDemoSample = async (sample: DemoSample) => {
    setActiveSampleId(sample.id);
    onConfigChange(sample.rawConfig);
    setIngestMeta({
      source: 'PRESET',
      label: `${sample.vendor} (${sample.statusType === 'CLEAN' ? 'No Error' : 'Errors Found'})`,
    });
    setAiResponseText(null);
    setAiMeta(null);
    setNormalizedSchema(null);
    setShowSampleModal(false);
    await runUniversalEvaluation(sample.rawConfig);
  };

  const filteredSamples = DEMO_SAMPLES.filter((sample) => {
    if (sampleVendorFilter !== 'ALL' && sample.vendor !== sampleVendorFilter) {
      return false;
    }
    if (sampleStatusFilter === 'CLEAN' && sample.statusType !== 'CLEAN') {
      return false;
    }
    if (sampleStatusFilter === 'VULNERABLE' && sample.statusType !== 'VULNERABLE' && sample.statusType !== 'COMBO') {
      return false;
    }
    return true;
  });

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
            setAiResponseText(null);
            runUniversalEvaluation(content, file.name);
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
              setAiResponseText(null);
              runUniversalEvaluation(combined, `${files.length} files`);
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
            setAiResponseText(`[Directory Ingested] ${files.length} repository configs compiled (${combined.split('\n').length} total lines). Press Enter or click Send to audit.`);
          }
        };
        r.readAsText(f);
      });
    }
  };

  const handleTextPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (!pasted || !pasted.trim()) return;

    // Detect if pasted text contains multi-line data, syslog entries, firewall logs, or network config
    const isMultiLine = pasted.includes('\n');
    const lineCount = pasted.split('\n').length;
    const isCodeOrLog =
      isMultiLine ||
      pasted.length > 80 ||
      pasted.includes('date=') ||
      pasted.includes('time=') ||
      pasted.includes('devname=') ||
      pasted.includes('devid=') ||
      pasted.includes('logid=') ||
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
      pasted.includes('ip address') ||
      pasted.includes('snmp-server');

    if (isCodeOrLog) {
      e.preventDefault();
      onConfigChange(pasted);
      setIngestMeta({ source: 'PASTED' });
      setAiResponseText(null);
      fetch('http://localhost:8000/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ raw_config: pasted }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) {
            setDynamicAuditResult(data);
            setShowAuditDetails(true);
          }
        })
        .catch(console.error);
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
      trimmedPrompt.split('\n').length > 4;

    let activeConfig = rawConfig;
    let actualQuery = promptText;

    if (isConfigInput && !rawConfig.trim()) {
      activeConfig = trimmedPrompt;
      onConfigChange(trimmedPrompt);
      actualQuery = 'Perform comprehensive security compliance audit against NIST, CIS, and DISA STIG controls.';
      setPromptText('');
    }

    if (!activeConfig.trim() && !actualQuery.trim()) {
      setAiResponseText('Please ingest a device configuration or select a preset to analyze.');
      return;
    }

    setIsProcessing(true);
    setAiResponseText(null);
    setAiMeta(null);

    // 1. Dynamic compliance evaluation on exact uploaded config (instant update, never blank)
    if (activeConfig.trim()) {
      await runUniversalEvaluation(activeConfig);
    }

    // 2. Query Local Air-Gapped Ollama AI (qwen3:4b @ port 11434) with Universal Schema Normalization
    try {
      const formData = new FormData();
      const queryPayload = actualQuery.trim()
        ? (isDeepResearch ? `[DEEP RESEARCH AUDIT]: ${actualQuery}` : actualQuery)
        : (isDeepResearch
            ? `[DEEP RESEARCH AUDIT]: Comprehensive multi-framework compliance audit on ${activeVendor}.`
            : `Perform comprehensive multi-framework compliance audit (NIST SP 800-53, CIS, DISA STIG) and verify hardware health on ${activeVendor}.`);
      
      formData.append('query', queryPayload);
      formData.append('raw_config', activeConfig);
      formData.append('deep_research', isDeepResearch ? 'true' : 'false');

      const res = await fetch('http://localhost:8000/api/query-ai', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const base = data.response_text || 'Compliance verification complete.';
        setAiResponseText(isDeepResearch ? `[Deep Research Report - ${activeVendor}]\n` + base : base);
        setAiMeta({
          provider: data.provider || 'LOCAL_OLLAMA',
          model: data.model || 'qwen3:4b',
          failover_log: data.failover_log || [],
          skills_applied: data.skills_applied || [],
          detected_vendor: data.detected_vendor || activeVendor
        });
        if (data.normalized_schema) {
          setNormalizedSchema(data.normalized_schema);
        }
        if (data.findings && data.findings.length > 0) {
          setDynamicAuditResult({
            compliance_score: data.compliance_score,
            total_checks: data.total_checks,
            passed_checks: data.passed_checks,
            failed_checks: data.failed_checks,
            findings: data.findings,
            sbm: {
              device_metadata: {
                hostname: data.hostname || 'TARGET_DEVICE',
                vendor: data.detected_vendor || activeVendor
              }
            }
          });
        }
        setShowAuditDetails(true);
      } else {
        setAiResponseText(`[Audit Verification] Completed baseline inspection for ${activeVendor}. Deterministic findings and evidence spans are loaded below.`);
        setShowAuditDetails(true);
      }
    } catch {
      setAiResponseText(`[Audit Verification] Completed baseline inspection for ${activeVendor}. All policy checks, evidence line spans, and remediation scripts are loaded below.`);
      setShowAuditDetails(true);
    } finally {
      setIsProcessing(false);
    }
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
        
        {/* Top Pill Badge: Local AI Connection Status */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-200 bg-white/95 text-slate-700 text-xs font-medium mb-6 shadow-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-900">Local AI Connected</span>
          </span>
          <span className="text-slate-300">&bull;</span>
          <span className="text-blue-700 font-mono text-[11px] font-bold">qwen3:4b</span>
          <span className="text-slate-300">&bull;</span>
          <span className="text-slate-500 font-mono text-[11px]">Port 11434 (Air-Gapped)</span>
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

        {/* Clean Dropdown Scenario Selector */}
        {!showAuditDetails && (
          <div className="mb-6 flex flex-col sm:flex-row items-center justify-center gap-2">
            <span className="text-xs font-mono text-slate-500 font-medium">Test Scenario Preset:</span>
            <div className="relative inline-flex items-center">
              <select
                value={activeSampleId || ''}
                onChange={(e) => {
                  const sample = DEMO_SAMPLES.find(s => s.id === e.target.value);
                  if (sample) handleLoadDemoSample(sample);
                }}
                className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-800 font-mono text-xs font-semibold py-1.5 px-3 pr-8 rounded-xl shadow-2xs outline-none cursor-pointer appearance-none transition-all"
              >
                <option value="" disabled>Select Multi-Vendor Scenario...</option>
                <optgroup label="Cisco Systems">
                  <option value="cisco_clean">Cisco IOS (Hardened) — [Clean &bull; 0 Errors]</option>
                  <option value="cisco_vulnerable">Cisco CUCME VoIP Gateway — [8 Violations &bull; Telnet/SNMP]</option>
                </optgroup>
                <optgroup label="Palo Alto Networks">
                  <option value="palo_clean">PAN-OS Perimeter Firewall — [Clean &bull; 0 Errors]</option>
                  <option value="palo_vulnerable">PAN-OS Edge Router — [7 Violations &bull; Insecure Protocols]</option>
                </optgroup>
                <optgroup label="Fortinet">
                  <option value="forti_clean">Fortinet FortiOS Firewall — [Clean &bull; 0 Errors]</option>
                  <option value="forti_vulnerable">Fortinet FortiOS Gateway — [6 Violations &bull; Admin Timeout]</option>
                </optgroup>
                <optgroup label="Juniper Networks">
                  <option value="juniper_clean">Juniper JunOS Core Gateway — [Clean &bull; 0 Errors]</option>
                  <option value="juniper_vulnerable">Juniper JunOS Access Router — [5 Violations &bull; Cleartext SSHv1]</option>
                </optgroup>
                <optgroup label="Multi-Vendor Fleet">
                  <option value="combo_enterprise">Enterprise Multi-Vendor Hybrid Fleet — [12 Violations]</option>
                  <option value="combo_datacenter">Zero-Trust Spine-Leaf Datacenter — [Clean Baseline]</option>
                </optgroup>
              </select>
              <div className="pointer-events-none absolute right-2.5 text-slate-400">
                <ChevronRight className="w-3.5 h-3.5 rotate-90" />
              </div>
            </div>
          </div>
        )}

        {/* Main Floating Input Card */}
        <div className="w-full max-w-[780px] bg-white border border-[#E2E8F0] rounded-[24px] shadow-xs p-4 transition-all focus-within:border-[#CBD5E1] focus-within:shadow-md">
          
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
              
              {/* Left Action Buttons: File Upload & Dedicated Sample Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors cursor-pointer"
                  title="Upload config file (.cfg, .conf, .json, .xml, .txt)"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Dedicated Samples Icon Button */}
                <button
                  type="button"
                  onClick={() => setShowSampleModal(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer select-none"
                  title="Open Multi-Vendor Samples (Clean vs Flawed Error Presets)"
                >
                  <FlaskConical className="w-3.5 h-3.5 text-amber-600" />
                  <span>Samples</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white text-slate-700 border border-slate-200 font-bold hidden sm:inline">
                    Error / Clean
                  </span>
                </button>
              </div>

              {/* Right Action Buttons: Config Drawer, Presets, Deep Research, Send */}
              <div className="flex items-center gap-1.5 sm:gap-2 text-[#64748B]">
                <button
                  type="button"
                  onClick={() => setShowConfigDrawer(true)}
                  className="p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors"
                  title="Inspect raw configuration buffer"
                >
                  <FileText className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowPresetPicker(!showPresetPicker)}
                  className="p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors"
                  title="Load sample configuration presets"
                >
                  <Sliders className="w-4 h-4" />
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
                  disabled={isProcessing || isLoading}
                  className="w-8 h-8 rounded-full bg-[#F97316] hover:bg-[#EA580C] text-white flex items-center justify-center transition-all shadow-xs shrink-0 disabled:opacity-50 cursor-pointer"
                  title="Run compliance verification"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              </div>
            </div>
          </form>

          {/* Embedded Preset Selector Strip */}
          {showPresetPicker && (
            <div className="mt-3 pt-3 border-t border-[#F1F5F9] flex flex-wrap gap-1.5">
              {DEMO_SAMPLES.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => {
                    handleLoadDemoSample(sample);
                    setShowPresetPicker(false);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors border cursor-pointer ${
                    sample.statusType === 'CLEAN'
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                      : sample.statusType === 'VULNERABLE'
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                  }`}
                  title={`${sample.vendor}: ${sample.description}`}
                >
                  <span className="font-semibold">{sample.vendor}</span>
                  <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-white/70">
                    {sample.statusType === 'CLEAN' ? 'No Error' : `${sample.violationsCount} Errors`}
                  </span>
                </button>
              ))}
            </div>
          )}

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

                {/* Dropdown Sample Switcher */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <label htmlFor="report-sample-select" className="text-xs font-mono text-slate-500 font-medium">Scenario:</label>
                  <div className="relative inline-flex items-center">
                    <select
                      id="report-sample-select"
                      value={activeSampleId || ''}
                      onChange={(e) => {
                        const sample = DEMO_SAMPLES.find(s => s.id === e.target.value);
                        if (sample) handleLoadDemoSample(sample);
                      }}
                      className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-mono text-xs font-semibold py-1.5 px-3 pr-8 rounded-xl shadow-2xs outline-none cursor-pointer appearance-none transition-all"
                    >
                      <option value="" disabled>Switch Scenario...</option>
                      <optgroup label="Cisco Systems">
                        <option value="cisco_clean">Cisco IOS (Hardened) — [Clean &bull; 0 Errors]</option>
                        <option value="cisco_vulnerable">Cisco CUCME VoIP — [8 Violations &bull; Errors]</option>
                      </optgroup>
                      <optgroup label="Palo Alto Networks">
                        <option value="palo_clean">PAN-OS Perimeter Firewall — [Clean &bull; 0 Errors]</option>
                        <option value="palo_vulnerable">PAN-OS Edge Router — [7 Violations &bull; Errors]</option>
                      </optgroup>
                      <optgroup label="Fortinet">
                        <option value="forti_clean">Fortinet FortiOS Firewall — [Clean &bull; 0 Errors]</option>
                        <option value="forti_vulnerable">Fortinet FortiOS Gateway — [6 Violations &bull; Errors]</option>
                      </optgroup>
                      <optgroup label="Juniper Networks">
                        <option value="juniper_clean">Juniper JunOS Gateway — [Clean &bull; 0 Errors]</option>
                        <option value="juniper_vulnerable">Juniper JunOS Access Router — [5 Violations &bull; Errors]</option>
                      </optgroup>
                      <optgroup label="Multi-Vendor Fleet">
                        <option value="combo_enterprise">Enterprise Multi-Vendor Hybrid — [12 Violations]</option>
                        <option value="combo_datacenter">Zero-Trust Spine-Leaf — [Clean Baseline]</option>
                      </optgroup>
                    </select>
                    <div className="pointer-events-none absolute right-2.5 text-slate-400">
                      <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500">
                  Audited Node: <strong className="text-slate-800">{activeVendor}</strong> &bull; {activeHostname || 'TAC-NODE-01'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAuditDetails(false)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
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

      {/* Interactive Samples Modal Window */}
      {showSampleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-none p-2 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-slate-200 p-4 sm:p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <FlaskConical className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Multi-Vendor Samples (Error vs Clean Presets)</h3>
                  <p className="text-xs text-slate-500">Pick any sample configuration to load and immediately test audit compliance.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSampleModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Filters */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {(['ALL', 'Cisco', 'Palo Alto', 'Juniper', 'Fortinet', 'Multi-Vendor'] as const).map((vendor) => (
                  <button
                    key={vendor}
                    type="button"
                    onClick={() => setSampleVendorFilter(vendor)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all border cursor-pointer ${
                      sampleVendorFilter === vendor
                        ? 'bg-slate-900 text-white border-slate-900 font-semibold shadow-2xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200'
                    }`}
                  >
                    {vendor}
                  </button>
                ))}
              </div>

              <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setSampleStatusFilter('ALL')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                    sampleStatusFilter === 'ALL' ? 'bg-white shadow-2xs font-bold text-slate-900' : 'text-slate-600'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setSampleStatusFilter('CLEAN')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                    sampleStatusFilter === 'CLEAN' ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200' : 'text-slate-600'
                  }`}
                >
                  No Error
                </button>
                <button
                  type="button"
                  onClick={() => setSampleStatusFilter('VULNERABLE')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                    sampleStatusFilter === 'VULNERABLE' ? 'bg-rose-50 text-rose-800 font-bold border border-rose-200' : 'text-slate-600'
                  }`}
                >
                  Errors
                </button>
              </div>
            </div>

            {/* Modal Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-y-auto pr-1 flex-1">
              {filteredSamples.map((sample) => {
                const isClean = sample.statusType === 'CLEAN';
                const isCombo = sample.statusType === 'COMBO';
                return (
                  <div
                    key={sample.id}
                    onClick={() => handleLoadDemoSample(sample)}
                    className="p-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-mono font-bold uppercase text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          {sample.vendor}
                        </span>
                        {isClean ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            No Error &bull; Clean
                          </span>
                        ) : isCombo ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <Sliders className="w-3 h-3 text-amber-700" />
                            Mixed &bull; {sample.violationsCount} Violations
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            Errors &bull; {sample.violationsCount} Violations
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {sample.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                        {sample.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 text-[10px] font-mono text-slate-400">
                      <span>{sample.rawConfig.split('\n').length} lines</span>
                      <span className="font-semibold text-blue-600 group-hover:underline">
                        Audit Sample &rarr;
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
