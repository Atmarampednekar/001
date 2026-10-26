import { Router, Request, Response } from "express";
import { checkOllamaHealth } from "../ollama.js";
import { config } from "../config.js";

export const healthRouter = Router();

healthRouter.get("/", async (_req: Request, res: Response) => {
  const health = await checkOllamaHealth();
  res.json({
    ...health,
    dryRun: config.dryRun,
    platform: process.platform,
  });
});
