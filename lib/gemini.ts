import {
  GoogleGenAI,
  type GenerateContentParameters,
  type GenerateContentResponse,
} from '@google/genai';

let cachedClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Check Settings > Secrets in AI Studio.'
    );
  }
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
        timeout: 18_000,
      },
    });
  }
  return cachedClient;
}

function isRetryableTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return (
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('timeout') ||
    msg.includes('Timeout') ||
    msg.includes('aborted') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ETIMEDOUT')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateContentWithRetry(
  params: Omit<GenerateContentParameters, 'model'> & { model?: string }
): Promise<GenerateContentResponse> {
  const ai = getGeminiClient();
  const primaryModel = params.model || 'gemini-4-hydrogen';
  const fallbackModel = 'gemini-3.1-flash-lite';

  let lastError: unknown;
  const attempts: { model: string; delayMs: number }[] = [
    { model: primaryModel, delayMs: 0 },
    { model: fallbackModel, delayMs: 400 },
    { model: primaryModel, delayMs: 900 },
  ];

  for (const attempt of attempts) {
    if (attempt.delayMs > 0) {
      await sleep(attempt.delayMs);
    }
    try {
      return await ai.models.generateContent({
        ...params,
        model: attempt.model,
      });
    } catch (err) {
      lastError = err;
      if (!isRetryableTransientError(err)) {
        throw err;
      }
    }
  }

  throw lastError;
}

export function formatGeminiError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  if (!raw) return fallback;

  let extracted = raw;
  try {
    const parsed = JSON.parse(raw) as {
      error?: { code?: number; status?: string; message?: string };
      message?: string;
    };
    if (parsed?.error?.status === 'RESOURCE_EXHAUSTED' || parsed?.error?.code === 429) {
      return 'Gemini API rate limit or quota reached. Wait a moment and retry, or check your API key quota in Settings > Secrets.';
    }
    if (
      parsed?.error?.status === 'PERMISSION_DENIED' ||
      parsed?.error?.code === 403 ||
      parsed?.error?.status === 'API_KEY_INVALID'
    ) {
      return 'Gemini API key was rejected. Please verify your API key in Settings > Secrets.';
    }
    if (parsed?.error?.message) {
      extracted = parsed.error.message;
    } else if (parsed?.message) {
      extracted = parsed.message;
    }
  } catch {
    if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('"code":429')) {
      return 'Gemini API rate limit or quota reached. Wait a moment and retry, or check your API key quota in Settings > Secrets.';
    }
    if (raw.includes('PERMISSION_DENIED') || raw.includes('API_KEY_INVALID')) {
      return 'Gemini API key was rejected. Please verify your API key in Settings > Secrets.';
    }
  }

  return extracted.length > 220 ? `${extracted.slice(0, 217)}...` : extracted;
}

export function extractJsonFromText<T>(rawText: string): T {
  const trimmed = rawText.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed;

  try {
    return JSON.parse(candidate) as T;
  } catch {
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(candidate.slice(firstBrace, lastBrace + 1)) as T;
    }
    const firstBracket = candidate.indexOf('[');
    const lastBracket = candidate.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      return JSON.parse(candidate.slice(firstBracket, lastBracket + 1)) as T;
    }
    throw new Error('Could not parse structured JSON from model response.');
  }
}
