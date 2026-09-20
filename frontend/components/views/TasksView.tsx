import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  User,
  MessageSquare,
  AlertTriangle,
  Clock,
  Terminal,
  Send,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  GripVertical,
  Flame,
  UserCheck,
  ShieldAlert,
  ShieldCheck,
  Copy,
  Check,
  Search,
  Sparkles,
  ChevronRight,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';

interface TaskComment {
  comment_id: string;
  author_uid: string;
  author_name: string;
  text: string;
  timestamp: string;
}

interface TaskItem {
  task_id: string;
  title: string;
  device_id: string;
  device_hostname: string;
  vendor: string;
  status: 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'RESOLVED';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  reporter_uid: string;
  assignee_uid: string;
  finding_reference: {
    rule_id?: string;
    raw_value?: string;
  };
  remediation_script: string;
  comments: TaskComment[];
  created_at: string;
  updated_at: string;
}

interface TaskWorkspacePageProps {
  onNavigate?: (tab: any) => void;
}

const KANBAN_COLUMNS: { id: TaskItem['status']; title: string; subtitle: string; color: string; countBadge: string; dropBorder: string }[] = [
  { id: 'BACKLOG', title: 'Backlog', subtitle: 'Unassigned & Pending', color: 'border-slate-300 bg-slate-50 text-slate-800', countBadge: 'bg-slate-200 text-slate-700', dropBorder: 'border-slate-400 bg-slate-100' },
  { id: 'TODO', title: 'To Do', subtitle: 'Queued for Sprint', color: 'border-blue-300 bg-blue-50 text-blue-900', countBadge: 'bg-blue-200 text-blue-800', dropBorder: 'border-blue-500 bg-blue-100/60' },
  { id: 'IN_PROGRESS', title: 'In Progress', subtitle: 'Active Remediation', color: 'border-amber-300 bg-amber-50 text-amber-900', countBadge: 'bg-amber-200 text-amber-800', dropBorder: 'border-amber-500 bg-amber-100/60' },
  { id: 'IN_REVIEW', title: 'Under Review', subtitle: 'Audit Verification', color: 'border-purple-300 bg-purple-50 text-purple-900', countBadge: 'bg-purple-200 text-purple-800', dropBorder: 'border-purple-500 bg-purple-100/60' },
  { id: 'RESOLVED', title: 'Resolved', subtitle: 'Hardened & Verified', color: 'border-emerald-300 bg-emerald-50 text-emerald-900', countBadge: 'bg-emerald-200 text-emerald-800', dropBorder: 'border-emerald-500 bg-emerald-100/60' },
];

export interface TeamUser {
  uid: string;
  name: string;
  email: string;
  role: string;
  team: string;
  avatar: string;
  color: string;
}

export const DEFAULT_TEAM_USERS: TeamUser[] = [
  { uid: 'FIREBASE_UID_SUPERADMIN_01', name: 'Super Administrator', email: 'secops.lead@vectornet.local', role: 'SUPER_ADMIN', team: 'SecOps Command', avatar: 'SA', color: 'bg-indigo-600 text-white' },
  { uid: 'FIREBASE_UID_OPERATOR_03', name: 'Lead Network Operator', email: 'operator@vectornet.io', role: 'NETWORK_OPERATOR', team: 'NetOps Tier-3', avatar: 'NO', color: 'bg-sky-600 text-white' },
  { uid: 'FIREBASE_UID_AUDITOR_02', name: 'Senior Cyber Auditor', email: 'auditor@vectornet.io', role: 'SECURITY_AUDITOR', team: 'Compliance Team', avatar: 'CA', color: 'bg-emerald-600 text-white' },
  { uid: 'FIREBASE_UID_SECOPS_04', name: 'SecOps Specialist', email: 'secops@vectornet.io', role: 'SECURITY_AUDITOR', team: 'IR Team', avatar: 'SO', color: 'bg-amber-600 text-white' }
];

const IMPORTANCE_CONFIG = {
  CRITICAL: {
    label: 'CRITICAL',
    level: 'Importance 1 (Highest)',
    sla: '2h SLA',
    riskScore: '9.8',
    badgeClass: 'bg-red-100 text-red-700 border-red-200',
    dotColor: 'bg-red-500',
    icon: Flame
  },
  HIGH: {
    label: 'HIGH',
    level: 'Importance 2 (High)',
    sla: '8h SLA',
    riskScore: '7.5',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    dotColor: 'bg-amber-500',
    icon: AlertTriangle
  },
  MEDIUM: {
    label: 'MEDIUM',
    level: 'Importance 3 (Medium)',
    sla: '24h SLA',
    riskScore: '5.0',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    dotColor: 'bg-blue-500',
    icon: Clock
  },
  LOW: {
    label: 'LOW',
    level: 'Importance 4 (Low)',
    sla: '72h SLA',
    riskScore: '2.5',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotColor: 'bg-slate-400',
    icon: Info
  }
};

export const TaskWorkspacePage: React.FC<TaskWorkspacePageProps> = ({ onNavigate }) => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>(DEFAULT_TEAM_USERS);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [commentText, setCommentText] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterAssignee, setFilterAssignee] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [copiedCli, setCopiedCli] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskHostname, setNewTaskHostname] = useState('CUCME');
  const [newTaskVendor, setNewTaskVendor] = useState('cisco');
  const [newTaskPriority, setNewTaskPriority] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [newTaskAssignee, setNewTaskAssignee] = useState('FIREBASE_UID_OPERATOR_03');
  const [newTaskRule, setNewTaskRule] = useState('NIST-AC-12');
  const [newTaskCli, setNewTaskCli] = useState('line vty 0 4\n exec-timeout 10 0\n transport input ssh');

  const fetchTasks = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    }
  };

  const fetchUsersFromDb = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/users');
      if (res.ok) {
        const data = await res.json();
        const colors = ['bg-indigo-600 text-white', 'bg-sky-600 text-white', 'bg-emerald-600 text-white', 'bg-amber-600 text-white', 'bg-purple-600 text-white'];
        const mapped: TeamUser[] = data.map((u: any, idx: number) => {
          const name = u.display_name || u.email.split('@')[0];
          const parts = name.trim().split(' ');
          const avatar = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
          return {
            uid: u.uid,
            name: name,
            email: u.email,
            role: u.role,
            team: u.team_id || 'Security Team',
            avatar: avatar,
            color: colors[idx % colors.length]
          };
        });
        if (mapped.length > 0) setTeamUsers(mapped);
      }
    } catch (err) {
      // fallback
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchUsersFromDb();
  }, []);

  const handleAssigneeChange = async (taskId: string, assigneeUid: string) => {
    setTasks(prev => prev.map(t => t.task_id === taskId ? { ...t, assignee_uid: assigneeUid } : t));
    try {
      const task = tasks.find(t => t.task_id === taskId);
      await fetch('http://localhost:8000/api/v1/tasks/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId,
          assignee_uid: assigneeUid,
          status: task?.status,
          priority: task?.priority
        }),
      });
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePriorityChange = async (taskId: string, newPriority: TaskItem['priority']) => {
    setTasks(prev => prev.map(t => t.task_id === taskId ? { ...t, priority: newPriority } : t));
    try {
      const task = tasks.find(t => t.task_id === taskId);
      await fetch('http://localhost:8000/api/v1/tasks/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId,
          assignee_uid: task?.assignee_uid || 'FIREBASE_UID_OPERATOR_03',
          status: task?.status,
          priority: newPriority
        }),
      });
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskItem['status']) => {
    setTasks(prev => prev.map(t => t.task_id === taskId ? { ...t, status: newStatus } : t));
    try {
      const task = tasks.find(t => t.task_id === taskId);
      await fetch('http://localhost:8000/api/v1/tasks/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId,
          assignee_uid: task?.assignee_uid || 'FIREBASE_UID_OPERATOR_03',
          status: newStatus,
          priority: task?.priority
        }),
      });
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colId) {
      setDragOverCol(colId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only reset if leaving column boundary
  };

  const handleDrop = async (e: React.DragEvent, targetColId: TaskItem['status']) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      handleStatusChange(taskId, targetColId);
    }
    setDraggedTaskId(null);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !commentText.trim()) return;

    try {
      const res = await fetch('http://localhost:8000/api/v1/tasks/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: selectedTask.task_id,
          author_uid: 'FIREBASE_UID_SUPERADMIN_01',
          author_name: 'Priyankar Padhy',
          text: commentText.trim()
        }),
      });
      if (res.ok) {
        const updatedTask = await res.json();
        setSelectedTask(updatedTask);
        setCommentText('');
        fetchTasks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const res = await fetch('http://localhost:8000/api/v1/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          device_id: `DEV-${newTaskHostname}`,
          device_hostname: newTaskHostname,
          vendor: newTaskVendor,
          priority: newTaskPriority,
          assignee_uid: newTaskAssignee,
          reporter_uid: 'FIREBASE_UID_SUPERADMIN_01',
          rule_id: newTaskRule,
          raw_value: 'Manual task creation from Jira Workspace',
          remediation_script: newTaskCli
        }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewTaskTitle('');
        fetchTasks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  const filteredTasks = tasks.filter(t => {
    const pMatch = filterPriority === 'ALL' || t.priority === filterPriority;
    const aMatch = filterAssignee === 'ALL' || t.assignee_uid === filterAssignee;
    const sMatch = !searchQuery.trim() || 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.device_hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.task_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.finding_reference?.rule_id || '').toLowerCase().includes(searchQuery.toLowerCase());
    return pMatch && aMatch && sMatch;
  });

  return (
    <div className="space-y-4">
      
      {/* Sleek Toolbar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#0F172A] text-white rounded-xl shadow-xs">
            <CheckSquare className="w-5 h-5 text-[#10B981]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[#0F172A] font-serif">Task Workspace</h1>
              <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-mono font-bold">
                {tasks.length} Total
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white border border-[#CBD5E1] pl-7 pr-2.5 py-1 rounded-lg text-xs font-mono outline-none focus:border-[#0EA5E9] w-36 sm:w-44 shadow-2xs"
            />
          </div>

          {/* Importance Filter */}
          <div className="flex items-center gap-1 bg-white border border-[#CBD5E1] px-2 py-1 rounded-lg text-xs font-mono shadow-2xs">
            <ShieldAlert className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-transparent font-bold text-[#0F172A] outline-none cursor-pointer text-xs"
            >
              <option value="ALL">All Priority</option>
              <option value="CRITICAL">🔴 Critical</option>
              <option value="HIGH">🟠 High</option>
              <option value="MEDIUM">🟡 Medium</option>
              <option value="LOW">🔵 Low</option>
            </select>
          </div>

              {/* Assignee Filter */}
          <div className="flex items-center gap-1 bg-white border border-[#CBD5E1] px-2 py-1 rounded-lg text-xs font-mono shadow-2xs">
            <UserCheck className="w-3.5 h-3.5 text-[#0EA5E9] shrink-0" />
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="bg-transparent font-bold text-[#0F172A] outline-none cursor-pointer text-xs max-w-[120px] truncate"
            >
              <option value="ALL">All Assignees</option>
              {teamUsers.map(u => (
                <option key={u.uid} value={u.uid}>{u.name.split(' ')[0]}</option>
              ))}
            </select>
          </div>

          {/* Create Task Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1 bg-[#0F172A] hover:bg-[#1E293B] text-white font-mono text-xs font-bold rounded-lg flex items-center gap-1 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#10B981]" />
            New Task
          </button>
        </div>
      </div>

      {/* Inline SLA Importance Quick-Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
        <span className="text-[#64748B] text-[10px] font-bold uppercase tracking-wider shrink-0">Importance SLA:</span>
        {Object.entries(IMPORTANCE_CONFIG).map(([key, config]) => {
          const count = tasks.filter(t => t.priority === key).length;
          const isActive = filterPriority === key;
          return (
            <button
              key={key}
              onClick={() => setFilterPriority(isActive ? 'ALL' : key)}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                isActive ? 'ring-2 ring-slate-800 shadow-xs' : ''
              } ${config.badgeClass}`}
            >
              <span className={`w-2 h-2 rounded-full ${config.dotColor}`}></span>
              <span>{config.label}</span>
              <span className="opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Draggable Responsive Kanban Board Grid */}
      <div className="w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 w-full">
        {KANBAN_COLUMNS.map(col => {
          const colTasks = filteredTasks.filter(t => t.status === col.id);
          const isOver = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`bg-[#F8FAFC] border rounded-xl p-2.5 flex flex-col w-full min-h-[540px] transition-all ${
                isOver ? `${col.dropBorder} ring-2 ring-sky-400 shadow-md scale-[1.01]` : 'border-[#CBD5E1]'
              }`}
            >
              
              {/* Column Header */}
              <div className={`px-2.5 py-1.5 rounded-lg border font-mono text-xs font-bold flex justify-between items-center mb-2.5 shadow-2xs ${col.color}`}>
                <div className="truncate">
                  <span>{col.title}</span>
                </div>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${col.countBadge}`}>
                  {colTasks.length}
                </span>
              </div>

              {/* Draggable Task Cards Container */}
              <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[680px] pr-0.5">
                {colTasks.map(task => {
                  const importance = IMPORTANCE_CONFIG[task.priority] || IMPORTANCE_CONFIG.HIGH;
                  const ImportanceIcon = importance.icon;
                  const isDragging = draggedTaskId === task.task_id;
                  const assignedUser = teamUsers.find(u => u.uid === task.assignee_uid) || teamUsers[1] || teamUsers[0];

                  return (
                    <div
                      key={task.task_id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.task_id)}
                      onClick={() => setSelectedTask(task)}
                      className={`bg-white border rounded-xl p-3.5 shadow-xs transition-all cursor-grab active:cursor-grabbing space-y-3 hover:shadow-md ${
                        isDragging ? 'opacity-30 border-2 border-dashed border-[#0EA5E9] scale-95 bg-sky-50' : 'border-[#CBD5E1] hover:border-[#0EA5E9]'
                      }`}
                    >
                      {/* Drag Handle & Importance Badge */}
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                          <GripVertical className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                          
                          {/* Importance Quick Dropdown */}
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border ${importance.badgeClass}`}>
                              <ImportanceIcon className="w-3 h-3 shrink-0" />
                              <select
                                value={task.priority}
                                onChange={(e) => handlePriorityChange(task.task_id, e.target.value as any)}
                                className="bg-transparent text-[9px] font-bold outline-none cursor-pointer uppercase"
                              >
                                <option value="CRITICAL">🔴 CRITICAL</option>
                                <option value="HIGH">🟠 HIGH</option>
                                <option value="MEDIUM">🟡 MEDIUM</option>
                                <option value="LOW">🔵 LOW</option>
                              </select>
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono text-[#64748B] font-bold bg-[#F1F5F9] px-2 py-0.5 rounded">
                          {task.device_hostname}
                        </span>
                      </div>

                      {/* Task ID & Title */}
                      <div>
                        <div className="text-[10px] font-mono text-[#0EA5E9] font-bold mb-0.5">
                          {task.task_id}
                        </div>
                        <h4 className="text-xs font-bold text-[#0F172A] leading-snug line-clamp-2">
                          {task.title}
                        </h4>
                      </div>

                      {/* Finding Reference & Vendor Tag */}
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        {task.finding_reference?.rule_id ? (
                          <span className="text-[9px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded font-bold truncate">
                            Rule: {task.finding_reference.rule_id}
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-bold">
                            Vendor: {task.vendor.toUpperCase()}
                          </span>
                        )}
                        <span className="text-[9px] font-mono text-slate-500">SLA: {importance.sla}</span>
                      </div>

                      {/* Card Footer: Team Assigned User Avatar & Quick Switcher */}
                      <div className="flex items-center justify-between border-t border-[#F1F5F9] pt-2.5 text-[10px]">
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <div className={`w-5 h-5 rounded-full text-[9px] font-extrabold flex items-center justify-center font-mono shadow-2xs ${assignedUser.color}`}>
                            {assignedUser.avatar}
                          </div>
                          <select
                            value={task.assignee_uid}
                            onChange={(e) => handleAssigneeChange(task.task_id, e.target.value)}
                            className="bg-transparent text-[10px] font-bold text-[#334155] font-mono outline-none cursor-pointer max-w-[110px] truncate"
                          >
                            {teamUsers.map(u => (
                              <option key={u.uid} value={u.uid}>{u.name.split(' ')[0]}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-1 text-[#64748B] font-mono bg-[#F8FAFC] px-1.5 py-0.5 rounded border border-[#E2E8F0]">
                          <MessageSquare className="w-3 h-3 text-[#0EA5E9]" />
                          <span className="font-bold">{task.comments?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {colTasks.length === 0 && (
                  <div className="text-center py-12 text-xs text-[#94A3B8] font-mono border-2 border-dashed border-[#CBD5E1] rounded-xl bg-white/40 flex flex-col items-center justify-center gap-1">
                    <GripVertical className="w-4 h-4 text-[#CBD5E1]" />
                    <span>Drop task here</span>
                  </div>
                )}
              </div>

            </div>
          );
        })}
        </div>
      </div>

      {/* Selected Task Details & Chat Drawer Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-[#CBD5E1] rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-[#E2E8F0] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[#0EA5E9]">{selectedTask.task_id}</span>
                  <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${IMPORTANCE_CONFIG[selectedTask.priority]?.badgeClass}`}>
                    {selectedTask.priority} IMPORTANCE
                  </span>
                  <span className="text-[10px] font-mono text-[#64748B]">Host: {selectedTask.device_hostname}</span>
                </div>
                <h2 className="text-base font-bold text-[#0F172A] mt-1 font-serif">{selectedTask.title}</h2>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-[#64748B] hover:text-[#0F172A] p-1 rounded-lg hover:bg-slate-100 text-sm font-mono font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Task Controls: Status & Assignee & Importance */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#F8FAFC] border border-[#CBD5E1] p-3.5 rounded-xl text-xs font-mono">
              <div>
                <label className="block text-[10px] text-[#64748B] font-bold mb-1 uppercase">Task Status:</label>
                <select
                  value={selectedTask.status}
                  onChange={(e) => handleStatusChange(selectedTask.task_id, e.target.value as any)}
                  className="w-full bg-white border border-[#CBD5E1] p-1.5 rounded-lg font-bold text-[#0F172A] cursor-pointer"
                >
                  {KANBAN_COLUMNS.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-[#64748B] font-bold mb-1 uppercase">Importance Level:</label>
                <select
                  value={selectedTask.priority}
                  onChange={(e) => handlePriorityChange(selectedTask.task_id, e.target.value as any)}
                  className="w-full bg-white border border-[#CBD5E1] p-1.5 rounded-lg font-bold text-[#0F172A] cursor-pointer"
                >
                  <option value="CRITICAL">🔴 CRITICAL (2h SLA)</option>
                  <option value="HIGH">🟠 HIGH (8h SLA)</option>
                  <option value="MEDIUM">🟡 MEDIUM (24h SLA)</option>
                  <option value="LOW">🔵 LOW (72h SLA)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-[#64748B] font-bold mb-1 uppercase">Assigned User:</label>
                <select
                  value={selectedTask.assignee_uid}
                  onChange={(e) => handleAssigneeChange(selectedTask.task_id, e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] p-1.5 rounded-lg font-bold text-[#0F172A] cursor-pointer"
                >
                  {teamUsers.map(u => (
                    <option key={u.uid} value={u.uid}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Remediation CLI Playbook */}
            {selectedTask.remediation_script && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-[#0F172A]">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-[#10B981]" />
                    Vendor Remediation CLI Playbook:
                  </div>
                  <button
                    onClick={() => copyToClipboard(selectedTask.remediation_script)}
                    className="flex items-center gap-1 text-[10px] font-mono text-[#0EA5E9] hover:underline cursor-pointer"
                  >
                    {copiedCli ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copiedCli ? 'COPIED!' : 'COPY SCRIPT'}
                  </button>
                </div>
                <pre className="bg-[#0F172A] text-[#38BDF8] p-3.5 rounded-xl text-xs font-mono leading-relaxed overflow-x-auto border border-slate-800 shadow-inner">
                  {selectedTask.remediation_script}
                </pre>
              </div>
            )}

            {/* Live Comment Discussion Thread */}
            <div className="space-y-3 border-t border-[#E2E8F0] pt-4">
              <h3 className="text-xs font-mono font-bold text-[#0F172A] flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#0EA5E9]" />
                  Team Discussion & Remediation Log
                </span>
                <span className="text-[10px] text-[#64748B]">({selectedTask.comments?.length || 0} comments)</span>
              </h3>

              {/* Comment Thread List */}
              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {selectedTask.comments?.map(c => {
                  const author = teamUsers.find(u => u.uid === c.author_uid) || { avatar: 'U', color: 'bg-slate-700 text-white', role: 'Team Member' };
                  return (
                    <div key={c.comment_id} className="bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-xl text-xs space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center ${author.color}`}>
                            {author.avatar}
                          </div>
                          <span className="font-bold text-[#0F172A]">{c.author_name}</span>
                          <span className="text-[#64748B]">({author.role})</span>
                        </div>
                        <span className="text-[#64748B]">{c.timestamp}</span>
                      </div>
                      <p className="text-[#334155] pl-6">{c.text}</p>
                    </div>
                  );
                })}

                {(!selectedTask.comments || selectedTask.comments.length === 0) && (
                  <div className="text-xs text-[#94A3B8] font-mono text-center py-4 bg-[#F8FAFC] rounded-xl border border-dashed border-[#CBD5E1]">
                    No discussion logs yet. Post an update below.
                  </div>
                )}
              </div>

              {/* Post Comment Input */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type audit update, ticket progress, or remediation note..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 bg-white border border-[#CBD5E1] p-2.5 rounded-xl text-xs outline-none focus:border-[#0EA5E9] font-mono"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white font-mono text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-[#10B981]" />
                  POST
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* Create New Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-[#CBD5E1] rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
              <h2 className="text-base font-bold text-[#0F172A] font-serif flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#10B981]" />
                Create Jira Remediation Task
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-[#64748B] hover:text-[#0F172A] text-sm font-mono font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block font-bold text-[#0F172A] mb-1">TASK TITLE *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enforce SSH v2 and Disable Insecure Telnet"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] p-2.5 rounded-xl text-xs font-mono outline-none focus:border-[#0EA5E9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#0F172A] mb-1">HOSTNAME</label>
                  <input
                    type="text"
                    value={newTaskHostname}
                    onChange={(e) => setNewTaskHostname(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] p-2 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#0F172A] mb-1">VENDOR</label>
                  <select
                    value={newTaskVendor}
                    onChange={(e) => setNewTaskVendor(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] p-2 rounded-xl text-xs font-mono cursor-pointer"
                  >
                    <option value="cisco">Cisco IOS</option>
                    <option value="juniper">Juniper JunOS</option>
                    <option value="sonic">SONiC Whitebox</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#0F172A] mb-1">IMPORTANCE RATING</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] p-2 rounded-xl text-xs font-mono cursor-pointer font-bold"
                  >
                    <option value="CRITICAL">🔴 CRITICAL (2h SLA)</option>
                    <option value="HIGH">🟠 HIGH (8h SLA)</option>
                    <option value="MEDIUM">🟡 MEDIUM (24h SLA)</option>
                    <option value="LOW">🔵 LOW (72h SLA)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] mb-1">ASSIGNED USER</label>
                  <select
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] p-2 rounded-xl text-xs font-mono cursor-pointer"
                  >
                    {teamUsers.map(u => (
                      <option key={u.uid} value={u.uid}>{u.name} ({u.team})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] mb-1">REMEDIATION CLI COMMANDS</label>
                <textarea
                  rows={3}
                  value={newTaskCli}
                  onChange={(e) => setNewTaskCli(e.target.value)}
                  className="w-full bg-[#0F172A] text-[#38BDF8] p-2.5 rounded-xl text-xs font-mono outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold rounded-xl"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-white font-mono font-bold rounded-xl flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 text-[#10B981]" />
                  CREATE TASK
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
