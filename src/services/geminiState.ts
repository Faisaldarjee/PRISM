import { GoogleGenAI } from "@google/genai";

const cleanEnvVar = (value: any): string => {
  if (typeof value !== 'string') return '';
  let trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    trimmed = trimmed.substring(1, trimmed.length - 1);
  }
  if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
    trimmed = trimmed.substring(1);
  }
  if (trimmed.endsWith('"') || trimmed.endsWith("'")) {
    trimmed = trimmed.substring(0, trimmed.length - 1);
  }
  return trimmed.trim();
};

const apiKey = cleanEnvVar(process.env.GEMINI_API_KEY);
export const ai = apiKey
  ? new GoogleGenAI({ 
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    })
  : null;

let isRateLimited = false;
let rateLimitResetTime = 0;

export function isGeminiSuspended(): boolean {
  const now = Date.now();
  if (isRateLimited && now < rateLimitResetTime) {
    return true;
  }
  if (isRateLimited && now >= rateLimitResetTime) {
    isRateLimited = false;
    rateLimitResetTime = 0;
  }
  return false;
}

export function handleGeminiError(err: any, context?: string) {
  let errMsg = "";
  try {
    errMsg = (err?.message || String(err)).toLowerCase();
    if (err?.status) {
      errMsg += " " + String(err.status).toLowerCase();
    }
    if (err?.error && typeof err.error === 'object') {
      errMsg += " " + JSON.stringify(err.error).toLowerCase();
    }
  } catch (e) {
    errMsg = String(err).toLowerCase();
  }

  const isRateLimit = 
    errMsg.includes("429") ||
    errMsg.includes("quota") ||
    errMsg.includes("rate exceeded") ||
    errMsg.includes("rate limit") ||
    errMsg.includes("resource_exhausted") ||
    errMsg.includes("resource has been exhausted") ||
    errMsg.includes("exhausted") ||
    errMsg.includes("billing");

  if (isRateLimit) {
    console.warn(`[Gemini State] ${context ? `[${context}] ` : ''}Rate limit or Free Tier Quota exceeded. Suspending Gemini features globally for 3 minutes to prevent API blockages.`);
    isRateLimited = true;
    rateLimitResetTime = Date.now() + 180 * 1000; // 3 minutes cooling period
  }
}
