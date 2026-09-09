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

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeUser = mounted ? user : null;
  const userRole = activeUser?.role || 'SUPER_ADMIN';
  const displayName = activeUser?.display_name || 'Priyankar Padhy';
  const email = activeUser?.email || 'priyankar@sentinel.net';
  const initial = displayName.charAt(0) || 'P';

  // Role-based navigation with curated macOS-style colored icons
  const navItems = [
    {
      id: 'ingestion' as NavTab,
      label: 'Ingestion',
      icon: UploadCloud,
      iconColor: 'text-amber-400',
      badgeBg: 'bg-amber-500/15 border-amber-500/30',
      roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR', 'NETWORK_OPERATOR'],
    },
    {
      id: 'overview' as NavTab,
      label: 'Overview',
      icon: LayoutDashboard,
      iconColor: 'text-sky-400',
      badgeBg: 'bg-sky-500/15 border-sky-500/30',
      roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR', 'NETWORK_OPERATOR', 'VIEWER'],
    },
    {
      id: 'tasks' as NavTab,
      label: 'Tasks (Kanban)',
      icon: CheckSquare,
      iconColor: 'text-purple-400',
      badgeBg: 'bg-purple-500/15 border-purple-500/30',
      roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR', 'NETWORK_OPERATOR', 'VIEWER'],
    },
    {
      id: 'skills' as NavTab,
      label: 'Agentic Skills',
      icon: Sparkles,
      iconColor: 'text-pink-400',
      badgeBg: 'bg-pink-500/15 border-pink-500/30',
      roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR'],
    },
    {
      id: 'inventory' as NavTab,
      label: 'Inventory',
      icon: Server,
      iconColor: 'text-blue-400',
      badgeBg: 'bg-blue-500/15 border-blue-500/30',
      roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR', 'NETWORK_OPERATOR', 'VIEWER'],
    },
    {
      id: 'telemetry' as NavTab,
      label: 'Telemetry',
      icon: Activity,
      iconColor: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/15 border-emerald-500/30',
      roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR', 'NETWORK_OPERATOR', 'VIEWER'],
    },
    {
      id: 'auditor' as NavTab,
      label: 'Auditor',
      icon: ShieldCheck,
      iconColor: 'text-rose-400',
      badgeBg: 'bg-rose-500/15 border-rose-500/30',
      roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR'],
    },
    {
      id: 'workbench' as NavTab,
      label: 'Workbench',
      icon: Cpu,
      iconColor: 'text-orange-400',
      badgeBg: 'bg-orange-500/15 border-orange-500/30',
      roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR'],
    },
    {
      id: 'remediation' as NavTab,
      label: 'Remediation',
      icon: Terminal,
      iconColor: 'text-teal-400',
      badgeBg: 'bg-teal-500/15 border-teal-500/30',
      roles: ['SUPER_ADMIN', 'NETWORK_OPERATOR'],
    },
    {
      id: 'reports' as NavTab,
      label: 'Reports',
      icon: FileText,
      iconColor: 'text-slate-300',
      badgeBg: 'bg-slate-500/15 border-slate-500/30',
      roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR', 'VIEWER'],
    },
  ].filter((item) => item.roles.includes(userRole));

  return (
    <aside className="w-64 h-screen sticky top-0 bg-[#0D1117] border-r border-[#1E2638] flex flex-col justify-between p-4 shrink-0 overflow-y-auto z-20 shadow-lg text-slate-200 select-none">
      <div className="space-y-4">
        
        {/* macOS Style Traffic Light Window Controls */}
        <div className="flex items-center gap-2 px-1 pt-1 pb-2">
          <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-black/30 shadow-xs cursor-pointer hover:opacity-80 transition-opacity" />
          <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-black/30 shadow-xs cursor-pointer hover:opacity-80 transition-opacity" />
          <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-black/30 shadow-xs cursor-pointer hover:opacity-80 transition-opacity" />
        </div>

        {/* Brand Header */}
        <div className="flex items-center justify-between px-1.5 py-1 border-b border-[#1E2638] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-xs">
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-white tracking-tight">VECTORNET</h1>
              <p className="text-[10px] text-[#8B949E] font-mono">SIH 2026 Defense Engine</p>
            </div>
          </div>
        </div>

        {/* User Profile Card (Dark Theme) */}
        <div className="bg-[#161B22] border border-[#30363D] p-2.5 rounded-xl space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#21262D] border border-[#30363D] text-white text-[10px] font-bold flex items-center justify-center font-mono shrink-0">
                {initial}
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-white truncate">{displayName}</div>
                <div className="text-[9px] text-[#8B949E] truncate font-mono">{email}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[#21262D] pt-2 text-[10px]">
            <span className={`font-mono font-bold px-2 py-0.5 rounded text-[9px] ${
              userRole === 'SUPER_ADMIN' ? 'bg-red-950/60 text-red-400 border border-red-800/40' :
              userRole === 'SECURITY_AUDITOR' ? 'bg-sky-950/60 text-sky-400 border border-sky-800/40' :
              userRole === 'NETWORK_OPERATOR' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40' : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}>
              {userRole}
            </span>
            <button
              onClick={onOpenAuthModal}
              className="text-[#38BDF8] hover:text-[#7DD3FC] hover:underline font-mono font-semibold flex items-center gap-1 transition-colors"
            >
              <LogOut className="w-3 h-3" />
              Switch
            </button>
          </div>
        </div>

        {/* Navigation Items (macOS Smooth Hover & Colored Icons) */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`group w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all duration-200 ease-out text-left ${
                  isActive
                    ? 'bg-white/[0.10] text-white font-semibold shadow-xs border border-white/[0.12] translate-x-0.5'
                    : 'text-[#8B949E] hover:text-white hover:bg-white/[0.04] hover:translate-x-0.5'
                } active:scale-[0.98]`}
              >
                {/* macOS Style Colored Icon Badge */}
                <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${item.badgeBg}`}>
                  <Icon className={`w-3.5 h-3.5 ${item.iconColor}`} />
                </div>
                
                <span className="truncate tracking-tight flex-1">{item.label}</span>
                
                {/* Active Indicator Dot */}
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active Node Card (Dark Theme) */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-3 space-y-2 mt-4 shadow-xs">
        <div className="text-[10px] font-mono text-[#8B949E] uppercase tracking-wider flex items-center justify-between">
          <span>ACTIVE NODE</span>
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
        </div>
        <div className="text-xs font-bold text-white font-mono truncate">{hostname}</div>
        <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-[#21262D]">
          <span className="text-[#8B949E]">SCORE</span>
          <span className={`font-bold ${complianceScore >= 70 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
            {complianceScore}%
          </span>
        </div>
      </div>
    </aside>
  );
};
