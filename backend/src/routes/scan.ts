import { Router, Request, Response } from "express";
import { performFullScan, getLatestScanReport } from "../scanner.js";

export const scanRouter = Router();

// Run a fresh full scan
scanRouter.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const report = await performFullScan();
    res.json(report);
  } catch (err: any) {
    console.error("[Scan Error]", err);
    res.status(500).json({
      error: "ScanFailed",
      message: err.message || "Failed to scan system",
    });
  }
});

// Get the latest cached scan report without re-running
scanRouter.get("/latest", (_req: Request, res: Response): void => {
  const report = getLatestScanReport();
  if (!report) {
    res.status(404).json({ error: "NoScanFound", message: "No scan has been performed yet." });
    return;
  }
  res.json(report);
});
