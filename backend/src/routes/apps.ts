import { Router, Request, Response } from "express";
import { z } from "zod";
import { closeRunningApp } from "../app_manager.js";

export const appsRouter = Router();

const CloseAppSchema = z.object({
  id: z.string().min(1, "App ID is required"),
});

appsRouter.post("/close", async (req: Request, res: Response): Promise<void> => {
  const parsed = CloseAppSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "InvalidPayload", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await closeRunningApp(parsed.data.id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: "CloseFailed", message: err.message });
  }
});
