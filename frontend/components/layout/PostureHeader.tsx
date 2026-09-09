import React from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert, Cpu, CheckCircle2 } from 'lucide-react';

interface PostureHeaderProps {
  score: number;
  totalChecks: number;
  passedCount: number;
  failedCount: number;
  warningCount: number;
  hostname: string;
  vendor: string;
}

export const PostureHeader: React.FC<PostureHeaderProps> = ({
  score,
  totalChecks,
  passedCount,
  failedCount,
  warningCount,
  hostname,
  vendor,
}) => {
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-tactical-pass border-tactical-pass';
    if (s >= 50) return 'text-tactical-warning border-tactical-warning';
    return 'text-tactical-critical border-tactical-critical';
  };

  const getScoreBg = (s: number) => {
    if (s >= 80) return 'bg-tactical-pass/10';
    if (s >= 50) return 'bg-tactical-warning/10';
    return 'bg-tactical-critical/10';
  };

  return (
    <header className="bg-toc-surface border-b border-toc-border p-6 rounded-lg mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        
        {/* Left: Platform Title & System Telemetry */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-tactical-cyan animate-pulse"></span>
            <span className="text-xs font-mono tracking-widest text-tactical-cyan uppercase">VECTORNET // TOC COMMAND ENGINE</span>
          </div>
          <h1 className="text-2xl font-bold text-toc-heading tracking-tight flex items-center gap-3">
            {hostname}
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-toc-border text-toc-text border border-toc-border/80">
              {vendor}
            </span>
          </h1>
          <p className="text-sm text-toc-text font-normal max-w-xl">
            Real-time compliance scorecard & threat matrix across military and enterprise security frameworks.
          </p>
        </div>

        {/* Center: Overall Compliance Score Meter */}
        <div className={`flex items-center gap-4 px-6 py-4 rounded-md border ${getScoreColor(score)} ${getScoreBg(score)}`}>
          <div className="text-center">
            <div className="text-xs uppercase font-mono tracking-wider opacity-80 mb-0.5">COMPLIANCE SCORE</div>
            <div className="text-3xl font-bold font-mono tracking-tight">{score}%</div>
          </div>
          <div className="h-10 w-px bg-toc-border opacity-40"></div>
          <div className="space-y-1 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-tactical-pass"></span>
              <span>PASSED: {passedCount}/{totalChecks}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-tactical-critical"></span>
              <span>FAILED: {failedCount}/{totalChecks}</span>
            </div>
          </div>
        </div>

        {/* Right: Active Framework Badges */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="bg-toc-bg border border-toc-border px-3 py-2 rounded flex items-center justify-between gap-3">
            <span className="text-toc-text">NIST SP 800-53</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-tactical-cyan" />
          </div>
          <div className="bg-toc-bg border border-toc-border px-3 py-2 rounded flex items-center justify-between gap-3">
            <span className="text-toc-text">CIS BENCHMARK</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-tactical-cyan" />
          </div>
          <div className="bg-toc-bg border border-toc-border px-3 py-2 rounded flex items-center justify-between gap-3">
            <span className="text-toc-text">DISA STIG</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-tactical-cyan" />
          </div>
          <div className="bg-toc-bg border border-toc-border px-3 py-2 rounded flex items-center justify-between gap-3">
            <span className="text-toc-text">ISO/IEC 27001</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-tactical-cyan" />
          </div>
        </div>

      </div>
    </header>
  );
};
