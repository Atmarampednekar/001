import { Router, Request, Response } from "express";
import { z } from "zod";
import { createOptimizationPlan, generateCodeFallbackPlan, validateAndEnrichFixes } from "../planner.js";
import { getLatestScanReport, performFullScan } from "../scanner.js";
import { ScanReport } from "../types.js";

export const planRouter = Router();

planRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    let report: ScanReport | null = req.body?.report || getLatestScanReport();

    if (!report) {
      report = await performFullScan();
    }

    const plan = await createOptimizationPlan(report);
    res.json(plan);
  } catch (err: any) {
    console.error("[Plan Route Error]", err);
    // Fall back to code plan if anything fails
    const fallbackReport = getLatestScanReport();
    if (fallbackReport) {
      res.json(generateCodeFallbackPlan(fallbackReport));
      return;
    }
    res.status(500).json({
      error: "PlanGenerationFailed",
      message: err.message || "Could not generate optimization plan",
    });
  }
});

// Direct test endpoint for Phase 3 verification
planRouter.post("/test-safety", (req: Request, res: Response): void => {
  const report = getLatestScanReport();
  if (!report) {
    res.status(400).json({ error: "Run a scan first" });
    return;
  }

  // 1. Submit a fake ID, a protected ID (powershell), and a valid ID
  const testInput = [
    { id: "fake_nonexistent_id_999", reason: "Fake item", action: "clean junk" as const },
    { id: "app_powershell_exe_14", reason: "Protected shell", action: "close when not in use" as const },
    { id: "startup_folder_ollama", reason: "Protected local AI", action: "switch off at startup" as const },
    { id: "target_user_temp", reason: "Safe temporary junk", action: "clean junk" as const },
  ];

  const filteredFixes = validateAndEnrichFixes(testInput, report);

  const fakeRejected = !filteredFixes.some((f) => f.id === "fake_nonexistent_id_999");
  const protectedRejected = !filteredFixes.some((f) => f.id.includes("powershell") || f.id.includes("ollama"));
  const validAccepted = filteredFixes.some((f) => f.id === "target_user_temp");

  res.json({
    passed: fakeRejected && protectedRejected && validAccepted,
    fakeIdRejected: fakeRejected,
    protectedIdRejected: protectedRejected,
    validIdAccepted: validAccepted,
    resultingFixes: filteredFixes,
  });
});
