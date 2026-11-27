const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export type GlossaryPair = { source: string; burmese: string };

export async function translateChapter(
  input: { title: string; body: string; glossary: GlossaryPair[]; apiKey: string },
  fetchImpl: typeof fetch,
): Promise<{ ok: true; titleMy: string; bodyMy: string } | { ok: false; error: string }> {
  const apiKey = input.apiKey.trim();
  if (!apiKey) return { ok: false, error: "Set GEMINI_API_KEY in .env." };
  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt(input) }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) return { ok: false, error: "Could not translate that chapter." };
    const parsed = readTranslation(await response.json());
    if (!parsed) return { ok: false, error: "Could not translate that chapter." };
    return { ok: true, ...parsed };
  } catch {
    return { ok: false, error: "Could not translate that chapter." };
  }
}

function prompt(input: { title: string; body: string; glossary: GlossaryPair[] }): string {
  const terms = input.glossary.map((term) => `${term.source} = ${term.burmese}`).join("\n");
  return [
    "Translate this English chapter into Burmese.",
    "Return JSON only, with keys titleMy and bodyMy.",
    "Keep a blank line between paragraphs.",
    "Use each glossary source term as its Burmese form.",
    terms,
    `Title: ${input.title}`,
    input.body,
  ].join("\n");
}

function readTranslation(payload: unknown): { titleMy: string; bodyMy: string } | null {
  if (!payload || typeof payload !== "object") return null;
  const parts = (payload as { candidates?: { content?: { parts?: { text?: unknown }[] } }[] }).candidates?.[0]?.content
    ?.parts;
  const text = parts?.[0]?.text;
  if (typeof text !== "string") return null;
  const stripped = text.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  let value: unknown;
  try {
    value = JSON.parse(stripped);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const record = value as { titleMy?: unknown; bodyMy?: unknown };
  if (typeof record.titleMy !== "string" || typeof record.bodyMy !== "string") return null;
  const bodyMy = record.bodyMy.trim();
  if (!bodyMy) return null;
  return { titleMy: record.titleMy.trim(), bodyMy };
}
