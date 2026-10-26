import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  ollamaModel: process.env.OLLAMA_MODEL || "gemma3:4b",
  dryRun: process.env.DRY_RUN !== "false", // default to true for safety
  targetDiskPercent: parseInt(process.env.TARGET_DISK_PERCENT || "80", 10),
};
