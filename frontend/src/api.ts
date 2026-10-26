import {
  HealthStatus,
  ScanReport,
  AIPlanResponse,
  CleanPreviewResult,
  CleanApplyResult,
  CleanHistoryEntry,
} from "./types.js";

const BASE_URL = "";

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch(`${BASE_URL}/api/health`);
  if (!res.ok) {
    throw new Error(`Health check failed (HTTP ${res.status})`);
  }
  return res.json();
}

export async function fetchScan(): Promise<ScanReport> {
  const res = await fetch(`${BASE_URL}/api/scan`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Scan failed (HTTP ${res.status})`);
  }
  return res.json();
}

export async function fetchPlan(report?: ScanReport): Promise<AIPlanResponse> {
  const res = await fetch(`${BASE_URL}/api/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ report }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Plan generation failed (HTTP ${res.status})`);
  }
  return res.json();
}

export async function previewClean(targetIds: string[]): Promise<CleanPreviewResult> {
  const res = await fetch(`${BASE_URL}/api/clean/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Preview failed (HTTP ${res.status})`);
  }
  return res.json();
}

export async function applyClean(previewToken: string): Promise<CleanApplyResult> {
  const res = await fetch(`${BASE_URL}/api/clean/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ previewToken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Clean failed (HTTP ${res.status})`);
  }
  return res.json();
}

export async function disableStartup(id: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/api/startup/disable`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Disable failed (HTTP ${res.status})`);
  }
  return res.json();
}

export async function undoStartup(id: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/api/startup/undo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Undo failed (HTTP ${res.status})`);
  }
  return res.json();
}

export async function closeApp(id: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/api/apps/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Close failed (HTTP ${res.status})`);
  }
  return res.json();
}

export async function fetchHistory(): Promise<CleanHistoryEntry[]> {
  const res = await fetch(`${BASE_URL}/api/history`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.history || [];
}

export async function revealPath(path: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/api/reveal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Could not open file location.`);
  }
  return res.json();
}

export async function askQuestionStream(
  question: string,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (err: any) => void
): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    if (!res.ok || !res.body) {
      throw new Error(`Chat request failed (HTTP ${res.status})`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data:")) {
          const jsonStr = trimmed.slice(5).trim();
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.token) {
              onToken(parsed.token);
            }
            if (parsed.done) {
              onDone();
              return;
            }
          } catch {
            // ignore partial
          }
        }
      }
    }

    onDone();
  } catch (err) {
    onError(err);
  }
}
