export interface SystemStats {
  totalRamBytes: number;
  totalRamMB: number;
  usedRamBytes: number;
  usedRamMB: number;
  usedRamPercent: number;
  cpuCores: number;
  cpuModel: string;
  cpuLoadPercent: number;
  batteryPercent: number | null;
  isCharging: boolean | null;
}

export interface DiskDrive {
  fs: string;
  mount: string;
  sizeBytes: number;
  sizeGB: number;
  usedBytes: number;
  usedGB: number;
  usedPercent: number;
  gbToFree: number; // GB needed to bring drive to target% (e.g. 80%)
  targetPercent: number;
}

export interface RunningAppItem {
  id: string; // stable id: app_<hash/name>
  name: string;
  pids: number[];
  memoryBytes: number;
  memoryMB: number;
  cpuPercent: number;
  path: string;
  category: "running_app";
  sizeOrImpact: string;
  protected: boolean;
}

export interface StartupAppItem {
  id: string; // stable id: startup_<hash/name>
  name: string;
  command: string;
  path: string;
  location: string; // e.g. "HKCU\\...\\Run" or user startup folder
  category: "startup_app";
  sizeOrImpact: string;
  protected: boolean;
  canDisable: boolean; // only user-level entries can be disabled
}

export interface BigFileItem {
  id: string; // stable id: file_<hash/path>
  name: string;
  path: string;
  sizeBytes: number;
  sizeMB: number;
  category: "big_file" | "big_folder" | "junk_temp" | "junk_recycle" | "junk_cache";
  sizeOrImpact: string;
  protected: boolean;
  isPersonal: boolean; // Personal files are NEVER auto-cleaned
  cleanable: boolean;
}

export interface ScanReport {
  id: string;
  timestamp: string;
  system: SystemStats;
  disks: DiskDrive[];
  mainDisk: DiskDrive;
  runningApps: RunningAppItem[];
  startupApps: StartupAppItem[];
  bigFiles: BigFileItem[];
  cleanableTargets: CleanableTargetSummary[];
  healthScore: number; // 0-100
  potentialSavingsMB: number;
  potentialSavingsGB: number;
}

export interface CleanableTargetSummary {
  id: string; // target_temp, target_recycle, target_chrome_cache, etc.
  name: string;
  category: string;
  path: string;
  sizeBytes: number;
  sizeMB: number;
  fileCount: number;
  description: string;
  safe: boolean;
}

export type ActionType =
  | "switch off at startup"
  | "close when not in use"
  | "clean junk"
  | "move to cloud storage"
  | "review and delete"
  | "uninstall if unused";

export type RiskLevel = "low" | "medium";

export interface FixPlanItem {
  id: string; // must match an existing un-protected item in the scan report
  title: string;
  action: ActionType;
  reason: string;
  risk: RiskLevel;
  location: string;
  howTo: string[];
  estimatedSaving: string;
  targetId?: string; // if action is clean junk, the target id
}

export interface AIPlanResponse {
  summary: string;
  fixes: FixPlanItem[];
  generatedByAI: boolean;
}

export interface CleanPreviewResult {
  previewToken: string;
  expiresAt: number;
  targets: Array<{
    id: string;
    name: string;
    path: string;
    fileCount: number;
    totalSizeBytes: number;
    totalSizeMB: number;
    actionDescription: string;
  }>;
  totalSizeBytes: number;
  totalSizeMB: number;
  totalFileCount: number;
  dryRun: boolean;
}

export interface CleanApplyResult {
  success: boolean;
  dryRun: boolean;
  bytesFreed: number;
  mbFreed: number;
  filesDeleted: number;
  filesSkipped: number;
  timestamp: string;
  details: Array<{
    targetId: string;
    path: string;
    bytesFreed: number;
    filesDeleted: number;
    filesSkipped: number;
  }>;
}

export interface CleanHistoryEntry {
  id: string;
  timestamp: string;
  dryRun: boolean;
  mbFreed: number;
  filesDeleted: number;
  targetsCleaned: string[];
}
