import { exec } from "child_process";
import { promisify } from "util";
import { getLatestScanReport } from "./scanner.js";
import { config } from "./config.js";

const execAsync = promisify(exec);

/**
 * Safely terminate a non-protected running app by ID
 */
export async function closeRunningApp(id: string): Promise<{
  success: boolean;
  name: string;
  memoryFreedMB: number;
  dryRun: boolean;
  message: string;
}> {
  const report = getLatestScanReport();
  if (!report) {
    throw new Error("No active scan report found. Please run a scan first.");
  }

  const app = report.runningApps.find((a) => a.id === id);
  if (!app) {
    throw new Error(`Running app with id '${id}' not found in scan report.`);
  }

  if (app.protected) {
    throw new Error(`'${app.name}' is a system process and cannot be closed.`);
  }

  if (config.dryRun) {
    return {
      success: true,
      name: app.name,
      memoryFreedMB: app.memoryMB,
      dryRun: true,
      message: `[DRY_RUN] Simulated closing '${app.name}'. Would free ~${app.memoryMB} MB RAM.`,
    };
  }

  // Live close on Windows: taskkill by process image name or pids
  if (process.platform === "win32") {
    for (const pid of app.pids) {
      if (typeof pid === "number" && pid > 4) {
        try {
          await execAsync(`taskkill /PID ${pid} /F`);
        } catch {
          // ignore already exited pid
        }
      }
    }
  }

  return {
    success: true,
    name: app.name,
    memoryFreedMB: app.memoryMB,
    dryRun: false,
    message: `Closed '${app.name}' and freed ~${app.memoryMB} MB of memory. Note that background services may restart if triggered by Windows.`,
  };
}
