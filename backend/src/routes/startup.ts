import { Router, Request, Response } from "express";
import { z } from "zod";
import { disableStartupEntry, undoStartupEntry } from "../startup_manager.js";

export const startupRouter = Router();

const StartupActionSchema = z.object({
  id: z.string().min(1, "Startup ID is required"),
});

startupRouter.post("/disable", async (req: Request, res: Response): Promise<void> => {
  const parsed = StartupActionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "InvalidPayload", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await disableStartupEntry(parsed.data.id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: "DisableFailed", message: err.message });
  }
});

startupRouter.post("/undo", async (req: Request, res: Response): Promise<void> => {
  const parsed = StartupActionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "InvalidPayload", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await undoStartupEntry(parsed.data.id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: "UndoFailed", message: err.message });
  }
});
