import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  Server,
  Activity,
  ShieldCheck,
  Cpu,
  Terminal,
  FileText,
  Flame,
  CheckSquare,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { UserProfile } from '../modals/AuthModal';

export type NavTab = 'overview' | 'ingestion' | 'inventory' | 'telemetry' | 'auditor' | 'workbench' | 'remediation' | 'tasks' | 'skills' | 'reports';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  complianceScore: number;
  hostname: string;
  user: UserProfile | null;
  onOpenAuthModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  complianceScore,
  hostname,
  user,
  onOpenAuthModal,
}) => {
  const [mounted, setMounted] = useState(false);
  const [localAi, setLocalAi] = useState<{ online: boolean; model: string; endpoint: string }>({
    online: true,
    model: 'qwen3:4b',
    endpoint: 'http://localhost:11434'
  });

  useEffect(() => {
    setMounted(true);
    const checkLocalAi = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/v1/ai/config');
        if (res.ok) {
          const data = await res.json();
          setLocalAi({
            online: data.local_ai?.status === 'ONLINE',
            model: data.local_ai?.model || 'qwen3:4b',
            endpoint: data.local_ai?.endpoint || 'http://localhost:11434'
          });
        }
      } catch {
        // keep fallback or offline
      }
    };
    checkLocalAi();
    const interval = setInterval(checkLocalAi, 15000);
    return () => clearInterval(interval);
  }, []);

  const activeUser = mounted ? user : null;
  const userRole = activeUser?.role || 'SUPER_ADMIN';
  const displayName = activeUser?.display_name || 'Priyankar Padhy';
  const email = activeUser?.email || 'priyankar@sentinel.net';
  const initial = displayName.charAt(0) || 'P';

  // Role-based navigation with curated colored icons
  const navItems = [
    {
      id: 'ingestion' as NavTab,
      label: 'Ingestion',
      icon: UploadCloud,
      iconColor: 'text-amber-600',
      badgeBg: 'bg-amber-50 border-amber-200',
      roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR', 'NETWORK_OPERATOR'],
    },
    {
      id: 'overview' as NavTab,
      label: 'Overview',
      icon: LayoutDashboard,
      iconColor: 'text-sky-600',
      badgeBg: 'bg-sky-50 border-sky-200',
      roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR', 'NETWORK_OPERATOR', 'VIEWER'],
    },
    {
      id: 'tasks' as NavTab,
      label: 'Tasks (Kanban)',
      icon: CheckSquare,
      iconColor: 'text-purple-600',
      badgeBg: 'bg-purple-50 border-purple-200',
      roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR', 'NETWORK_OPERATOR', 'VIEWER'],
    },
    {
      id: 'skills' as NavTab,
      label: 'Agentic Skills',
      icon: Sparkles,
      iconColor: 'text-pink-600',
      badgeBg: 'bg-pink-50 border-pink-200',
      roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR'],
    },
    {
      id: 'inventory' as NavTab,
      label: 'Inventory',
      icon: Server,
      iconColor: 'text-blue-600',
      badgeBg: 'bg-blue-50 border-blue-200',
      roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR', 'NETWORK_OPERATOR', 'VIEWER'],
    },
    {
      id: 'telemetry' as NavTab,
      label: 'Telemetry',
      icon: Activity,
      iconColor: 'text-emerald-600',
      badgeBg: 'bg-emerald-50 border-emerald-200',
      roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR', 'NETWORK_OPERATOR', 'VIEWER'],
    },
    {
      id: 'workbench' as NavTab,
      label: 'Workbench',
      icon: Cpu,
      iconColor: 'text-orange-600',
      badgeBg: 'bg-orange-50 border-orange-200',
      roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR'],
    },
    {
      id: 'remediation' as NavTab,
      label: 'Remediation',
      icon: Terminal,
      iconColor: 'text-teal-600',
      badgeBg: 'bg-teal-50 border-teal-200',
      roles: ['SUPER_ADMIN', 'NETWORK_OPERATOR'],
    },
    {
      id: 'reports' as NavTab,
      label: 'Reports',
      icon: FileText,
      iconColor: 'text-slate-600',
      badgeBg: 'bg-slate-100 border-slate-200',
      roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR', 'VIEWER'],
    },
  ].filter((item) => item.roles.includes(userRole));

  return (
    <aside className="w-64 h-screen sticky top-0 bg-white border-r border-slate-200 flex flex-col justify-between p-4 shrink-0 overflow-y-auto z-20 shadow-xs text-slate-800 select-none">
      <div className="space-y-4">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-1.5 py-1 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 shadow-xs">
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-slate-900 tracking-tight">VECTORNET</h1>
              <p className="text-[10px] text-slate-500 font-mono">SIH 2026 Defense Engine</p>
            </div>
          </div>
        </div>

        {/* User Profile Card (White / Neutral Theme) */}
        <div className="bg-slate-50/80 border border-slate-200 p-2.5 rounded-xl space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-slate-200 border border-slate-300 text-slate-800 text-[10px] font-bold flex items-center justify-center font-mono shrink-0">
                {initial}
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-slate-900 truncate">{displayName}</div>
                <div className="text-[9px] text-slate-500 truncate font-mono">{email}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200/80 pt-2 text-[10px]">
            <span className={`font-mono font-bold px-2 py-0.5 rounded text-[9px] ${
              userRole === 'SUPER_ADMIN' ? 'bg-red-50 text-red-700 border border-red-200' :
              userRole === 'SECURITY_AUDITOR' ? 'bg-sky-50 text-sky-700 border border-sky-200' :
              userRole === 'NETWORK_OPERATOR' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}>
              {userRole}
            </span>
            <button
              onClick={onOpenAuthModal}
              className="text-blue-600 hover:text-blue-700 hover:underline font-mono font-semibold flex items-center gap-1 transition-colors"
            >
              <LogOut className="w-3 h-3" />
              Switch
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || (item.id === 'ingestion' && activeTab === 'auditor');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`group w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all duration-150 ease-out text-left ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 font-semibold shadow-2xs border border-slate-200/80 translate-x-0.5'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:translate-x-0.5'
                } active:scale-[0.98]`}
              >
                {/* Colored Icon Badge */}
                <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-105 ${item.badgeBg}`}>
                  <Icon className={`w-3.5 h-3.5 ${item.iconColor}`} />
                </div>
                
                <span className="truncate tracking-tight flex-1">{item.label}</span>
                
                {/* Active Indicator Dot */}
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Local AI Engine Status Card */}
      <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-2.5 space-y-1 mt-auto shadow-2xs">
        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-semibold text-slate-700">
            <Cpu className="w-3 h-3 text-blue-600" />
            <span>LOCAL AI</span>
          </span>
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${localAi.online ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className={`text-[9px] font-bold font-mono ${localAi.online ? 'text-emerald-600' : 'text-rose-600'}`}>
              {localAi.online ? 'ONLINE' : 'OFFLINE'}
            </span>
          </span>
        </div>
        <div className="text-xs font-bold text-slate-900 font-mono flex items-center justify-between pt-0.5">
          <span className="truncate">{localAi.model}</span>
          <span className="text-[10px] text-slate-500 font-normal">:11434</span>
        </div>
        <div className="text-[9px] text-slate-500 font-mono truncate">
          {localAi.online ? 'Air-Gapped • Zero Data Leakage' : 'Run: ollama run qwen3:4b'}
        </div>
      </div>

      {/* Active Node Card */}
      <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 space-y-2 mt-2 shadow-2xs">
        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider flex items-center justify-between">
          <span>ACTIVE NODE</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <div className="text-xs font-bold text-slate-900 font-mono truncate">{hostname}</div>
        <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-slate-200/80">
          <span className="text-slate-500">SCORE</span>
          <span className={`font-bold ${complianceScore >= 70 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {complianceScore}%
          </span>
        </div>
      </div>
    </aside>
  );
};
