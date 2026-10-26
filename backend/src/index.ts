import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { healthRouter } from "./routes/health.js";
import { scanRouter } from "./routes/scan.js";
import { planRouter } from "./routes/plan.js";
import { cleanRouter } from "./routes/clean.js";
import { startupRouter } from "./routes/startup.js";
import { appsRouter } from "./routes/apps.js";
import { historyRouter } from "./routes/history.js";
import { revealRouter } from "./routes/reveal.js";
import { askRouter } from "./routes/ask.js";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// Privacy-safe request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(`[Featherlight] ${req.method} ${req.path} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

// Mount active routes
app.use("/api/health", healthRouter);
app.use("/api/scan", scanRouter);
app.use("/api/plan", planRouter);
app.use("/api/clean", cleanRouter);
app.use("/api/startup", startupRouter);
app.use("/api/apps", appsRouter);
app.use("/api/history", historyRouter);
app.use("/api/reveal", revealRouter);
app.use("/api/ask", askRouter);

app.get("/", (_req, res) => {
  res.json({
    app: "Featherlight",
    tagline: "Make your laptop light again.",
    privacy: "100% Local - No cloud AI - No data uploaded",
    dryRun: config.dryRun,
    endpoints: [
      "/api/health",
      "/api/scan",
      "/api/plan",
      "/api/clean/preview",
      "/api/clean/apply",
      "/api/startup/disable",
      "/api/startup/undo",
      "/api/apps/close",
      "/api/history",
      "/api/reveal",
      "/api/ask",
    ],
  });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[Featherlight Error]", err?.message || err);
  res.status(err.status || 500).json({
    error: err.name || "ServerError",
    message: err.message || "An unexpected error occurred",
  });
});

app.listen(config.port, () => {
  console.log(`🪶 Featherlight Backend running on http://localhost:${config.port}`);
  console.log(`🔒 Privacy-First: All scanning and cleaning runs locally on your machine.`);
  console.log(`🛡️ DRY_RUN mode: ${config.dryRun ? "ENABLED (Simulation only)" : "DISABLED (Live changes permitted)"}`);
});
