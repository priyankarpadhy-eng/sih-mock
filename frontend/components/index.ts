/**
 * VectorNet UI Component Library (Barrel Exports)
 * ===============================================
 * Centralized import index for Layouts, Views, Modals, and Widgets.
 */

// Layout Components
export { Sidebar } from './layout/Sidebar';
export { PostureHeader } from './layout/PostureHeader';

// View Modules
export { IngestionPage, IngestionPage as IngestionView } from './views/IngestionView';
export { OverviewPage, OverviewPage as OverviewView } from './views/OverviewView';
export { AuditorPage, AuditorPage as AuditorView } from './views/AuditorView';
export { ReportsPage, ReportsPage as ReportsView } from './views/ReportsView';
export { TaskWorkspacePage, TaskWorkspacePage as TasksView } from './views/TasksView';
export { SkillsManagementPage, SkillsManagementPage as SkillsView } from './views/SkillsView';
export { RemediationPage, RemediationPage as RemediationView } from './views/RemediationView';
export { WorkbenchPage, WorkbenchPage as WorkbenchView } from './views/WorkbenchView';
export { SettingsPage, SettingsPage as SettingsView } from './views/SettingsView';
export { HistoryPage, HistoryPage as HistoryView } from './views/HistoryView';

// Modals
export { AuthModal } from './modals/AuthModal';
export { PdfExportModal } from './modals/PdfExportModal';

// Widgets
export { AuditMatrix } from './widgets/AuditMatrix';
export { IngestionDropzone } from './widgets/IngestionDropzone';
export { NetworkActivityChart } from './widgets/NetworkActivityChart';
export { AiTrainingWorkbench } from './widgets/AiTrainingWorkbench';
