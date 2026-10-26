import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { exec } from "child_process";
import { promisify } from "util";
import { CleanPreviewResult, CleanApplyResult, CleanHistoryEntry } from "./types.js";
import { getLatestScanReport } from "./scanner.js";
import { config } from "./config.js";

const execAsync = promisify(exec);

// Path for storing history
const DATA_DIR = path.join(process.cwd(), "data");
const HISTORY_FILE = path.join(DATA_DIR, "clean_history.json");

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getCleanHistory(): CleanHistoryEntry[] {
  ensureDataDir();
  if (!fs.existsSync(HISTORY_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(HISTORY_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function appendCleanHistory(entry: CleanHistoryEntry): void {
  const current = getCleanHistory();
  current.unshift(entry);
  // Keep last 50
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(current.slice(0, 50), null, 2), "utf-8");
}

// In-memory store for active preview tokens (expires in 10 minutes)
interface StoredPreview {
  previewToken: string;
  expiresAt: number;
  targetIds: string[];
  dryRun: boolean;
  totalSizeBytes: number;
}

const activePreviews = new Map<string, StoredPreview>();

/**
 * Generate preview of cleanable targets (NO changes made)
 */
export async function createCleanPreview(targetIds: string[]): Promise<CleanPreviewResult> {
  const report = getLatestScanReport();
  const availableTargets = report ? report.cleanableTargets : [];
  const targetMap = new Map(availableTargets.map((t) => [t.id, t]));

  // Strict validation: Only accept allowlisted targets from latest scan report
  const resolvedTargets: CleanPreviewResult["targets"] = [];
  let totalSizeBytes = 0;
  let totalFileCount = 0;

  for (const tid of targetIds) {
    if (targetMap.has(tid)) {
      const target = targetMap.get(tid)!;
      resolvedTargets.push({
        id: target.id,
        name: target.name,
        path: target.path,
        fileCount: target.fileCount,
        totalSizeBytes: target.sizeBytes,
        totalSizeMB: target.sizeMB,
        actionDescription: target.description,
      });
      totalSizeBytes += target.sizeBytes;
      totalFileCount += target.fileCount;
    }
  }

  const previewToken = `preview_${crypto.randomBytes(16).toString("hex")}`;
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  activePreviews.set(previewToken, {
    previewToken,
    expiresAt,
    targetIds: resolvedTargets.map((t) => t.id),
    dryRun: config.dryRun,
    totalSizeBytes,
  });

  return {
    previewToken,
    expiresAt,
    targets: resolvedTargets,
    totalSizeBytes,
    totalSizeMB: Math.round(totalSizeBytes / (1024 * 1024)),
    totalFileCount,
    dryRun: config.dryRun,
  };
}

/**
 * Apply clean action using preview token (dry-run or live allowlisted purge)
 */
export async function applyClean(previewToken: string): Promise<CleanApplyResult> {
  const preview = activePreviews.get(previewToken);
  if (!preview) {
    throw new Error("Invalid or expired preview token. Please preview the clean action again.");
  }
  if (Date.now() > preview.expiresAt) {
    activePreviews.delete(previewToken);
    throw new Error("Preview token expired. Please preview the clean action again.");
  }

  // Token is single-use
  activePreviews.delete(previewToken);

  const report = getLatestScanReport();
  const availableTargets = report ? report.cleanableTargets : [];
  const targetMap = new Map(availableTargets.map((t) => [t.id, t]));

  let totalBytesFreed = 0;
  let totalFilesDeleted = 0;
  let totalFilesSkipped = 0;
  const details: CleanApplyResult["details"] = [];

  const isDryRun = config.dryRun;

  for (const targetId of preview.targetIds) {
    const target = targetMap.get(targetId);
    if (!target) continue;

    let targetBytesFreed = 0;
    let targetFilesDeleted = 0;
    let targetFilesSkipped = 0;

    if (isDryRun) {
      // In DRY_RUN mode: simulate freeing all identified bytes without disk writes
      targetBytesFreed = target.sizeBytes;
      targetFilesDeleted = target.fileCount;
      targetFilesSkipped = 0;
    } else {
      // Live Allowlisted Cleaner
      if (targetId === "target_recycle_bin") {
        if (process.platform === "win32") {
          try {
            await execAsync('powershell -NoProfile -Command "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"');
            targetBytesFreed = target.sizeBytes;
            targetFilesDeleted = target.fileCount;
          } catch {
            targetFilesSkipped++;
          }
        }
      } else if (
        targetId === "target_user_temp" ||
        targetId === "target_system_temp" ||
        targetId === "target_chrome_cache" ||
        targetId === "target_edge_cache" ||
        targetId === "target_thumbnail_cache"
      ) {
        // Safe file cleaner: files older than 24h for temp, or cache folders
        const folderPath = target.path;
        if (fs.existsSync(folderPath)) {
          const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
          try {
            const files = fs.readdirSync(folderPath);
            for (const f of files) {
              const fullPath = path.join(folderPath, f);
              try {
                const stat = fs.statSync(fullPath);
                // For temp folders, only delete files older than 24 hours
                if (target.category === "junk_temp" && stat.mtimeMs > oneDayAgo) {
                  targetFilesSkipped++;
                  continue;
                }
                if (stat.isDirectory()) {
                  fs.rmSync(fullPath, { recursive: true, force: true });
                  targetBytesFreed += stat.size;
                  targetFilesDeleted++;
                } else {
                  fs.unlinkSync(fullPath);
                  targetBytesFreed += stat.size;
                  targetFilesDeleted++;
                }
              } catch {
                // Skip locked or permission-denied files
                targetFilesSkipped++;
              }
            }
          } catch {
            targetFilesSkipped++;
          }
        }
      }
    }

    totalBytesFreed += targetBytesFreed;
    totalFilesDeleted += targetFilesDeleted;
    totalFilesSkipped += targetFilesSkipped;

    details.push({
      targetId: target.id,
      path: target.path,
      bytesFreed: targetBytesFreed,
      filesDeleted: targetFilesDeleted,
      filesSkipped: targetFilesSkipped,
    });
  }

  const mbFreed = Math.round(totalBytesFreed / (1024 * 1024));

  // Log to clean history
  appendCleanHistory({
    id: `clean_${Date.now()}`,
    timestamp: new Date().toISOString(),
    dryRun: isDryRun,
    mbFreed,
    filesDeleted: totalFilesDeleted,
    targetsCleaned: preview.targetIds,
  });

  return {
    success: true,
    dryRun: isDryRun,
    bytesFreed: totalBytesFreed,
    mbFreed,
    filesDeleted: totalFilesDeleted,
    filesSkipped: totalFilesSkipped,
    timestamp: new Date().toISOString(),
    details,
  };
}
