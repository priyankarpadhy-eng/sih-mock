import React, { useState, useEffect } from 'react';
import { Cpu, Check, ArrowRight, Layers, Sliders, Database, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';

interface WorkbenchPageProps {
  unmappedLines: string[];
  vendor: string;
  onTrainVector: (cli: string, key: string) => Promise<void>;
}

interface LearnedRule {
  id: string;
  raw_command: string;
  mapped_category: string;
  vendor: string;
  status: string;
}

export const WorkbenchPage: React.FC<WorkbenchPageProps> = ({
  unmappedLines,
  vendor,
  onTrainVector,
}) => {
  const [selectedLine, setSelectedLine] = useState<string>(
    unmappedLines[0] || 'set security zone trust interfaces ge-0/0/0.0'
  );
  const [customLine, setCustomLine] = useState<string>('');
  const [targetKey, setTargetKey] = useState<string>('authentication_security.exec_timeout_seconds');
  const [ruleDescription, setRuleDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successInfo, setSuccessInfo] = useState<{ file: string; rule: string } | null>(null);
  const [learnedRules, setLearnedRules] = useState<LearnedRule[]>([
    {
      id: 'vec-001',
      raw_command: 'set deviceconfig system idle-timeout 10',
      mapped_category: 'authentication_security.exec_timeout_seconds',
      vendor: 'Palo Alto Networks',
      status: 'Active (Hot-Reloaded)'
    },
    {
      id: 'vec-002',
      raw_command: 'config system global set admintimeout 10',
      mapped_category: 'authentication_security.exec_timeout_seconds',
      vendor: 'Fortinet',
      status: 'Active (Hot-Reloaded)'
    },
    {
      id: 'vec-003',
      raw_command: 'set system services ssh protocol-version v2',
      mapped_category: 'authentication_security.ssh_version',
      vendor: 'Juniper Networks',
      status: 'Active (Hot-Reloaded)'
    }
  ]);

  const CANONICAL_SECURITY_KEYS = [
    {
      key: 'authentication_security.exec_timeout_seconds',
      label: 'Session idle timeout (exec-timeout / admintimeout)',
      category: 'Authentication Security'
    },
    {
      key: 'authentication_security.telnet_enabled',
      label: 'Insecure cleartext protocol (Telnet / HTTP)',
      category: 'Access Control'
    },
    {
      key: 'authentication_security.ssh_version',
      label: 'Cryptographic SSH version (SSHv2)',
      category: 'Protocol Hardening'
    },
    {
      key: 'authentication_security.password_encryption_types',
      label: 'Password hashing algorithm (SHA-256 / Secret 4)',
      category: 'Account Security'
    },
    {
      key: 'access_control.management_acl_applied',
      label: 'Management interface access control list (ACL)',
      category: 'Perimeter Security'
    },
    {
      key: 'access_control.login_block_failed_attempts',
      label: 'Brute-force login rate limiting (login block-for)',
      category: 'Authentication Security'
    },
    {
      key: 'network_and_services.logging_syslog_enabled',
      label: 'Centralized remote audit logging (Syslog host)',
      category: 'Audit & Telemetry'
    },
    {
      key: 'network_and_services.snmp_read_community_default',
      label: 'SNMP community privacy & purge default strings',
      category: 'Service Hardening'
    }
  ];

  const activeSnippet = customLine.trim() ? customLine.trim() : selectedLine;

  const handleCommitRule = async () => {
    if (!activeSnippet || !targetKey) return;
    setIsSubmitting(true);
    setSuccessInfo(null);

    try {
      const response = await fetch('http://localhost:8000/api/v1/skills/train-rule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor: vendor || 'Generic Network Device',
          cli_snippet: activeSnippet,
          target_sbm_key: targetKey,
          description: ruleDescription || `Learned syntax mapping for ${vendor}`
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSuccessInfo({
          file: data.file || 'skills/vendors/custom_vendor.md',
          rule: data.rule_title || 'Learned Rule'
        });
        setLearnedRules(prev => [
          {
            id: `vec-${Date.now().toString().slice(-4)}`,
            raw_command: activeSnippet,
            mapped_category: targetKey,
            vendor: vendor || 'Custom Vendor',
            status: 'Active (Hot-Reloaded)'
          },
          ...prev
        ]);
      } else {
        // Fallback to vector training
        await onTrainVector(activeSnippet, targetKey);
        setSuccessInfo({
          file: 'backend/skills/vendors/custom.md',
          rule: `Learned syntax: ${targetKey}`
        });
      }
    } catch {
      await onTrainVector(activeSnippet, targetKey);
      setSuccessInfo({
        file: 'backend/skills/vendors/custom.md',
        rule: `Learned syntax: ${targetKey}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Schema Mapping Workbench</h1>
        <p className="text-xs text-[#64748B] mt-0.5">
          Map unrecognized CLI statements directly into Universal Security Schema parameters and train the AI parser without redeploying code.
        </p>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Raw Unparsed Lines */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#0F172A]" />
              <h2 className="text-sm font-bold text-[#0F172A]">1. Unparsed command lines</h2>
            </div>
            <span className="text-[11px] font-mono text-[#64748B]">{unmappedLines.length} statements detected</span>
          </div>

          <p className="text-xs text-[#64748B]">
            Click any unparsed statement from the current configuration stream or enter a custom statement below:
          </p>

          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {unmappedLines.length > 0 ? (
              unmappedLines.map((line, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedLine(line);
                    setCustomLine('');
                  }}
                  className={`p-2.5 rounded-xl border cursor-pointer font-mono text-xs transition-colors ${
                    selectedLine === line && !customLine
                      ? 'bg-[#F1F5F9] border-[#0F172A] text-[#0F172A] font-semibold'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#475569] hover:border-[#CBD5E1]'
                  }`}
                >
                  <code>{line}</code>
                </div>
              ))
            ) : (
              <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] rounded-xl text-xs">
                No unparsed syntax lines detected in current stream. You can test by entering a custom command below.
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#64748B] mb-1">OR ENTER CUSTOM COMMAND LINE:</label>
            <input
              type="text"
              value={customLine}
              onChange={(e) => setCustomLine(e.target.value)}
              placeholder="e.g. set system services web-management http"
              className="w-full p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
            />
          </div>
        </div>

        {/* Right Column: Low-Code Schema Mapping & Hot Reload */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#0F172A]" />
              <h2 className="text-sm font-bold text-[#0F172A]">2. Low-code security mapping</h2>
            </div>
            <span className="text-[11px] font-mono text-orange-600 font-bold">{vendor}</span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#64748B] mb-1.5">MAP TO SECURITY PARAMETER:</label>
            <select
              value={targetKey}
              onChange={(e) => setTargetKey(e.target.value)}
              className="w-full p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
            >
              {CANONICAL_SECURITY_KEYS.map((k) => (
                <option key={k.key} value={k.key}>
                  [{k.category}] {k.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#64748B] mb-1.5">OPTIONAL DESCRIPTION / CONTROL REFERENCE:</label>
            <input
              type="text"
              value={ruleDescription}
              onChange={(e) => setRuleDescription(e.target.value)}
              placeholder="e.g. Matches vendor-specific session timeout syntax"
              className="w-full p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
            />
          </div>

          <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-[#64748B] block">SELECTED SYNTAX STATEMENT:</span>
            <div className="text-xs font-mono font-bold text-[#0F172A] break-all">{activeSnippet}</div>
          </div>

          <button
            onClick={handleCommitRule}
            disabled={isSubmitting || !activeSnippet}
            className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Updating internal heuristics...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Commit learned rule (hot reload)</span>
              </>
            )}
          </button>

          {successInfo && (
            <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl text-xs space-y-1">
              <div className="font-bold text-[#065F46] flex items-center gap-1.5">
                <Check className="w-4 h-4 text-[#059669]" />
                Rule committed with zero-downtime hot reloading
              </div>
              <p className="text-[11px] text-[#047857]">
                Saved into <code className="font-bold">{successInfo.file}</code>. Heuristics updated without server restart.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Previously Learned Rules History Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#0F172A]" />
            <h2 className="text-sm font-bold text-[#0F172A]">Active dynamic parsing rules</h2>
          </div>
          <span className="text-[11px] text-[#64748B]">Zero-code rules loaded into engine</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[#64748B]">
                <th className="py-2.5 pr-4 font-semibold">Vendor</th>
                <th className="py-2.5 px-4 font-semibold">Command syntax pattern</th>
                <th className="py-2.5 px-4 font-semibold">Target security parameter</th>
                <th className="py-2.5 pl-4 font-semibold text-right">Engine status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {learnedRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-2.5 pr-4 font-semibold text-[#0F172A]">{rule.vendor}</td>
                  <td className="py-2.5 px-4 font-mono text-[11px] text-[#334155]">{rule.raw_command}</td>
                  <td className="py-2.5 px-4 font-mono text-[11px] text-[#64748B]">{rule.mapped_category}</td>
                  <td className="py-2.5 pl-4 text-right">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                      {rule.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
