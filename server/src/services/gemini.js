// Gọi Google Gemini (giai đoạn 6) bằng SDK chính thức @google/genai. API key chỉ đọc từ biến môi trường
// của máy chủ: GEMINI_API_KEY_<FEATURE> (VD GEMINI_API_KEY_INSIGHT), không có thì GEMINI_API_KEY chung.
const { DEFAULT_GEMINI_MODEL, DEFAULT_GEMINI_FALLBACK_MODEL, GEMINI_TIMEOUT_MS } = require('../config/insights');

// Kiểm thử: thay client thật bằng client giả (không bao giờ gọi Gemini thật khi chạy test)
let fakeClient = null;
const setGeminiClient = (client) => {
  fakeClient = client;
};

// Key riêng của chức năng, rồi key của chức năng gần nhất (AI Assistant dùng chung key với AI Fan Insight), rồi key chung
const KEY_CHAIN = { assistant: ['ASSISTANT', 'INSIGHT'] };
const keyFor = (feature) => {
  const names = KEY_CHAIN[feature] || [String(feature).toUpperCase()];
  for (const n of names) if (process.env[`GEMINI_API_KEY_${n}`]) return process.env[`GEMINI_API_KEY_${n}`];
  return process.env.GEMINI_API_KEY || '';
};
// Model chính, rồi model dự phòng (bỏ trùng; GEMINI_FALLBACK_MODEL="" để tắt dự phòng)
const modelNames = () => {
  const primary = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const fallback = process.env.GEMINI_FALLBACK_MODEL !== undefined ? process.env.GEMINI_FALLBACK_MODEL : DEFAULT_GEMINI_FALLBACK_MODEL;
  return [...new Set([primary, fallback].filter(Boolean))];
};
const isTestRun = () => !!process.env.JEST_WORKER_ID;

// Có dùng được AI cho chức năng này không (có client giả, hoặc có key và không phải đang chạy test)
const geminiAvailable = (feature) => !!fakeClient || (!isTestRun() && !!keyFor(feature));

const clients = new Map();
const clientFor = (feature) => {
  if (fakeClient) return fakeClient;
  if (isTestRun()) return null;
  const key = keyFor(feature);
  if (!key) return null;
  if (!clients.has(key)) {
    const { GoogleGenAI } = require('@google/genai');
    clients.set(key, new GoogleGenAI({ apiKey: key }));
  }
  return clients.get(key);
};

class GeminiError extends Error {
  constructor(reason, message) {
    super(message);
    this.reason = reason; // no_key | quota | blocked | ai_error | invalid_output
  }
}

// Model bị quá tải / lỗi gần đây (để hiện nhãn "Busy now" ở bảng chọn model – giai đoạn 6b)
const busyAt = new Map();
const isBusyReason = (reason) => reason === 'ai_error' || reason === 'quota';
const busyModels = (windowMs, now = Date.now()) => modelNames().filter((m) => busyAt.has(m) && now - busyAt.get(m) <= windowMs);
const resetBusy = () => busyAt.clear();

// Gọi Gemini, yêu cầu trả JSON theo schema. Mặc định thử model chính, lỗi thì thử model dự phòng;
// truyền models để chỉ dùng các model đó (VD người dùng chọn cố định một model).
// Trả về { json, model, fallback, inputTokens, outputTokens } (fallback = không phải model đầu tiên trả lời).
const generateJson = async ({ feature, system, prompt, schema, models, temperature }) => {
  const client = clientFor(feature);
  if (!client) throw new GeminiError('no_key', 'Gemini API key is not configured');
  const list = models && models.length ? models : modelNames();
  let lastError = null;
  for (const model of list) {
    try {
      const out = await generateWithModel(client, model, { system, prompt, schema, temperature });
      busyAt.delete(model);
      return { ...out, fallback: model !== list[0] };
    } catch (err) {
      if (!(err instanceof GeminiError)) throw err;
      lastError = err;
      lastError.model = model;
      if (isBusyReason(err.reason)) busyAt.set(model, Date.now());
      console.error(`Gemini ${model} không dùng được (${err.reason}): ${err.message}`);
    }
  }
  throw lastError;
};

const generateWithModel = async (client, model, { system, prompt, schema, temperature = 0.4 }) => {
  let res;
  try {
    res = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: system,
        responseMimeType: 'application/json',
        responseJsonSchema: schema,
        temperature,
        maxOutputTokens: 4096,
        abortSignal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      },
    });
  } catch (err) {
    const status = err?.status;
    throw new GeminiError(status === 429 ? 'quota' : 'ai_error', `Gemini request failed${status ? ` (${status})` : ''}: ${err?.message || err}`);
  }
  if (res?.promptFeedback?.blockReason) throw new GeminiError('blocked', `Blocked: ${res.promptFeedback.blockReason}`);
  const text = res?.text;
  if (!text) throw new GeminiError('blocked', 'Empty response');
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new GeminiError('invalid_output', 'Response is not valid JSON');
  }
  const usage = res.usageMetadata || {};
  return { json, model, inputTokens: usage.promptTokenCount || 0, outputTokens: usage.candidatesTokenCount || 0 };
};

module.exports = { generateJson, geminiAvailable, setGeminiClient, GeminiError, modelNames, busyModels, resetBusy, isBusyReason };
