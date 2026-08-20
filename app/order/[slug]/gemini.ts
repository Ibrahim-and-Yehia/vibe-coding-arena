import "server-only";

// Verify against Google's current model list before shipping — model ids change.
// gemini-2.5-flash was retired for new API keys as of 2026-08; confirmed live via
// GET /v1beta/models on 2026-08-20 that 3.5/3.6/3.7-flash all respond, 3.7 is newest.
const MODEL = "gemini-3.7-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export type GeminiResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

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
  timeoutMs?: number;
}): Promise<GeminiResult<T>> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { error: "NOT_CONFIGURED" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), params.timeoutMs ?? 10_000);

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: params.systemInstruction }] },
        contents: [{ role: "user", parts: [{ text: params.userText }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: params.responseSchema,
          temperature: 0.3,
          maxOutputTokens: 512,
        },
      }),
    });

    if (!res.ok) return { error: `HTTP_${res.status}` };

    const body = await res.json();
    const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") return { error: "EMPTY_RESPONSE" };

    return { data: JSON.parse(text) as T };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return { error: aborted ? "TIMEOUT" : "NETWORK" };
  } finally {
    clearTimeout(timer);
  }
}
