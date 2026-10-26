import { Router, Request, Response } from "express";
import { z } from "zod";
import { createCleanPreview, applyClean } from "../cleaner.js";

export const cleanRouter = Router();

const CleanPreviewRequestSchema = z.object({
  targetIds: z.array(z.string()).min(1, "Select at least one cleanable target"),
});

const CleanApplyRequestSchema = z.object({
  previewToken: z.string().min(5, "Valid previewToken is required"),
});

cleanRouter.post("/preview", async (req: Request, res: Response): Promise<void> => {
  const parsed = CleanPreviewRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "InvalidPayload", details: parsed.error.flatten() });
    return;
  }

  try {
    const preview = await createCleanPreview(parsed.data.targetIds);
    res.json(preview);
  } catch (err: any) {
    res.status(500).json({ error: "PreviewFailed", message: err.message });
  }
});

cleanRouter.post("/apply", async (req: Request, res: Response): Promise<void> => {
  const parsed = CleanApplyRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "InvalidPayload", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await applyClean(parsed.data.previewToken);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: "CleanFailed", message: err.message });
  }
});
