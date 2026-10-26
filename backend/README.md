# Featherlight Backend

> **"Make your laptop light again."**  
> Privacy-first, local system scanner and optimizer engine powered by Gemma 3 4B via Ollama.

---

## 🔒 Privacy & Safety Core Design
- **100% Local Execution**: Runs locally on `http://localhost:4000`. No cloud calls, no telemetry, no analytics.
- **Strict Allowlist for Safe Junk**:
  - Windows Temp (`%TEMP%` and `C:\Windows\Temp`) only deletes files older than 24 hours.
  - Browser Caches (Chrome, Edge) purges web assets only; passwords, logins, history, and bookmarks are NEVER touched.
  - Windows Thumbnail Cache and Recycle Bin.
- **Personal Files Protection**: Downloads, Documents, Desktop, Pictures, and Videos are strictly **suggest-only** and NEVER automatically cleaned.
- **Hard-coded Protected List**: Core OS processes (`svchost`, `explorer`, `dwm`, `csrss`), drivers, antivirus software, and local AI servers (`ollama`) can never be terminated or disabled.
- **Safe Dry Run Mode**: Set `DRY_RUN=true` to simulate all operations and view metrics without touching files.
- **Two-Step Clean Action**: Actions require a short-lived `previewToken` generated from a verified scan report.

---

## 🛠️ API Specification

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | `GET` | Health status of Ollama connection, active model, and DRY_RUN mode |
| `/api/scan` | `GET` | Complete hardware and disk inspection (RAM, CPU, Disks, Startups, Caches) |
| `/api/plan` | `POST` | AI-generated optimization plan strictly referencing verified item IDs |
| `/api/clean/preview` | `POST` | Generates short-lived token and preview of bytes to clean |
| `/api/clean/apply` | `POST` | Safely executes cleaning using the single-use preview token |
| `/api/startup/disable`| `POST` | Disables a user-level startup app with automatic registry backup |
| `/api/startup/undo` | `POST` | Restores a previously disabled startup entry from backup |
| `/api/apps/close` | `POST` | Closes non-protected background memory hogs |
| `/api/history` | `GET` | Retrieves past cleaning logs |
| `/api/reveal` | `POST` | Opens file location in Windows Explorer (scanned paths only) |
| `/api/ask` | `POST` | SSE streaming answers to safety questions ("Is it safe to switch this off?") |

---

## 🚀 Quickstart

### Prerequisites
1. **Node.js** (v18+)
2. **Ollama** running locally:
   ```bash
   ollama pull gemma3:4b
   # or gemma2:2b
   ```

### Setup & Run
```bash
# 1. Install dependencies
npm install

# 2. Configure environment (optional)
cp .env.example .env

# 3. Start development server
npm run dev
```

The backend will listen on `http://localhost:4000`.

---

## 📜 License
MIT License. Part of the Featherlight open-source project.
