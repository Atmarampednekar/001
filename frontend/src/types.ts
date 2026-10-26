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
  gbToFree: number;
  targetPercent: number;
}

export interface RunningAppItem {
  id: string;
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
  id: string;
  name: string;
  command: string;
  path: string;
  location: string;
  category: "startup_app";
  sizeOrImpact: string;
  protected: boolean;
  canDisable: boolean;
}

export interface BigFileItem {
  id: string;
  name: string;
  path: string;
  sizeBytes: number;
  sizeMB: number;
  category: "big_file" | "big_folder" | "junk_temp" | "junk_recycle" | "junk_cache";
  sizeOrImpact: string;
  protected: boolean;
  isPersonal: boolean;
  cleanable: boolean;
}

export interface CleanableTargetSummary {
  id: string;
  name: string;
  category: string;
  path: string;
  sizeBytes: number;
  sizeMB: number;
  fileCount: number;
  description: string;
  safe: boolean;
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
  healthScore: number;
  potentialSavingsMB: number;
  potentialSavingsGB: number;
  isDemo?: boolean;
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
  id: string;
  title: string;
  action: ActionType;
  reason: string;
  risk: RiskLevel;
  location: string;
  howTo: string[];
  estimatedSaving: string;
  targetId?: string;
}

export interface AIPlanResponse {
  summary: string;
  fixes: FixPlanItem[];
  generatedByAI: boolean;
}

export interface HealthStatus {
  ok: boolean;
  model: string;
  configuredModel: string;
  ollamaReachable: boolean;
  availableModels: string[];
  message: string;
  dryRun: boolean;
  platform: string;
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
}

export interface CleanHistoryEntry {
  id: string;
  timestamp: string;
  dryRun: boolean;
  mbFreed: number;
  filesDeleted: number;
  targetsCleaned: string[];
}
