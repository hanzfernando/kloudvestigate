interface GeminiGenerateResponse {
  candidates?: Array<{
    finishReason?: string;
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

export interface GeminiGenerateResult {
  answer: string;
  finishReason?: string;
  warning?: string;
}

export async function generateGeminiAnswer(prompt: string): Promise<GeminiGenerateResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const maxOutputTokens = parseMaxOutputTokens(process.env.GEMINI_MAX_OUTPUT_TOKENS);

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          maxOutputTokens,
        },
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorBody}`);
  }

  const payload = (await response.json()) as GeminiGenerateResponse;
  const candidate = payload.candidates?.[0];
  const text = candidate?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return {
    answer: text,
    finishReason: candidate?.finishReason,
    warning: getFinishWarning(candidate?.finishReason, maxOutputTokens),
  };
}

function parseMaxOutputTokens(value?: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2400;
}

function getFinishWarning(finishReason: string | undefined, maxOutputTokens: number) {
  if (finishReason === "MAX_TOKENS") {
    return `Gemini stopped because it reached the ${maxOutputTokens} token output limit.`;
  }

  if (finishReason && finishReason !== "STOP") {
    return `Gemini stopped with finish reason: ${finishReason}.`;
  }

  return undefined;
}
