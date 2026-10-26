import { Router, Request, Response } from "express";
import { z } from "zod";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { getLatestScanReport } from "../scanner.js";

export const revealRouter = Router();

const RevealRequestSchema = z.object({
  path: z.string().min(1, "Path is required"),
});

revealRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  const parsed = RevealRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "InvalidPayload", details: parsed.error.flatten() });
    return;
  }

  const requestedPath = parsed.data.path;
  const report = getLatestScanReport();

  if (!report) {
    res.status(400).json({ error: "NoScan", message: "Please run a scan before opening locations." });
    return;
  }

  // Security allowlist: Ensure path is explicitly referenced in the latest scan report
  const knownPaths = new Set<string>();
  report.runningApps.forEach((a) => a.path && knownPaths.add(a.path.toLowerCase()));
  report.startupApps.forEach((s) => s.path && knownPaths.add(s.path.toLowerCase()));
  report.bigFiles.forEach((f) => f.path && knownPaths.add(f.path.toLowerCase()));
  report.cleanableTargets.forEach((t) => t.path && knownPaths.add(t.path.toLowerCase()));

  const normalizedRequested = requestedPath.toLowerCase();
  const isKnown = knownPaths.has(normalizedRequested) || Array.from(knownPaths).some((kp) => normalizedRequested.startsWith(kp));

  if (!isKnown) {
    res.status(403).json({
      error: "AccessDenied",
      message: "Security restriction: You can only reveal paths detected in your scan report.",
    });
    return;
  }

  if (process.platform === "win32") {
    // Check if target file or directory exists
    if (!fs.existsSync(requestedPath)) {
      res.status(404).json({ error: "NotFound", message: "Path does not exist on disk." });
      return;
    }

    try {
      // Safe reveal in Windows explorer
      const isDir = fs.statSync(requestedPath).isDirectory();
      if (isDir) {
        exec(`explorer.exe "${requestedPath}"`);
      } else {
        exec(`explorer.exe /select,"${requestedPath}"`);
      }
      res.json({ success: true, message: `Opened '${path.basename(requestedPath)}' in File Explorer.` });
    } catch (err: any) {
      res.status(500).json({ error: "RevealFailed", message: err.message });
    }
  } else {
    res.json({ success: false, message: "File reveal is currently supported on Windows." });
  }
});
