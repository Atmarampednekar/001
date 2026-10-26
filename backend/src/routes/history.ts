import { Router, Request, Response } from "express";
import { getCleanHistory } from "../cleaner.js";

export const historyRouter = Router();

historyRouter.get("/", (_req: Request, res: Response) => {
  const history = getCleanHistory();
  res.json({ history });
});
