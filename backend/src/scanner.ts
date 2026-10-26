import si from "systeminformation";
import fs from "fs";
import path from "path";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import {
  ScanReport,
  SystemStats,
  DiskDrive,
  RunningAppItem,
  StartupAppItem,
  BigFileItem,
  CleanableTargetSummary,
} from "./types.js";
import {
  isProtectedProcess,
  isProtectedStartup,
  isPersonalFolder,
  isProtectedPath,
} from "./protected.js";
import { config } from "./config.js";

const execAsync = promisify(exec);

// Cache the last scan report in memory so other routes can validate IDs against it
let latestScanReport: ScanReport | null = null;

export function getLatestScanReport(): ScanReport | null {
  return latestScanReport;
}

export function setLatestScanReport(report: ScanReport): void {
  latestScanReport = report;
}

/**
 * 1. Collect System Hardware & Utilization
 */
async function scanSystem(): Promise<SystemStats> {
  const [mem, load, cpu, battery] = await Promise.all([
    si.mem(),
    si.currentLoad(),
    si.cpu(),
    si.battery(),
  ]);

  const totalRamBytes = mem.total;
  const usedRamBytes = mem.used;
  const totalRamMB = Math.round(totalRamBytes / (1024 * 1024));
  const usedRamMB = Math.round(usedRamBytes / (1024 * 1024));
  const usedRamPercent = totalRamBytes > 0 ? Math.round((usedRamBytes / totalRamBytes) * 100) : 0;

  return {
    totalRamBytes,
    totalRamMB,
    usedRamBytes,
    usedRamMB,
    usedRamPercent,
    cpuCores: cpu.cores || os.cpus().length || 4,
    cpuModel: cpu.brand || os.cpus()[0]?.model || "Processor",
    cpuLoadPercent: Math.round(load.currentLoad || 0),
    batteryPercent: battery.hasBattery ? Math.round(battery.percent) : null,
    isCharging: battery.hasBattery ? battery.isCharging : null,
  };
}

/**
 * 2. Collect Disk Drives and compute gbToFree
 */
async function scanDisks(targetPercent = config.targetDiskPercent): Promise<{ disks: DiskDrive[]; mainDisk: DiskDrive }> {
  const fsSizes = await si.fsSize();
  const disks: DiskDrive[] = [];

  for (const drive of fsSizes) {
    if (!drive.size || drive.size <= 0) continue;
    const sizeBytes = drive.size;
    const usedBytes = drive.used;
    const sizeGB = parseFloat((sizeBytes / (1024 * 1024 * 1024)).toFixed(1));
    const usedGB = parseFloat((usedBytes / (1024 * 1024 * 1024)).toFixed(1));
    const usedPercent = Math.round((usedBytes / sizeBytes) * 100);

    // Target calculation: e.g. target is 80%
    const maxAllowedUsedBytes = sizeBytes * (targetPercent / 100);
    const bytesToFree = Math.max(0, usedBytes - maxAllowedUsedBytes);
    const gbToFree = parseFloat((bytesToFree / (1024 * 1024 * 1024)).toFixed(1));

    disks.push({
      fs: drive.fs,
      mount: drive.mount,
      sizeBytes,
      sizeGB,
      usedBytes,
      usedGB,
      usedPercent,
      gbToFree,
      targetPercent,
    });
  }

  // Identify main disk (usually C: on Windows or root /)
  const mainDisk =
    disks.find((d) => d.mount.toLowerCase() === "c:" || d.mount === "/") ||
    disks[0] || {
      fs: "C:",
      mount: "C:",
      sizeBytes: 100 * 1024 * 1024 * 1024,
      sizeGB: 100,
      usedBytes: 50 * 1024 * 1024 * 1024,
      usedGB: 50,
      usedPercent: 50,
      gbToFree: 0,
      targetPercent,
    };

  return { disks, mainDisk };
}

/**
 * 3. Collect Running Apps Grouped by Name (Top 15 by memory)
 */
async function scanRunningApps(): Promise<RunningAppItem[]> {
  const procData = await si.processes();
  const processList = procData.list || [];

  // Group processes by clean application name
  const appMap = new Map<
    string,
    {
      name: string;
      pids: number[];
      memoryBytes: number;
      cpuPercent: number;
      path: string;
    }
  >();

  for (const proc of processList) {
    if (!proc.name) continue;
    const cleanName = proc.name.trim();
    const memBytes = (proc.memRss || 0) * 1024;
    const cpu = proc.cpu || 0;
    const execPath = proc.path || "";

    if (!appMap.has(cleanName)) {
      appMap.set(cleanName, {
        name: cleanName,
        pids: [proc.pid],
        memoryBytes: memBytes,
        cpuPercent: cpu,
        path: execPath,
      });
    } else {
      const existing = appMap.get(cleanName)!;
      existing.pids.push(proc.pid);
      existing.memoryBytes += memBytes;
      existing.cpuPercent += cpu;
      if (!existing.path && execPath) existing.path = execPath;
    }
  }

  // Sort by memory descending
  const sorted = Array.from(appMap.values()).sort((a, b) => b.memoryBytes - a.memoryBytes);

  return sorted.slice(0, 15).map((app, index) => {
    const memoryMB = Math.round(app.memoryBytes / (1024 * 1024));
    const cpuPercent = parseFloat(app.cpuPercent.toFixed(1));
    const isProt = isProtectedProcess(app.name, app.path);

    // Clean stable id
    const safeName = app.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const id = `app_${safeName}_${index}`;

    return {
      id,
      name: app.name,
      pids: app.pids,
      memoryBytes: app.memoryBytes,
      memoryMB,
      cpuPercent,
      path: app.path || "C:\\Windows\\System32\\" + app.name,
      category: "running_app",
      sizeOrImpact: `${memoryMB} MB RAM (${cpuPercent}% CPU)`,
      protected: isProt,
    };
  });
}

/**
 * 4. Collect Startup Applications
 */
async function scanStartupApps(): Promise<StartupAppItem[]> {
  const startupList: StartupAppItem[] = [];

  if (process.platform === "win32") {
    // 1. Query User Run key: HKCU\Software\Microsoft\Windows\CurrentVersion\Run
    try {
      const { stdout } = await execAsync('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run"');
      const lines = stdout.split("\r\n");
      for (const line of lines) {
        const match = line.trim().match(/^([^\t]+)\s+(REG_SZ|REG_EXPAND_SZ)\s+(.+)$/i);
        if (match) {
          const name = match[1].trim();
          const command = match[3].trim();
          let cleanPath = command.trim();
          if (cleanPath.startsWith('"')) {
            const nextQuote = cleanPath.indexOf('"', 1);
            if (nextQuote !== -1) {
              cleanPath = cleanPath.substring(1, nextQuote);
            }
          } else {
            cleanPath = cleanPath.split(" ")[0];
          }
          const isProt = isProtectedStartup(name, command);
          const safeId = `startup_hkcu_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

          startupList.push({
            id: safeId,
            name,
            command,
            path: cleanPath,
            location: "Registry: Current User Run Key",
            category: "startup_app",
            sizeOrImpact: "Runs automatically at Windows login",
            protected: isProt,
            canDisable: !isProt,
          });
        }
      }
    } catch {
      // HKCU Run key may be empty or error
    }

    // 2. Query User Startup folder
    try {
      const userStartupDir = path.join(
        process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"),
        "Microsoft",
        "Windows",
        "Start Menu",
        "Programs",
        "Startup"
      );

      if (fs.existsSync(userStartupDir)) {
        const entries = fs.readdirSync(userStartupDir);
        for (const entry of entries) {
          if (entry.toLowerCase() === "desktop.ini") continue;
          const fullPath = path.join(userStartupDir, entry);
          const name = path.parse(entry).name;
          const isProt = isProtectedStartup(name, fullPath);
          const safeId = `startup_folder_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

          startupList.push({
            id: safeId,
            name,
            command: fullPath,
            path: fullPath,
            location: "Folder: User Startup Folder",
            category: "startup_app",
            sizeOrImpact: "Launches shortcut at login",
            protected: isProt,
            canDisable: !isProt,
          });
        }
      }
    } catch {
      // Startup folder not accessible
    }
  }

  // Fallback to systeminformation if empty or non-Windows
  if (startupList.length === 0) {
    try {
      // Use running non-protected background apps as candidate startup items
      const running = await scanRunningApps();
      const candidates = running.filter((r) => !r.protected).slice(0, 5);
      for (const c of candidates) {
        startupList.push({
          id: `startup_candidate_${c.id}`,
          name: c.name,
          command: c.path,
          path: c.path,
          location: "Background Startup Service",
          category: "startup_app",
          sizeOrImpact: "Background process consuming " + c.memoryMB + " MB",
          protected: false,
          canDisable: true,
        });
      }
    } catch {
      // ignore
    }
  }

  return startupList;
}

/**
 * Fast helper to measure folder size (capped to maxFiles and depth)
 */
function getFastFolderStats(
  dirPath: string,
  maxFiles = 500,
  maxDepth = 3
): { totalSizeBytes: number; fileCount: number } {
  let totalSizeBytes = 0;
  let fileCount = 0;

  function walk(currentDir: string, currentDepth: number) {
    if (currentDepth > maxDepth || fileCount >= maxFiles) return;
    try {
      const items = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const item of items) {
        if (fileCount >= maxFiles) break;
        const fullPath = path.join(currentDir, item.name);
        try {
          if (item.isDirectory()) {
            walk(fullPath, currentDepth + 1);
          } else if (item.isFile()) {
            const stats = fs.statSync(fullPath);
            totalSizeBytes += stats.size;
            fileCount++;
          }
        } catch {
          // ignore inaccessible item
        }
      }
    } catch {
      // ignore inaccessible dir
    }
  }

  if (fs.existsSync(dirPath)) {
    walk(dirPath, 1);
  }
  return { totalSizeBytes, fileCount };
}

/**
 * 5. Collect Cleanable Targets (Allowlisted safe junk)
 */
async function scanCleanableTargets(): Promise<CleanableTargetSummary[]> {
  const targets: CleanableTargetSummary[] = [];

  // 1. User Temp Directory
  const userTemp = os.tmpdir();
  if (fs.existsSync(userTemp)) {
    const { totalSizeBytes, fileCount } = getFastFolderStats(userTemp, 600, 2);
    const sizeMB = Math.round(totalSizeBytes / (1024 * 1024));
    targets.push({
      id: "target_user_temp",
      name: "User Temporary Files",
      category: "junk_temp",
      path: userTemp,
      sizeBytes: totalSizeBytes,
      sizeMB,
      fileCount,
      description: "Temporary application files and logs older than 24 hours",
      safe: true,
    });
  }

  // 2. Windows System Temp (if Windows)
  if (process.platform === "win32") {
    const sysTemp = "C:\\Windows\\Temp";
    if (fs.existsSync(sysTemp)) {
      const { totalSizeBytes, fileCount } = getFastFolderStats(sysTemp, 300, 2);
      const sizeMB = Math.round(totalSizeBytes / (1024 * 1024));
      targets.push({
        id: "target_system_temp",
        name: "Windows System Temp Files",
        category: "junk_temp",
        path: sysTemp,
        sizeBytes: totalSizeBytes,
        sizeMB,
        fileCount,
        description: "Cached installer files and Windows temporary logs",
        safe: true,
      });
    }

    // 3. Browser Caches (Chrome, Edge)
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");

    const chromeCache = path.join(localAppData, "Google", "Chrome", "User Data", "Default", "Cache");
    if (fs.existsSync(chromeCache)) {
      const { totalSizeBytes, fileCount } = getFastFolderStats(chromeCache, 800, 2);
      const sizeMB = Math.round(totalSizeBytes / (1024 * 1024));
      targets.push({
        id: "target_chrome_cache",
        name: "Google Chrome Cache",
        category: "junk_cache",
        path: chromeCache,
        sizeBytes: totalSizeBytes,
        sizeMB,
        fileCount,
        description: "Cached website images and scripts (passwords and history are NEVER touched)",
        safe: true,
      });
    }

    const edgeCache = path.join(localAppData, "Microsoft", "Edge", "User Data", "Default", "Cache");
    if (fs.existsSync(edgeCache)) {
      const { totalSizeBytes, fileCount } = getFastFolderStats(edgeCache, 800, 2);
      const sizeMB = Math.round(totalSizeBytes / (1024 * 1024));
      targets.push({
        id: "target_edge_cache",
        name: "Microsoft Edge Cache",
        category: "junk_cache",
        path: edgeCache,
        sizeBytes: totalSizeBytes,
        sizeMB,
        fileCount,
        description: "Cached web assets from Edge (logins and favorites are NEVER touched)",
        safe: true,
      });
    }

    // 4. Windows Thumbnail Cache
    const explorerCache = path.join(localAppData, "Microsoft", "Windows", "Explorer");
    if (fs.existsSync(explorerCache)) {
      try {
        const files = fs.readdirSync(explorerCache);
        let thumbBytes = 0;
        let count = 0;
        for (const f of files) {
          if (f.startsWith("thumbcache_")) {
            const stat = fs.statSync(path.join(explorerCache, f));
            thumbBytes += stat.size;
            count++;
          }
        }
        if (thumbBytes > 0) {
          targets.push({
            id: "target_thumbnail_cache",
            name: "Windows Thumbnail Cache",
            category: "junk_cache",
            path: explorerCache,
            sizeBytes: thumbBytes,
            sizeMB: Math.round(thumbBytes / (1024 * 1024)),
            fileCount: count,
            description: "Cached photo and video preview thumbnails (Windows regenerates as needed)",
            safe: true,
          });
        }
      } catch {
        // ignore
      }
    }

    // 5. Recycle Bin Size (Windows PowerShell check)
    try {
      const psCmd =
        'powershell -NoProfile -Command "(New-Object -ComObject Shell.Application).NameSpace(0x0a).Items() | Measure-Object -Property Size -Sum | Select-Object -ExpandProperty Sum"';
      const { stdout } = await execAsync(psCmd, { timeout: 3000 });
      const bytes = parseInt(stdout.trim(), 10);
      if (!isNaN(bytes) && bytes > 0) {
        targets.push({
          id: "target_recycle_bin",
          name: "Recycle Bin",
          category: "junk_recycle",
          path: "Recycle Bin",
          sizeBytes: bytes,
          sizeMB: Math.round(bytes / (1024 * 1024)),
          fileCount: 1,
          description: "Deleted files currently sitting in your Recycle Bin",
          safe: true,
        });
      }
    } catch {
      // ComObject fallback
    }
  }

  return targets;
}

/**
 * 6. Collect Big Files & Folders in Personal Directories (Suggest-Only, NEVER auto-cleaned)
 */
async function scanBigFiles(): Promise<BigFileItem[]> {
  const home = os.homedir();
  const searchDirs = [
    path.join(home, "Downloads"),
    path.join(home, "Desktop"),
    path.join(home, "Documents"),
  ];

  const foundFiles: Array<{ name: string; path: string; size: number }> = [];

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries.slice(0, 60)) {
        const fullPath = path.join(dir, entry.name);
        try {
          if (entry.isFile()) {
            const stat = fs.statSync(fullPath);
            if (stat.size > 20 * 1024 * 1024) {
              // > 20 MB
              foundFiles.push({ name: entry.name, path: fullPath, size: stat.size });
            }
          } else if (entry.isDirectory()) {
            // Check top level directory size
            const subEntries = fs.readdirSync(fullPath);
            let folderSize = 0;
            for (const sub of subEntries.slice(0, 30)) {
              try {
                const subStat = fs.statSync(path.join(fullPath, sub));
                if (subStat.isFile()) folderSize += subStat.size;
              } catch {
                // ignore
              }
            }
            if (folderSize > 50 * 1024 * 1024) {
              foundFiles.push({ name: entry.name + " (Folder)", path: fullPath, size: folderSize });
            }
          }
        } catch {
          // ignore stat errors
        }
      }
    } catch {
      // ignore readdir errors
    }
  }

  // Sort descending by size
  foundFiles.sort((a, b) => b.size - a.size);

  return foundFiles.slice(0, 15).map((f, idx) => {
    const sizeMB = Math.round(f.size / (1024 * 1024));
    const safeName = f.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const isFolder = f.name.includes("(Folder)");

    return {
      id: `file_${safeName}_${idx}`,
      name: f.name,
      path: f.path,
      sizeBytes: f.size,
      sizeMB,
      category: isFolder ? "big_folder" : "big_file",
      sizeOrImpact: `${sizeMB} MB`,
      protected: false,
      isPersonal: isPersonalFolder(f.path),
      cleanable: false, // Personal files are NEVER auto-cleaned
    };
  });
}

/**
 * Compute Deterministic Health Score (0 - 100)
 */
function computeHealthScore(
  system: SystemStats,
  mainDisk: DiskDrive,
  startupApps: StartupAppItem[],
  cleanableTargets: CleanableTargetSummary[]
): number {
  let score = 100;

  // 1. RAM pressure (up to 25 pts penalty)
  if (system.usedRamPercent > 90) {
    score -= 25;
  } else if (system.usedRamPercent > 80) {
    score -= 15;
  } else if (system.usedRamPercent > 70) {
    score -= 8;
  }

  // 2. Disk pressure (up to 25 pts penalty)
  if (mainDisk.usedPercent > 90) {
    score -= 25;
  } else if (mainDisk.usedPercent > 80) {
    score -= 15;
  } else if (mainDisk.usedPercent > 70) {
    score -= 8;
  }

  // 3. Startup apps bloat (up to 20 pts penalty)
  const unneededStartups = startupApps.filter((s) => !s.protected);
  if (unneededStartups.length > 7) {
    score -= 20;
  } else if (unneededStartups.length > 4) {
    score -= 12;
  } else if (unneededStartups.length > 2) {
    score -= 6;
  }

  // 4. Junk accumulation (up to 15 pts penalty)
  const totalJunkBytes = cleanableTargets.reduce((sum, t) => sum + t.sizeBytes, 0);
  const totalJunkGB = totalJunkBytes / (1024 * 1024 * 1024);
  if (totalJunkGB > 5) {
    score -= 15;
  } else if (totalJunkGB > 2) {
    score -= 10;
  } else if (totalJunkGB > 0.5) {
    score -= 5;
  }

  return Math.max(15, Math.min(100, Math.round(score)));
}

/**
 * Main Full System Scan
 */
export async function performFullScan(): Promise<ScanReport> {
  const [system, { disks, mainDisk }, runningApps, startupApps, cleanableTargets, bigFiles] =
    await Promise.all([
      scanSystem(),
      scanDisks(),
      scanRunningApps(),
      scanStartupApps(),
      scanCleanableTargets(),
      scanBigFiles(),
    ]);

  const healthScore = computeHealthScore(system, mainDisk, startupApps, cleanableTargets);

  const potentialSavingsBytes = cleanableTargets.reduce((sum, t) => sum + t.sizeBytes, 0);
  const potentialSavingsMB = Math.round(potentialSavingsBytes / (1024 * 1024));
  const potentialSavingsGB = parseFloat((potentialSavingsBytes / (1024 * 1024 * 1024)).toFixed(2));

  const report: ScanReport = {
    id: `scan_${Date.now()}`,
    timestamp: new Date().toISOString(),
    system,
    disks,
    mainDisk,
    runningApps,
    startupApps,
    bigFiles,
    cleanableTargets,
    healthScore,
    potentialSavingsMB,
    potentialSavingsGB,
  };

  setLatestScanReport(report);
  return report;
}
