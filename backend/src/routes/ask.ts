import { Router, Request, Response } from "express";
import { z } from "zod";
import { streamCompletion } from "../ollama.js";
import { getLatestScanReport } from "../scanner.js";
import { isProtectedProcess, isProtectedStartup } from "../protected.js";
import { ScanReport } from "../types.js";

export const askRouter = Router();

const AskRequestSchema = z.object({
  question: z.string().min(1, "Question cannot be empty"),
  report: z.any().optional(),
});

askRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  const parsed = AskRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "InvalidPayload", details: parsed.error.flatten() });
    return;
  }

  const { question } = parsed.data;
  const report: ScanReport | null = parsed.data.report || getLatestScanReport();

  // Set SSE response headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  // 1. Mandatory Protection Guardrail:
  // If the user asks about an OS process, shell, driver, or protected service, return exact mandate:
  // "This is a system component. Please leave it alone."
  const lowerQ = question.toLowerCase();
  const protectedKeywords = [
    "system",
    "explorer",
    "svchost",
    "csrss",
    "smss",
    "wininit",
    "services.exe",
    "lsass",
    "dwm",
    "audiodg",
    "defender",
    "antivirus",
    "ollama",
    "featherlight",
    "powershell",
    "cmd.exe",
  ];

  const mentionsProtected = protectedKeywords.some((kw) => lowerQ.includes(kw));

  if (mentionsProtected) {
    const responseText =
      "This is a system component. Please leave it alone. Switching off or stopping this item can cause Windows instability or interrupt core system functions.";
    res.write(`data: ${JSON.stringify({ token: responseText })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
    return;
  }

  // 2. Build compact context grounded ONLY in the scan report
  let contextReport = "";
  if (report) {
    const runningSummary = report.runningApps
      .slice(0, 10)
      .map((a) => `${a.name} (${a.memoryMB} MB, Protected: ${a.protected})`)
      .join(", ");
    const startupSummary = report.startupApps
      .map((s) => `${s.name} (Protected: ${s.protected}, CanDisable: ${s.canDisable})`)
      .join(", ");

    contextReport = `Current Laptop Scan:
- RAM Usage: ${report.system.usedRamPercent}% (${report.system.usedRamMB} MB used)
- Main Disk: ${report.mainDisk.usedPercent}% used
- Running Apps: ${runningSummary}
- Startup Programs: ${startupSummary}
- Safe Cleanable Junk: ${report.potentialSavingsMB} MB`;
  }

  const systemPrompt = `You are Featherlight's safety assistant.
Answer the user's question about laptop performance or whether an app or startup item is safe to switch off.
STRICT RULES:
1. Ground your advice ONLY in the provided scan report and standard PC safety best practices.
2. If any item is marked protected or is an essential OS component, say: "This is a system component. Please leave it alone."
3. Non-essential apps like Spotify, Discord, Steam, game launchers, or browser updaters are safe to disable at startup.
4. Keep the answer calm, brief (1-2 short paragraphs), friendly, and free of jargon.`;

  const userPrompt = `${contextReport ? contextReport + "\n\n" : ""}User Question: "${question}"

Provide a clear, reassuring answer on safety and how to make the laptop run lighter.`;

  try {
    const stream = streamCompletion({
      prompt: userPrompt,
      system: systemPrompt,
      temperature: 0.2,
    });

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify({ token: chunk })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    // Grounded fallback answer if Ollama stream fails
    let fallbackText = `Based on your system scan:\n`;
    if (lowerQ.includes("safe") || lowerQ.includes("switch off")) {
      fallbackText += `Programs like game clients (Steam, Riot), chat apps (Discord, Notion), and browser updaters are completely safe to switch off from automatic startup in Task Manager. They will only open when you click on them, keeping your laptop fast.`;
    } else {
      fallbackText += `To make your laptop run lighter, clean safe temporary caches and switch off non-essential startup apps so only programs you are actively using consume memory.`;
    }

    res.write(`data: ${JSON.stringify({ token: fallbackText })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  }
});
