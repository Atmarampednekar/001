import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { getLatestScanReport } from "./scanner.js";
import { config } from "./config.js";

const execAsync = promisify(exec);

const DATA_DIR = path.join(process.cwd(), "data");
const BACKUP_FILE = path.join(DATA_DIR, "startup_backups.json");

interface StartupBackupItem {
  id: string;
  name: string;
  command: string;
  location: string;
  isFolderShortcut: boolean;
  disabledAt: string;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getStartupBackups(): Map<string, StartupBackupItem> {
  ensureDataDir();
  if (!fs.existsSync(BACKUP_FILE)) {
    return new Map();
  }
  try {
    const raw = fs.readFileSync(BACKUP_FILE, "utf-8");
    const arr: StartupBackupItem[] = JSON.parse(raw);
    return new Map(arr.map((item) => [item.id, item]));
  } catch {
    return new Map();
  }
}

function saveStartupBackups(map: Map<string, StartupBackupItem>): void {
  ensureDataDir();
  const arr = Array.from(map.values());
  fs.writeFileSync(BACKUP_FILE, JSON.stringify(arr, null, 2), "utf-8");
}

/**
 * Disable a user-level startup entry with automatic backup
 */
export async function disableStartupEntry(id: string): Promise<{
  success: boolean;
  name: string;
  dryRun: boolean;
  message: string;
}> {
  const report = getLatestScanReport();
  if (!report) {
    throw new Error("No active scan report found. Please run a scan first.");
  }

  const target = report.startupApps.find((s) => s.id === id);
  if (!target) {
    throw new Error(`Startup item with id '${id}' not found in scan report.`);
  }

  if (target.protected || !target.canDisable) {
    throw new Error(`Item '${target.name}' is a system-protected component and cannot be disabled.`);
  }

  const isFolderShortcut = target.location.includes("User Startup Folder");

  // Save backup
  const backups = getStartupBackups();
  backups.set(id, {
    id,
    name: target.name,
    command: target.command,
    location: target.location,
    isFolderShortcut,
    disabledAt: new Date().toISOString(),
  });
  saveStartupBackups(backups);

  if (config.dryRun) {
    return {
      success: true,
      name: target.name,
      dryRun: true,
      message: `[DRY_RUN] Simulated disabling startup item '${target.name}'. Original entry backed up.`,
    };
  }

  // Live Disable on Windows
  if (process.platform === "win32") {
    if (isFolderShortcut) {
      const shortcutPath = target.command;
      const disabledPath = `${shortcutPath}.disabled`;
      if (fs.existsSync(shortcutPath)) {
        fs.renameSync(shortcutPath, disabledPath);
      }
    } else {
      // Registry Run key removal (NO user strings interpolated; fixed allowlisted syntax)
      const safeRegName = target.name.replace(/"/g, '\\"');
      await execAsync(`reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${safeRegName}" /f`);
    }
  }

  return {
    success: true,
    name: target.name,
    dryRun: false,
    message: `Successfully switched off '${target.name}' from starting with your laptop.`,
  };
}

/**
 * Restore/undo a previously disabled startup entry from backup
 */
export async function undoStartupEntry(id: string): Promise<{
  success: boolean;
  name: string;
  dryRun: boolean;
  message: string;
}> {
  const backups = getStartupBackups();
  const backup = backups.get(id);

  if (!backup) {
    throw new Error(`No backup found for startup item id '${id}'.`);
  }

  if (config.dryRun) {
    backups.delete(id);
    saveStartupBackups(backups);
    return {
      success: true,
      name: backup.name,
      dryRun: true,
      message: `[DRY_RUN] Simulated restoring startup item '${backup.name}'.`,
    };
  }

  // Live Undo
  if (process.platform === "win32") {
    if (backup.isFolderShortcut) {
      const disabledPath = `${backup.command}.disabled`;
      if (fs.existsSync(disabledPath)) {
        fs.renameSync(disabledPath, backup.command);
      }
    } else {
      // Restore to registry
      const safeName = backup.name.replace(/"/g, '\\"');
      const safeCmd = backup.command.replace(/"/g, '\\"');
      await execAsync(
        `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${safeName}" /t REG_SZ /d "${safeCmd}" /f`
      );
    }
  }

  backups.delete(id);
  saveStartupBackups(backups);

  return {
    success: true,
    name: backup.name,
    dryRun: false,
    message: `Restored '${backup.name}' to start with your laptop.`,
  };
}
