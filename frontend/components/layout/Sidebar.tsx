import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  ShieldCheck,
  Cpu,
  Terminal,
  FileText,
  CheckSquare,
  Sparkles,
  LogOut,
  Menu,
  X,
  Settings,
  History,
} from 'lucide-react';
import { UserProfile } from '../modals/AuthModal';

export type NavTab = 'overview' | 'ingestion' | 'history' | 'auditor' | 'workbench' | 'remediation' | 'tasks' | 'skills' | 'reports' | 'settings';

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [localAi, setLocalAi] = useState<{ online: boolean; model: string; endpoint: string }>({
    online: false,
    model: 'Not Connected',
    endpoint: 'http://localhost:11434'
  });

  useEffect(() => {
    setMounted(true);
    const checkLocalAi = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/v1/ai/config', { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const data = await res.json();
          const isOnline = Boolean(data.local_ai?.status === 'ONLINE' || data.local_ai?.healthy === true);
          setLocalAi({
            online: isOnline,
            model: isOnline ? (data.local_ai?.model || 'qwen3:4b') : 'Not Connected',
            endpoint: data.local_ai?.endpoint || 'http://localhost:11434'
          });
          return;
        }
      } catch {
        // keep fallback or offline
      }
      setLocalAi({
        online: false,
        model: 'Not Connected',
        endpoint: 'http://localhost:11434'
      });
    };
    checkLocalAi();
    const interval = setInterval(checkLocalAi, 15000);
    return () => clearInterval(interval);
  }, []);

  const activeUser = mounted ? user : null;
  const userRole = activeUser?.role || 'SUPER_ADMIN';

  const roleDisplayMap: Record<string, { title: string; email: string }> = {
    SUPER_ADMIN: { title: 'Super Administrator', email: 'secops.lead@vectornet.local' },
    SECURITY_AUDITOR: { title: 'Lead Security Auditor', email: 'auditor.lead@vectornet.local' },
    NETWORK_OPERATOR: { title: 'Tier-3 Network Engineer', email: 'netops.tier3@vectornet.local' },
    VIEWER: { title: 'Compliance Auditor (Viewer)', email: 'viewer.sec@vectornet.local' },
  };

  const currentRoleInfo = roleDisplayMap[userRole] || { title: 'Security Engineer', email: 'engineer@vectornet.local' };
  const displayName = activeUser?.display_name && !activeUser.display_name.toLowerCase().includes('priyankar')
    ? activeUser.display_name
    : currentRoleInfo.title;
  const email = activeUser?.email && !activeUser.email.toLowerCase().includes('priyankar')
    ? activeUser.email
    : currentRoleInfo.email;
  const initial = displayName.charAt(0) || 'S';

  const navItems = [
    {
      id: 'ingestion' as NavTab,
      label: 'Ingestion & Audit',
      icon: ShieldCheck,
      roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR', 'NETWORK_OPERATOR'],
    },
    {
      id: 'history' as NavTab,
      label: 'Audit History',
      icon: History,
      roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR', 'NETWORK_OPERATOR', 'VIEWER'],
    },
    {
      id: 'overview' as NavTab,
      label: 'Overview',
      icon: LayoutDashboard,
      roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR', 'NETWORK_OPERATOR', 'VIEWER'],
    },
    {
      id: 'remediation' as NavTab,
      label: 'Remediation',
      icon: Terminal,
      roles: ['SUPER_ADMIN', 'NETWORK_OPERATOR'],
    },
    {
      id: 'tasks' as NavTab,
      label: 'Team Tasks',
      icon: CheckSquare,
      roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR', 'NETWORK_OPERATOR', 'VIEWER'],
    },
    {
      id: 'skills' as NavTab,
      label: 'Compliance Rules',
      icon: Sparkles,
      roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR'],
    },
    {
      id: 'workbench' as NavTab,
      label: 'Mapping Page',
      icon: Cpu,
      roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR'],
    },
    {
      id: 'reports' as NavTab,
      label: 'Reports & Export',
      icon: FileText,
      roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR', 'VIEWER'],
    },
    {
      id: 'settings' as NavTab,
      label: 'Settings',
      icon: Settings,
      roles: ['SUPER_ADMIN', 'SECURITY_AUDITOR'],
    },
  ].filter((item) => item.roles.includes(userRole));

  const renderNavContent = (isMobile: boolean = false) => (
    <div className="flex flex-col justify-between h-full space-y-4">
      <div className="space-y-4">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-1.5 py-1 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-slate-900 tracking-tight">VECTORNET</h1>
              <p className="text-[10px] text-slate-500 font-mono">Network Compliance Auditor</p>
            </div>
          </div>
          {isMobile && (
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1 rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* User Profile Card */}
        <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-slate-200 border border-slate-300 text-slate-800 text-[10px] font-bold flex items-center justify-center font-mono shrink-0">
              {initial}
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold text-slate-900 truncate">{displayName}</div>
              <div className="text-[9px] text-slate-500 truncate font-mono">{email}</div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-[10px]">
            <span className="font-mono font-bold px-2 py-0.5 rounded text-[9px] bg-orange-50 text-orange-800 border border-orange-200">
              {userRole}
            </span>
            <button
              onClick={onOpenAuthModal}
              className="text-orange-700 hover:underline font-mono font-semibold flex items-center gap-1 transition-colors"
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
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  if (isMobile) setMobileOpen(false);
                }}
                className={`group w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all duration-150 ease-out text-left ${
                  isActive
                    ? 'bg-orange-50/90 text-orange-950 font-semibold border border-orange-200 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                } active:scale-[0.98]`}
              >
                <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-orange-600' : 'text-slate-500 group-hover:text-slate-700'}`} />
                <span className="truncate tracking-tight flex-1">{item.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-600 shrink-0" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="space-y-2 pt-2">
        {/* Local AI Engine Status Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold text-slate-700">
              <Cpu className="w-3 h-3 text-emerald-600" />
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
            {localAi.online ? 'Air-Gapped • Zero Egress' : 'Run: ollama run qwen3:4b'}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Navigation Bar (< md) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-200 z-30 px-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <span className="font-heading font-bold text-xs text-slate-900">VECTORNET</span>
            <span className="text-[10px] text-slate-500 font-mono ml-1.5 uppercase">[{activeTab}]</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
            complianceScore >= 70 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            {complianceScore}%
          </span>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Open Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Slide-Over Drawer Modal */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] h-full bg-white p-4 shadow-2xl z-10 overflow-y-auto">
            {renderNavContent(true)}
          </div>
        </div>
      )}

      {/* Desktop Sticky Sidebar (>= md) */}
      <aside className="hidden md:flex w-64 h-screen sticky top-0 bg-white border-r border-slate-200 flex-col p-4 shrink-0 overflow-y-auto z-20 shadow-xs text-slate-800 select-none">
        {renderNavContent(false)}
      </aside>
    </>
  );
};
