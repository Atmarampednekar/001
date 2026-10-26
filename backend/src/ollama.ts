import { config } from "./config.js";

export interface OllamaHealth {
  ok: boolean;
  model: string;
  configuredModel: string;
  ollamaReachable: boolean;
  availableModels: string[];
  message: string;
}

let activeResolvedModel: string | null = null;

export async function checkOllamaHealth(): Promise<OllamaHealth> {
  try {
    const res = await fetch(`${config.ollamaBaseUrl}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      return {
        ok: false,
        model: config.ollamaModel,
        configuredModel: config.ollamaModel,
        ollamaReachable: false,
        availableModels: [],
        message: `Ollama returned HTTP ${res.status}`,
      };
    }

    const data = (await res.json()) as { models?: Array<{ name: string; model: string }> };
    const available = (data.models || []).map((m) => m.name || m.model);

    // Check if configured model exists
    const match = available.find(
      (m) =>
        m.toLowerCase() === config.ollamaModel.toLowerCase() ||
        m.toLowerCase().startsWith(config.ollamaModel.toLowerCase().split(":")[0])
    );

    if (match) {
      activeResolvedModel = match;
    } else if (available.length > 0) {
      // Pick first gemma model or first available model
      const gemmaMatch = available.find((m) => m.toLowerCase().includes("gemma"));
      activeResolvedModel = gemmaMatch || available[0];
    } else {
      activeResolvedModel = config.ollamaModel;
    }

    return {
      ok: available.length > 0,
      model: activeResolvedModel,
      configuredModel: config.ollamaModel,
      ollamaReachable: true,
      availableModels: available,
      message:
        available.length > 0
          ? `Connected to Ollama (Active model: ${activeResolvedModel})`
          : `Ollama is running, but no models found. Run 'ollama pull ${config.ollamaModel}'`,
    };
  } catch (err: any) {
    return {
      ok: false,
      model: config.ollamaModel,
      configuredModel: config.ollamaModel,
      ollamaReachable: false,
      availableModels: [],
      message: `Cannot reach Ollama at ${config.ollamaBaseUrl}`,
    };
  }
}

export async function getActiveModelName(): Promise<string> {
  if (activeResolvedModel) return activeResolvedModel;
  const health = await checkOllamaHealth();
  return health.model;
}

export async function generateCompletion(options: {
  prompt: string;
  system?: string;
  temperature?: number;
  format?: "json";
}): Promise<string> {
  const model = await getActiveModelName();

  const response = await fetch(`${config.ollamaBaseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt: options.prompt,
      system: options.system,
      stream: false,
      format: options.format,
      options: {
        temperature: options.temperature ?? 0.2,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Ollama generation failed (HTTP ${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { response?: string };
  return data.response || "";
}

export async function* streamCompletion(options: {
  prompt: string;
  system?: string;
  temperature?: number;
}): AsyncGenerator<string, void, unknown> {
  const model = await getActiveModelName();

  const response = await fetch(`${config.ollamaBaseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt: options.prompt,
      system: options.system,
      stream: true,
      options: {
        temperature: options.temperature ?? 0.2,
      },
    }),
  });

  if (!response.ok || !response.body) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Ollama stream request failed (HTTP ${response.status}): ${errorText}`);
  }

  const reader = response.body.getReader();
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
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed) as { response?: string; done?: boolean };
        if (parsed.response) {
          yield parsed.response;
        }
        if (parsed.done) {
          return;
        }
      } catch {
        // partial chunk
      }
    }
  }

  if (buffer.trim()) {
    try {
      const parsed = JSON.parse(buffer.trim()) as { response?: string };
      if (parsed.response) {
        yield parsed.response;
      }
    } catch {
      // ignore
    }
  }
}

export function extractJSON<T>(rawText: string): T {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  return JSON.parse(cleaned) as T;
}
