/**
 * AI auto-fill (free): sends the front (and back) photo of a piece to Google
 * Gemini on its free tier and gets back category, type, color, pattern,
 * dressiness, warmth, logo/graphic and which style vibes it suits.
 *
 * Uses the user's own free Gemini API key (aistudio.google.com/apikey),
 * stored only on their phone. If one model's free daily quota runs out, the
 * next model in the list is tried, since each model has its own quota.
 */
import { COLORS, DETAILS, FITS, MATERIALS, PATTERNS, TYPES } from './catalog';
import { AESTHETICS } from './aesthetics';

export const AI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-3.6-flash'];
const endpoint = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const typeList = Object.entries(TYPES)
  .map(([k, t]) => `${k} (${t.label}; ${t.cat})`)
  .join(', ');
const colorList = COLORS.map((c) => `${c.key} (${c.label})`).join(', ');
const patternList = PATTERNS.map((p) => `${p.key} (${p.label})`).join(', ');
const materialList = MATERIALS.map((m) => `${m.key} (${m.label})`).join(', ');
const fitList = FITS.map((f) => `${f.key} (${f.label})`).join(', ');
const detailList = DETAILS.map((d) => `${d.key} (${d.label})`).join(', ');
const vibeList = AESTHETICS.map((a) => `${a.key} (${a.label})`).join(', ');

export function buildPrompt(hasBack) {
  return `You are cataloguing one clothing item for a wardrobe app. ${
    hasBack ? 'The first photo is the FRONT, the second is the BACK.' : 'The photo shows the item.'
  }
Describe the single main garment (ignore the background, hangers, and anything else in frame).

Reply with ONLY a JSON object, no other text, using exactly these keys:
{
  "name": short natural name, e.g. "Navy cable-knit sweater" (max 5 words),
  "type": one of: ${typeList},
  "color": the main color, one of: ${colorList},
  "pattern": one of: ${patternList} ("print" for any bold print or large graphic),
  "material": main fabric, one of: ${materialList}, or null if unsure,
  "fit": one of: ${fitList}, or null if you can't tell from the photo,
  "details": array (possibly empty) from: ${detailList},
  "graphic": true if there is a visible logo, text or graphic anywhere (front or back), else false,
  "formality": 1-5 (1 lounge/gym, 2 casual, 3 smart casual, 4 business, 5 formal),
  "warmth": 0-3 (0 hot-weather, 1 light, 2 warm layer, 3 heavy winter),
  "styles": array of the style vibes this piece suits (0-3), from: ${vibeList},
  "note": anything worth knowing in under 12 words (e.g. "large graphic on back"), or ""
}`;
}

const stripDataUri = (uri) => {
  const m = /^data:(image\/[a-z+]+);base64,(.*)$/i.exec(uri || '');
  if (!m) return null;
  const mime = m[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : m[1].toLowerCase();
  return { mime_type: mime, data: m[2] };
};

// Validates the model's answer against the app's catalog; anything unknown is dropped.
export function parseTags(text) {
  const match = String(text).match(/\{[\s\S]*\}/);
  if (!match) throw new Error('The AI reply could not be read.');
  const raw = JSON.parse(match[0]);
  const out = {};
  if (typeof raw.name === 'string' && raw.name.trim()) out.name = raw.name.trim().slice(0, 40);
  if (TYPES[raw.type]) {
    out.type = raw.type;
    out.cat = TYPES[raw.type].cat;
  }
  if (COLORS.some((c) => c.key === raw.color)) out.color = raw.color;
  if (PATTERNS.some((p) => p.key === raw.pattern)) out.pattern = raw.pattern;
  if (typeof raw.graphic === 'boolean') out.graphic = raw.graphic;
  if (MATERIALS.some((m) => m.key === raw.material)) out.material = raw.material;
  if (FITS.some((f) => f.key === raw.fit)) out.fit = raw.fit;
  if (Array.isArray(raw.details)) out.details = raw.details.filter((d) => DETAILS.some((x) => x.key === d));
  const f = Math.round(Number(raw.formality));
  if (f >= 1 && f <= 5) out.formality = f;
  const w = Math.round(Number(raw.warmth));
  if (raw.warmth !== undefined && raw.warmth !== null && w >= 0 && w <= 3) out.warmth = w;
  if (Array.isArray(raw.styles)) {
    out.styles = raw.styles.filter((s) => AESTHETICS.some((a) => a.key === s)).slice(0, 3);
  }
  if (typeof raw.note === 'string') out.note = raw.note.slice(0, 80);
  return out;
}

async function callModel(model, apiKey, body) {
  let res;
  try {
    res = await fetch(endpoint(model), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
    });
  } catch {
    throw Object.assign(new Error('Couldn’t reach Google’s AI. Check your internet connection.'), { fatal: true });
  }
  const json = await res.json().catch(() => ({}));
  if (res.ok) {
    const parts = json?.candidates?.[0]?.content?.parts || [];
    const text = parts.map((p) => p.text || '').join('');
    if (!text) throw Object.assign(new Error('The AI returned no answer for this photo.'), { fatal: true });
    return text;
  }
  const msg = json?.error?.message || `Error ${res.status}`;
  const status = json?.error?.status || '';
  if (/API key not valid|API_KEY_INVALID/i.test(msg) || res.status === 401) {
    throw Object.assign(new Error('Your Gemini API key wasn’t accepted. Check it in Profile → AI auto-fill.'), { fatal: true });
  }
  // Quota used up or this model isn't available on this key: try the next model.
  if (res.status === 429 || status === 'RESOURCE_EXHAUSTED' || res.status === 404 || status === 'NOT_FOUND') {
    throw Object.assign(new Error(msg), { retryNext: true, quota: res.status === 429 || status === 'RESOURCE_EXHAUSTED' });
  }
  throw Object.assign(new Error(msg), { fatal: true });
}

export async function autoTag({ apiKey, front, back }) {
  if (!apiKey) throw new Error('Add your free Gemini API key in Profile → AI auto-fill first.');
  const images = [front, back].filter(Boolean).map(stripDataUri).filter(Boolean);
  if (!images.length) throw new Error('Add a photo first.');
  const body = {
    contents: [
      {
        role: 'user',
        parts: [...images.map((img) => ({ inline_data: img })), { text: buildPrompt(images.length > 1) }],
      },
    ],
    generationConfig: { response_mime_type: 'application/json', temperature: 0.2 },
  };
  let quotaHit = false;
  let lastError = null;
  for (const model of AI_MODELS) {
    try {
      const text = await callModel(model, apiKey.trim(), body);
      return parseTags(text);
    } catch (e) {
      if (!e.retryNext) throw e;
      if (e.quota) quotaHit = true;
      lastError = e;
    }
  }
  if (quotaHit) throw new Error('You’ve used today’s free AI allowance. It resets overnight — fill this one in by hand for now.');
  throw lastError || new Error('AI auto-fill isn’t available right now.');
}
