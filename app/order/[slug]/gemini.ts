import "server-only";

// Verify against Google's current model list before shipping — model ids change.
// gemini-2.5-flash was retired for new API keys as of 2026-08; confirmed live via
// GET /v1beta/models on 2026-08-20 that 3.5/3.6/3.7-flash all respond.
// The free tier's daily cap is per model, so switching model id also resets the
// day's budget — useful while demoing.
const MODEL = "gemini-3.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export type GeminiResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

// Google's free tier returns a bare 503 "overloaded" often enough that a single
// attempt visibly fails for the guest — observed 2 in 5 on an idle key.
// 429 is deliberately NOT retried: the free tier's cap is per DAY (20 requests
// per model), so retrying a quota rejection just burns the remaining budget.
const RETRYABLE = new Set([500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;

/** Exponential backoff, clamped so it never overruns the caller's deadline. */
function backoff(attempt: number, deadline: number) {
  const wait = Math.min(300 * 2 ** (attempt - 1), Math.max(0, deadline - Date.now()));
  return new Promise((resolve) => setTimeout(resolve, wait));
}

/**
 * Calls Gemini in JSON mode and parses the result.
 *
 * Never throws — every failure path (missing key, HTTP error, timeout, unparseable
 * body) comes back as { error }. Callers are expected to degrade gracefully rather
 * than surface any of this to a guest.
 */
export async function generateJson<T>(params: {
  systemInstruction: string;
  userText: string;
  responseSchema: object;
  /** Overall budget across all attempts, not per attempt. */
  timeoutMs?: number;
}): Promise<GeminiResult<T>> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { error: "NOT_CONFIGURED" };

  const deadline = Date.now() + (params.timeoutMs ?? 15_000);
  const payload = JSON.stringify({
    systemInstruction: { parts: [{ text: params.systemInstruction }] },
    contents: [{ role: "user", parts: [{ text: params.userText }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: params.responseSchema,
      temperature: 0.3,
      // Headroom: current Flash models spend part of this budget on internal
      // reasoning, and a truncated response comes back as unparseable JSON.
      maxOutputTokens: 2048,
    },
  });

  let lastError = "NETWORK";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return { error: "TIMEOUT" };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remaining);

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: payload,
      });

      if (!res.ok) {
        lastError = `HTTP_${res.status}`;
        if (RETRYABLE.has(res.status) && attempt < MAX_ATTEMPTS) {
          await backoff(attempt, deadline);
          continue;
        }
        return { error: lastError };
      }

      const body = await res.json();
      const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof text !== "string") {
        lastError = "EMPTY_RESPONSE";
        if (attempt < MAX_ATTEMPTS) {
          await backoff(attempt, deadline);
          continue;
        }
        return { error: lastError };
      }

      // Parsed in its own try so a malformed body is not misreported as a network fault.
      try {
        return { data: JSON.parse(text) as T };
      } catch {
        return { error: "UNPARSEABLE" };
      }
    } catch (err) {
      // A timeout is the caller's budget running out — retrying cannot help.
      if (err instanceof Error && err.name === "AbortError") return { error: "TIMEOUT" };
      lastError = "NETWORK";
      if (attempt < MAX_ATTEMPTS) {
        await backoff(attempt, deadline);
        continue;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  return { error: lastError };
}
