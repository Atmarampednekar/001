import { z } from "zod";
import path from "path";
import {
  ScanReport,
  FixPlanItem,
  AIPlanResponse,
  ActionType,
  RiskLevel,
} from "./types.js";
import { generateCompletion, extractJSON } from "./ollama.js";

const AIProposedFixSchema = z.object({
  id: z.string(),
  reason: z.string().min(3),
  action: z.enum([
    "switch off at startup",
    "close when not in use",
    "clean junk",
    "move to cloud storage",
    "review and delete",
    "uninstall if unused",
  ]),
});

const AIPlanOutputSchema = z.object({
  summary: z.string().min(5),
  proposedFixes: z.array(AIProposedFixSchema),
});

/**
 * Generate deterministic How-To steps based on action type
 */
function generateHowToSteps(action: ActionType, name: string, location: string, saving: string): string[] {
  switch (action) {
    case "switch off at startup":
      return [
        "Press Ctrl + Shift + Esc to open Task Manager.",
        "Click on the 'Startup apps' icon on the left menu.",
        `Find "${name}", right-click it, and select 'Disable'.`,
        "It will no longer slow down your laptop startup.",
      ];
    case "close when not in use":
      return [
        `Locate "${name}" in your taskbar or bottom-right system tray.`,
        "Right-click its icon and select 'Exit' or 'Quit'.",
        `This will instantly free up ${saving} of RAM for active programs.`,
      ];
    case "clean junk":
      return [
        "Click 'Clean now' in Featherlight to safely purge these temporary files.",
        "Alternatively, press Win + R, type '%TEMP%', and delete files older than 24 hours.",
        "No personal files, passwords, or browser bookmarks are touched.",
      ];
    case "move to cloud storage":
      return [
        `Navigate to the file location: ${location}`,
        "Upload the file or folder to OneDrive, Google Drive, or an external SSD.",
        `Delete the local copy to reclaim ${saving} of storage.`,
      ];
    case "review and delete":
      return [
        `Open File Explorer at: ${location}`,
        `Verify whether you still need "${name}".`,
        `Delete or move it to free up ${saving}.`,
      ];
    case "uninstall if unused":
      return [
        "Press Win + I to open Windows Settings.",
        "Navigate to Apps > Installed apps.",
        `Search for "${name}", click the three dots, and choose 'Uninstall'.`,
      ];
    default:
      return ["Follow the on-screen instructions to free up resources safely."];
  }
}

/**
 * Code-generated fallback plan when AI is unavailable or produces invalid output
 */
export function generateCodeFallbackPlan(report: ScanReport): AIPlanResponse {
  const fixes: FixPlanItem[] = [];

  // 1. Clean Junk if available
  const totalJunk = report.cleanableTargets.reduce((sum, t) => sum + t.sizeBytes, 0);
  if (totalJunk > 100 * 1024 * 1024) {
    // > 100MB
    const mb = Math.round(totalJunk / (1024 * 1024));
    fixes.push({
      id: "target_user_temp",
      title: "Clean temporary caches and junk files",
      action: "clean junk",
      reason: `Accumulated temporary caches and logs are occupying ${mb} MB of disk space.`,
      risk: "low",
      location: "Windows Temp and Browser Caches",
      howTo: generateHowToSteps("clean junk", "Temporary Cache", "Windows Temp", `${mb} MB`),
      estimatedSaving: `${mb} MB disk space`,
      targetId: "target_user_temp",
    });
  }

  // 2. High memory running non-protected apps
  const heavyApps = report.runningApps.filter((a) => !a.protected && a.memoryMB > 250);
  for (const app of heavyApps.slice(0, 2)) {
    fixes.push({
      id: app.id,
      title: `Close ${app.name} when not actively using it`,
      action: "close when not in use",
      reason: `${app.name} is consuming ${app.memoryMB} MB of memory in the background.`,
      risk: "low",
      location: app.path,
      howTo: generateHowToSteps("close when not in use", app.name, app.path, `${app.memoryMB} MB`),
      estimatedSaving: `${app.memoryMB} MB RAM`,
    });
  }

  // 3. User startup apps
  const startupCandidates = report.startupApps.filter((s) => !s.protected && s.canDisable);
  for (const s of startupCandidates.slice(0, 2)) {
    fixes.push({
      id: s.id,
      title: `Switch off ${s.name} at startup`,
      action: "switch off at startup",
      reason: `Launches automatically at Windows login, slowing down boot time and background responsiveness.`,
      risk: "low",
      location: s.location,
      howTo: generateHowToSteps("switch off at startup", s.name, s.location, "Faster boot & RAM"),
      estimatedSaving: "Faster boot & RAM",
    });
  }

  // 4. Large personal files (suggest-only)
  const bigPersonal = report.bigFiles.filter((f) => f.isPersonal && f.sizeMB > 500);
  for (const f of bigPersonal.slice(0, 1)) {
    fixes.push({
      id: f.id,
      title: `Review large file: ${f.name}`,
      action: "review and delete",
      reason: `This file is taking up ${f.sizeMB} MB in your ${path.basename(path.dirname(f.path))} folder.`,
      risk: "medium",
      location: f.path,
      howTo: generateHowToSteps("review and delete", f.name, f.path, `${f.sizeMB} MB`),
      estimatedSaving: `${f.sizeMB} MB disk space`,
    });
  }

  const summary = `Your laptop health score is ${report.healthScore}/100. Memory is ${report.system.usedRamPercent}% full, and disk space can be optimized by removing safe junk and switching off background startup programs.`;

  return {
    summary,
    fixes: fixes.slice(0, 5),
    generatedByAI: false,
  };
}

/**
 * Validate proposed fixes against the report:
 * STRICT RULE: Discard any fix whose id is unknown or protected!
 */
export function validateAndEnrichFixes(
  proposedFixes: Array<{ id: string; reason: string; action: ActionType }>,
  report: ScanReport
): FixPlanItem[] {
  // Build lookup maps of valid items from report
  const appMap = new Map(report.runningApps.map((a) => [a.id, a]));
  const startupMap = new Map(report.startupApps.map((s) => [s.id, s]));
  const fileMap = new Map(report.bigFiles.map((f) => [f.id, f]));
  const targetMap = new Map(report.cleanableTargets.map((t) => [t.id, t]));

  const validFixes: FixPlanItem[] = [];

  for (const prop of proposedFixes) {
    // 1. Check if ID exists in cleanable targets
    if (targetMap.has(prop.id)) {
      const target = targetMap.get(prop.id)!;
      validFixes.push({
        id: target.id,
        title: `Clean ${target.name}`,
        action: "clean junk",
        reason: prop.reason || target.description,
        risk: "low",
        location: target.path,
        howTo: generateHowToSteps("clean junk", target.name, target.path, `${target.sizeMB} MB`),
        estimatedSaving: `${target.sizeMB} MB disk space`,
        targetId: target.id,
      });
      continue;
    }

    // 2. Check running apps (MUST NOT BE PROTECTED)
    if (appMap.has(prop.id)) {
      const app = appMap.get(prop.id)!;
      if (app.protected) {
        console.warn(`[Plan Safety] Rejected fix for protected process id: ${prop.id}`);
        continue; // REJECT
      }
      validFixes.push({
        id: app.id,
        title: `Close ${app.name} when not in use`,
        action: "close when not in use",
        reason: prop.reason || `Consuming ${app.memoryMB} MB RAM in the background.`,
        risk: "low",
        location: app.path,
        howTo: generateHowToSteps("close when not in use", app.name, app.path, `${app.memoryMB} MB`),
        estimatedSaving: `${app.memoryMB} MB RAM`,
      });
      continue;
    }

    // 3. Check startup apps (MUST NOT BE PROTECTED & CAN DISABLE)
    if (startupMap.has(prop.id)) {
      const startup = startupMap.get(prop.id)!;
      if (startup.protected || !startup.canDisable) {
        console.warn(`[Plan Safety] Rejected fix for protected/system startup id: ${prop.id}`);
        continue; // REJECT
      }
      validFixes.push({
        id: startup.id,
        title: `Switch off ${startup.name} at startup`,
        action: "switch off at startup",
        reason: prop.reason || `Starts automatically at login.`,
        risk: "low",
        location: startup.location,
        howTo: generateHowToSteps("switch off at startup", startup.name, startup.location, "Faster boot"),
        estimatedSaving: "Faster boot & RAM",
      });
      continue;
    }

    // 4. Check big files (Personal files can only be suggest-only)
    if (fileMap.has(prop.id)) {
      const file = fileMap.get(prop.id)!;
      if (file.protected) {
        continue;
      }
      const action = file.sizeMB > 1000 ? "move to cloud storage" : "review and delete";
      validFixes.push({
        id: file.id,
        title: `Review ${file.name}`,
        action,
        reason: prop.reason || `Large file taking up ${file.sizeMB} MB of storage.`,
        risk: "medium",
        location: file.path,
        howTo: generateHowToSteps(action, file.name, file.path, `${file.sizeMB} MB`),
        estimatedSaving: `${file.sizeMB} MB disk space`,
      });
      continue;
    }

    // If ID is unknown -> DISCARD
    console.warn(`[Plan Safety] Rejected unknown fix id: ${prop.id}`);
  }

  // Deduplicate and cap at 5 fixes
  const seenIds = new Set<string>();
  const deduped: FixPlanItem[] = [];
  for (const f of validFixes) {
    if (!seenIds.has(f.id)) {
      seenIds.add(f.id);
      deduped.push(f);
    }
  }

  return deduped.slice(0, 5);
}

/**
 * Generate AI Plan with ID validation & code fallback
 */
export async function createOptimizationPlan(report: ScanReport): Promise<AIPlanResponse> {
  // Build a compact representation of candidiate un-protected items
  const candidates: Array<{ id: string; name: string; type: string; impact: string }> = [];

  // Cleanable targets
  report.cleanableTargets.forEach((t) => {
    candidates.push({ id: t.id, name: t.name, type: "cleanable_junk", impact: `${t.sizeMB} MB` });
  });

  // Non-protected running apps
  report.runningApps
    .filter((a) => !a.protected)
    .slice(0, 8)
    .forEach((a) => {
      candidates.push({ id: a.id, name: a.name, type: "running_app", impact: `${a.memoryMB} MB RAM` });
    });

  // Non-protected startup apps
  report.startupApps
    .filter((s) => !s.protected && s.canDisable)
    .slice(0, 6)
    .forEach((s) => {
      candidates.push({ id: s.id, name: s.name, type: "startup_app", impact: s.sizeOrImpact });
    });

  // Big files
  report.bigFiles.slice(0, 4).forEach((f) => {
    candidates.push({ id: f.id, name: f.name, type: "large_file", impact: `${f.sizeMB} MB` });
  });

  const systemPrompt = `You are Featherlight's minimalist laptop optimizer AI.
Analyze the compact scan report and select up to 5 top fixes to make the laptop run fast again.
STRICT RULES:
1. You MUST choose fixes ONLY from the candidate IDs provided. NEVER invent any ID.
2. Output strictly JSON matching this structure:
{
  "summary": "One calm sentence summarizing the primary slowdown and the fix.",
  "proposedFixes": [
    {
      "id": "<EXACT ID FROM CANDIDATES>",
      "reason": "One plain sentence explaining why stopping or cleaning this helps.",
      "action": "switch off at startup" | "close when not in use" | "clean junk" | "move to cloud storage" | "review and delete" | "uninstall if unused"
    }
  ]
}
3. No other text or markdown. Only JSON.`;

  const userPrompt = `System Status:
- RAM: ${report.system.usedRamPercent}% used (${report.system.usedRamMB} MB / ${report.system.totalRamMB} MB)
- Main Disk: ${report.mainDisk.usedPercent}% used (${report.mainDisk.gbToFree > 0 ? `Free ${report.mainDisk.gbToFree} GB to reach 80%` : "Under 80%"})
- Health Score: ${report.healthScore}/100

Available Candidate Items (Pick ONLY by these exact IDs):
${JSON.stringify(candidates, null, 2)}

Return the JSON optimization plan.`;

  try {
    const rawOutput = await generateCompletion({
      prompt: userPrompt,
      system: systemPrompt,
      temperature: 0.2,
      format: "json",
    });

    const parsedJson = extractJSON<any>(rawOutput);
    const validated = AIPlanOutputSchema.parse(parsedJson);

    // Validate every proposed fix against report and discard unknown or protected IDs
    const validFixes = validateAndEnrichFixes(validated.proposedFixes, report);

    if (validFixes.length === 0) {
      // If AI proposed only invalid IDs, fallback to code plan
      return generateCodeFallbackPlan(report);
    }

    return {
      summary: validated.summary,
      fixes: validFixes,
      generatedByAI: true,
    };
  } catch (err1: any) {
    // Retry once with stricter prompt
    try {
      const retryPrompt = `Choose 3 to 5 candidate IDs from: ${candidates.map((c) => c.id).join(", ")}.
Output strictly JSON: {"summary": "...", "proposedFixes": [{"id": "...", "reason": "...", "action": "clean junk"|"switch off at startup"|"close when not in use"}]}`;

      const retryOutput = await generateCompletion({
        prompt: retryPrompt,
        system: systemPrompt,
        temperature: 0.1,
        format: "json",
      });

      const parsedJson2 = extractJSON<any>(retryOutput);
      const validated2 = AIPlanOutputSchema.parse(parsedJson2);
      const validFixes2 = validateAndEnrichFixes(validated2.proposedFixes, report);

      if (validFixes2.length > 0) {
        return {
          summary: validated2.summary,
          fixes: validFixes2,
          generatedByAI: true,
        };
      }
    } catch {
      // ignore
    }

    // Fall back to code-generated plan
    return generateCodeFallbackPlan(report);
  }
}
