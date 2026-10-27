/**
 * Closet Copilot style engine.
 *
 * Builds outfits from the user's own clothes and scores each one with
 * rules stylists use: formality matching, color theory (neutrals, accents,
 * classic and awkward pairings, contrast, tonal looks), pattern mixing,
 * dressing for the weather, variety, and what this user has liked or
 * passed on before.
 */
import { COLOR_BY_KEY, MATERIALS, OCCASION_BY_KEY, PATTERN_LEVEL, TYPES } from './catalog';
import { AESTHETIC_BY_KEY } from './aesthetics';
import { accentHarmony, awkwardPairing, classicPairing, hslOf, hueDistance, isAccent, isNeutral } from './color';

const DAY = 24 * 60 * 60 * 1000;
const BOLDNESS_LIMIT = { minimal: 1, some: 2, lots: 3 };

export const typeOf = (item) => TYPES[item.type] || { cat: item.cat, formality: 2, warmth: 1 };
export const formalityOf = (item) => item.formality ?? typeOf(item).formality;
export const warmthOf = (item) => item.warmth ?? typeOf(item).warmth;

// The occasion, nudged by the chosen vibe (e.g. old money dresses up a notch).
function occasionFor(ctx) {
  const occ = OCCASION_BY_KEY[ctx.occasion] || OCCASION_BY_KEY.casual;
  const vibe = AESTHETIC_BY_KEY[ctx.aesthetic];
  if (!vibe || occ.athletic) return occ;
  return { ...occ, target: Math.max(1, Math.min(5, occ.target + vibe.formalityShift)) };
}

// How well one piece fits the chosen vibe, with the most telling reason.
const has = (list, v) => !!v && (list || []).includes(v);
const MATERIAL_LABEL = Object.fromEntries(MATERIALS.map((m) => [m.key, m.label]));

/**
 * How well one piece fits the chosen vibe, with the most telling reason.
 * Rules listed by the vibe's source (like) count more than conventions
 * added on top (also).
 */
export function vibeFit(item, vibe) {
  if (!vibe) return { score: 0 };
  let score = 0;
  let good = null;
  let bad = null;
  const name = vibe.label.toLowerCase();
  const label = TYPES[item.type]?.label || 'This piece';
  if (has(vibe.like, item.type)) score += 2.5;
  else if (has(vibe.also, item.type)) score += 1.5;
  if (has(vibe.dislike, item.type)) {
    score -= 6;
    bad = `${label} reads off-vibe for ${name}`;
  }
  if (has(vibe.palette, item.color)) score += 1.2;
  if (has(vibe.avoidColors, item.color)) {
    score -= 2.5;
    bad = bad || `${COLOR_BY_KEY[item.color]?.label || 'That color'} isn't typical of ${name}`;
  }
  const pat = item.pattern || 'solid';
  if (has(vibe.patterns, pat)) score += pat === 'solid' ? 0.5 : 1.2;
  if (has(vibe.avoidPatterns, pat)) {
    score -= 2.5;
    bad = bad || `That pattern works against ${name}`;
  }
  if (item.material) {
    if (has(vibe.materials, item.material)) {
      score += 1.5;
      good = good || `${MATERIAL_LABEL[item.material]} is a ${name} fabric`;
    }
    if (has(vibe.avoidMaterials, item.material)) {
      score -= 2.5;
      bad = bad || `${MATERIAL_LABEL[item.material]} isn't a ${name} fabric`;
    }
  }
  if (item.fit) {
    if (has(vibe.fits, item.fit)) score += 0.8;
    if (has(vibe.avoidFits, item.fit)) {
      score -= 2;
      bad = bad || `An ${item.fit} fit reads off for ${name}`;
    }
  }
  for (const d of item.details || []) {
    if (has(vibe.details, d)) score += 0.8;
    if (has(vibe.avoidDetails, d)) {
      score -= 2.5;
      bad = bad || `That finish (${d.replace('_', ' ')}) works against ${name}`;
    }
  }
  if (item.graphic) {
    if (vibe.graphics === 'avoid') {
      score -= 6;
      bad = vibe.key === 'old_money' ? 'Visible logos or graphics break the quiet-luxury look' : `Graphics work against ${name}`;
    } else if (vibe.graphics === 'boost') {
      score += 2;
      good = 'A graphic piece gives it street credibility';
    }
  }
  if ((item.styles || []).includes(vibe.key)) score += 3;
  return { score, good, bad };
}

export function weatherBand(tempF) {
  if (tempF == null) return 'unknown';
  if (tempF < 45) return 'cold';
  if (tempF < 58) return 'cool';
  if (tempF < 72) return 'mild';
  if (tempF < 82) return 'warm';
  return 'hot';
}

const WARMTH_NEED = { cold: 4.5, cool: 2.5, mild: 1, warm: 0.5, hot: 0 };

function outerwearNeed(ctx, occ) {
  const band = weatherBand(ctx.tempF);
  if (occ.athletic) return band === 'cold' ? 'required' : band === 'cool' ? 'optional' : 'none';
  if (ctx.rain) return 'required';
  if (band === 'cold' || band === 'cool') return 'required';
  if (band === 'hot') return occ.key === 'business' ? 'optional' : 'none';
  if (band === 'warm') return occ.target >= 3.5 ? 'optional' : 'none';
  return 'optional';
}

// ---------- hard filters ----------

export function itemAllowed(item, ctx) {
  const occ = occasionFor(ctx);
  const vibe = AESTHETIC_BY_KEY[ctx.aesthetic];
  const t = typeOf(item);
  const f = formalityOf(item);
  if (t.cat === 'accessory') return false;
  if ((ctx.prefs?.avoidColors || []).includes(item.color)) return false;

  if (occ.athletic) {
    if (t.cat === 'outerwear') return f <= 2;
    return !!t.athletic;
  }
  if (t.athletic && !['casual', 'lounge'].includes(occ.key) && !(vibe?.allowAthletic && occ.target < 3)) return false;
  if (f < occ.min - 0.5 || f > occ.max + 0.5) return false;

  const band = weatherBand(ctx.tempF);
  const w = warmthOf(item);
  if (band === 'cold' || band === 'cool') {
    if (['shorts', 'athletic_shorts', 'sandals', 'tank'].includes(item.type)) return false;
  }
  if (band === 'hot') {
    if (t.cat === 'outerwear' && w >= 2) return false;
    if (t.cat === 'top' && w >= 2) return false;
  }
  return true;
}

// Rough single-item fit, used to trim large closets before combining.
function itemFit(item, ctx, occ) {
  let s = 0;
  s -= Math.abs(formalityOf(item) - occ.target) * 2;
  if (item.favorite) s += 1.5;
  if (item.lastWorn && ctx.now - item.lastWorn < 2 * DAY) s -= 3;
  if (ctx.rain && typeOf(item).rain) s += 2;
  s += vibeFit(item, AESTHETIC_BY_KEY[ctx.aesthetic]).score;
  return s;
}

// ---------- scoring ----------

export const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
export const outfitSignature = (items) => items.map((i) => i.id).sort().join('+');

export function scoreOutfit(items, ctx) {
  const occ = occasionFor(ctx);
  const vibe = AESTHETIC_BY_KEY[ctx.aesthetic];
  const by = (cat) => items.find((i) => typeOf(i).cat === cat);
  const top = by('top');
  const bottom = by('bottom');
  const one = by('onepiece');
  const outer = by('outerwear');
  const shoes = by('shoes');
  const upper = one || top;
  const lower = one || bottom;

  let score = 60;
  const reasons = [];
  const cautions = [];
  const plus = (w, text) => {
    score += w;
    if (text && !reasons.some((r) => r.text === text)) reasons.push({ w, text });
  };
  const minus = (w, text) => {
    score -= w;
    if (text && !cautions.some((r) => r.text === text)) cautions.push({ w, text });
  };

  // --- formality ---
  const clothes = items.filter(Boolean);
  const fs = clothes.map(formalityOf);
  const avg = fs.reduce((a, b) => a + b, 0) / fs.length;
  const diff = Math.abs(avg - occ.target);
  score -= diff * 8;
  if (diff <= 0.5) plus(4, `Right level of dressiness for ${occ.label.toLowerCase()}`);
  const blazerJeans = outer?.type === 'blazer' && bottom?.type === 'jeans';
  if (blazerJeans && ['smart_casual', 'date', 'office'].includes(occ.key)) {
    plus(6, 'A blazer with jeans is a smart-casual classic');
  } else {
    const spread = Math.max(...fs) - Math.min(...fs);
    if (spread >= 3) minus(12, 'Mixes very dressy and very casual pieces');
    else if (spread === 2) score -= 4;
    else plus(3, null);
  }
  if (shoes && Math.abs(formalityOf(shoes) - occ.target) > 1.5 && !(has(vibe?.like, shoes.type) || has(vibe?.also, shoes.type))) {
    minus(5, 'These shoes are off-level for the occasion');
  }

  // --- color ---
  const garmentColors = [upper, lower, outer].filter(Boolean).map((i) => i.color);
  const accentSet = new Set(garmentColors.filter((c) => isAccent(c) || c === 'multi'));
  if (shoes && isAccent(shoes.color)) accentSet.add(shoes.color);
  const accents = [...accentSet];
  const limit = BOLDNESS_LIMIT[ctx.prefs?.boldness || 'some'];

  if (accents.length === 0) plus(3, 'Neutral palette — easy, versatile and hard to get wrong');
  else if (accents.length === 1) plus(6, `One pop of ${COLOR_BY_KEY[accents[0]]?.label.toLowerCase() || 'color'} against neutrals`);
  else if (accents.length === 2 && !accents.includes('multi')) {
    const h = accentHarmony(accents[0], accents[1]);
    if (h.score >= 0) plus(h.score * 6, h.why);
    else minus(-h.score * 6, h.why);
  }
  if (accents.length > limit) minus(8 * (accents.length - limit), 'Too many colors competing');

  // classic / awkward pairings between the main pieces
  const pairs = [];
  if (top && bottom) pairs.push([top, bottom]);
  if (outer && upper) pairs.push([outer, upper]);
  if (outer && lower && !one) pairs.push([outer, lower]);
  let classics = 0;
  for (const [a, b] of pairs) {
    const why = classicPairing(a.color, b.color);
    if (why && classics < 2) {
      plus(5, why);
      classics++;
    }
    const bad = awkwardPairing(a.color, b.color);
    if (bad) minus(5, bad);
  }
  if (shoes && bottom) {
    const bad = awkwardPairing(shoes.color, bottom.color);
    if (bad && occ.target >= 3) minus(4, bad);
  }

  // top vs bottom: matching, tonal, contrast
  if (top && bottom) {
    const ht = hslOf(top.color);
    const hb = hslOf(bottom.color);
    if (top.color === bottom.color) {
      if (top.color === 'black') plus(3, 'All-black is a sleek classic');
      else if (isNeutral(top.color) && occ.target >= 4) plus(2, 'Matching neutrals read like a suit');
      else minus(4, 'Same color top and bottom can look like a uniform');
    } else {
      const ld = Math.abs(ht.l - hb.l);
      const tonal = isAccent(top.color) && isAccent(bottom.color) && hueDistance(top.color, bottom.color) < 20 && ld > 15;
      if (tonal) plus(4, 'Tonal look — same color family, different shades');
      else if (ld >= 25) plus(3, 'Good light–dark contrast between top and bottom');
      else if (ld < 8) minus(3, 'Top and bottom blend together — add contrast');
    }
  }

  // shoes
  if (shoes && lower) {
    const sl = hslOf(shoes.color).l;
    const bl = hslOf(lower.color).l;
    const whiteSneaker = ['sneakers', 'leather_sneakers'].includes(shoes.type) && ['white', 'cream'].includes(shoes.color);
    if (whiteSneaker && occ.target < 3.5) plus(3, 'Clean white sneakers keep it fresh');
    else if (occ.target >= 3 && sl > bl + 25) minus(3, 'Shoes lighter than your trousers look off in dressier outfits');
    if (['brown', 'camel'].includes(shoes.color) && ['navy', 'grey', 'khaki', 'light_grey', 'olive', 'dark_denim'].includes(lower.color)) {
      plus(3, 'Brown shoes ground this palette nicely');
    }
    if (shoes.color === 'black' && ['black', 'charcoal', 'grey'].includes(lower.color) && occ.target >= 3.5) {
      plus(3, 'Black shoes with dark trousers is the formal standard');
    }
  }

  // --- patterns ---
  const pats = clothes.map((i) => (i.graphic && (i.pattern || 'solid') === 'solid' ? 'print' : i.pattern || 'solid'));
  const lvl = (p) => PATTERN_LEVEL[p] || 'solid';
  const loud = pats.filter((p) => lvl(p) === 'loud').length;
  const midPats = pats.filter((p) => lvl(p) === 'mid');
  const mid = midPats.length;
  if (loud >= 2 || (loud >= 1 && mid >= 1)) minus(8, 'Bold patterns clash — pair a pattern with solids');
  else if (mid >= 2) {
    const kinds = new Set(midPats);
    if (kinds.size >= 2) minus(2, 'Two patterns together: keep their scales different');
    else minus(5, 'Two of the same pattern compete');
  } else if (loud + mid === 1) plus(2, 'One pattern, balanced by solids');
  if (pats.some((p) => lvl(p) === 'texture')) plus(1, null);

  // --- weather ---
  const band = weatherBand(ctx.tempF);
  if (band !== 'unknown') {
    const warmth = (upper ? warmthOf(upper) : 0) + (outer ? warmthOf(outer) : 0) + (bottom ? warmthOf(bottom) * 0.5 : 0);
    const need = WARMTH_NEED[band];
    if (warmth < need - 0.75) minus(6 * (need - warmth), `Might be too cold for ${ctx.tempF}°`);
    else if (warmth > need + 2.5) minus(4 * (warmth - need - 2.5), `Might be too warm for ${ctx.tempF}°`);
    else plus(4, `Dressed right for ${Math.round(ctx.tempF)}°`);
    if ((band === 'warm' || band === 'hot') && bottom && ['shorts'].includes(bottom.type) && occ.target < 2.5) plus(2, null);
    if (band === 'hot' && shoes && warmthOf(shoes) >= 2) minus(4, `Boots are heavy for ${Math.round(ctx.tempF)}°`);
  }
  if (!ctx.rain && outer && outer.type === 'rain_jacket') minus(6, null);
  if (!occ.athletic && occ.key !== 'lounge' && !vibe?.allowAthletic) {
    const gym = clothes.filter((i) => typeOf(i).athletic && typeOf(i).cat !== 'shoes' && !(has(vibe?.like, i.type) || has(vibe?.also, i.type))).length;
    if (gym) minus(7 * gym, 'Gym pieces read sporty — fine for errands, not for going out');
  }
  if (lower && typeOf(lower).athletic && shoes && formalityOf(shoes) >= 3) {
    minus(5, 'Sweats or leggings look off with dressier shoes');
  }
  if (ctx.rain) {
    if (outer && typeOf(outer).rain) plus(5, 'Rain-ready outer layer');
    else if (outer) minus(2, null);
    if (shoes && typeOf(shoes).rain) plus(3, 'Boots handle the wet');
    if (shoes && ['sneakers', 'leather_sneakers'].includes(shoes.type) && ['white', 'cream'].includes(shoes.color)) {
      minus(3, 'White sneakers and rain don’t mix');
    }
  }

  // --- variety & favorites ---
  let fav = 0;
  let stale = false;
  let fresh = false;
  for (const i of clothes) {
    if (i.favorite && fav < 2) {
      fav++;
      plus(2, fav === 1 ? 'Includes a favorite' : null);
    }
    if (i.lastWorn) {
      const ago = ctx.now - i.lastWorn;
      if (ago < 1.5 * DAY) {
        score -= 8;
        stale = true;
      } else if (ago < 4 * DAY) score -= 3;
    }
    if (!fresh && !i.wearCount && clothes.length > 2) {
      fresh = true;
      plus(1.5, 'Gives a rarely worn piece some love');
    }
  }
  if (stale) cautions.push({ w: 3, text: 'You wore part of this very recently' });

  // --- style vibe ---
  if (vibe) {
    let total = 0;
    let minFit = Infinity;
    let worst = null;
    let bestGood = null;
    for (const i of clothes) {
      const f = vibeFit(i, vibe);
      total += f.score;
      minFit = Math.min(minFit, f.score);
      if (f.bad && (!worst || f.score < worst.score)) worst = { score: f.score, text: f.bad };
      if (f.good && !bestGood) bestGood = f.good;
    }
    const avgFit = total / clothes.length;
    score += Math.max(-24, Math.min(14, total * 0.6));
    let sig = null;
    const cols = clothes.filter((i) => typeOf(i).cat !== 'shoes').map((i) => i.color);
    for (const [a, b, why] of vibe.signatures) {
      if (cols.includes(a) && cols.includes(b) && a !== b) {
        sig = why;
        break;
      }
    }
    // Vibe reasons are shown first, so give them display priority (w) but a modest score effect.
    if (sig) {
      score += 5;
      reasons.push({ w: 20, text: sig });
    }
    if (avgFit >= 3.5 && minFit >= 2) {
      score += 3;
      reasons.push({ w: 19, text: `Every piece fits the ${vibe.label.toLowerCase()} look` });
    }
    if (bestGood) plus(2, bestGood);
    if (worst && worst.score < -2) cautions.push({ w: -worst.score, text: worst.text });
  }

  // --- learned taste ---
  const fb = ctx.feedback || {};
  let aff = 0;
  let colorAff = 0;
  for (let a = 0; a < clothes.length; a++) {
    for (let b = a + 1; b < clothes.length; b++) {
      aff += fb.pairs?.[pairKey(clothes[a].id, clothes[b].id)] || 0;
      colorAff += fb.colorPairs?.[pairKey(clothes[a].color, clothes[b].color)] || 0;
    }
  }
  const learned = Math.max(-15, Math.min(15, aff * 3)) + Math.max(-6, Math.min(6, colorAff * 1));
  if (learned > 1) plus(learned, 'Similar to outfits you’ve liked');
  else if (learned < -1) minus(-learned, 'Similar to outfits you’ve passed on');

  return {
    raw: score,
    // Spread raw points into an intuitive 0–100 match score.
    score: Math.max(1, Math.min(99, Math.round(100 / (1 + Math.exp(-(score - 70) / 15))))),
    reasons: reasons.sort((a, b) => b.w - a.w).map((r) => r.text),
    cautions: cautions.sort((a, b) => b.w - a.w).map((r) => r.text),
  };
}

// ---------- generation ----------

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

/**
 * items: closet items. ctx: { occasion, tempF, rain, lockId, prefs, feedback, now, seed }.
 * Returns up to `count` varied outfits, best first.
 */
export function generateOutfits(items, ctx, count = 8) {
  const occ = occasionFor(ctx);
  ctx = { now: Date.now(), ...ctx };
  const locked = ctx.lockId ? items.find((i) => i.id === ctx.lockId) : null;
  const disliked = new Set(ctx.feedback?.dislikedOutfits || []);

  const pool = (cat, cap = 14) => {
    if (locked && typeOf(locked).cat === cat) return [locked];
    return items
      .filter((i) => typeOf(i).cat === cat && itemAllowed(i, ctx))
      .sort((a, b) => itemFit(b, ctx, occ) - itemFit(a, ctx, occ))
      .slice(0, cap);
  };

  const lockedCat = locked ? typeOf(locked).cat : null;
  let tops = pool('top');
  let bottoms = pool('bottom');
  let ones = pool('onepiece', 8);
  if (lockedCat === 'top' || lockedCat === 'bottom') ones = [];
  if (lockedCat === 'onepiece') {
    tops = [];
    bottoms = [];
  }
  let shoes = pool('shoes', 10);
  if (!shoes.length) shoes = [null];

  const need = lockedCat === 'outerwear' ? 'required' : outerwearNeed(ctx, occ);
  const outerPool = pool('outerwear', 8);
  let outers;
  if (need === 'none') outers = [null];
  else if (need === 'required') outers = outerPool.length ? outerPool : [null];
  else outers = [null, ...outerPool];

  const bases = [];
  for (const t of tops) for (const b of bottoms) bases.push([t, b]);
  for (const o of ones) bases.push([o]);

  const rand = rng(ctx.seed || 1);
  const jitter = ctx.seed ? 6 : 0;
  const scored = [];
  for (const base of bases) {
    for (const s of shoes) {
      for (const o of outers) {
        const outfit = [...base, o, s].filter(Boolean);
        const sig = outfitSignature(outfit);
        if (disliked.has(sig)) continue;
        const r = scoreOutfit(outfit, ctx);
        if (need === 'required' && !o && outerPool.length === 0 && weatherBand(ctx.tempF) !== 'unknown') {
          r.cautions.unshift('Add outerwear to your closet for cold or rainy days');
        }
        scored.push({ items: outfit, signature: sig, ...r, rank: r.raw + rand() * jitter });
      }
    }
  }
  scored.sort((a, b) => b.rank - a.rank);

  // Pick a varied set: avoid near-duplicates and overusing one piece.
  const chosen = [];
  const uses = {};
  const core = (o) => o.items.filter((i) => typeOf(i).cat !== 'shoes' && typeOf(i).cat !== 'outerwear').map((i) => i.id);
  for (const pass of [1, 2]) {
    for (const o of scored) {
      if (chosen.length >= count) break;
      if (chosen.includes(o)) continue;
      const ids = o.items.map((i) => i.id);
      const maxUse = pass === 1 ? 2 : 4;
      if (ids.some((id) => id !== ctx.lockId && (uses[id] || 0) >= maxUse)) continue;
      const c = core(o);
      const tooSimilar = chosen.some((p) => {
        const pc = core(p);
        return c.every((id) => pc.includes(id)) && pass === 1;
      });
      if (tooSimilar) continue;
      chosen.push(o);
      ids.forEach((id) => (uses[id] = (uses[id] || 0) + 1));
    }
  }
  return chosen.sort((a, b) => b.rank - a.rank).map(({ rank, raw, ...o }) => o);
}

// ---------- learning ----------

// delta: +1 liked/wore, -1 passed. Returns a new feedback object.
export function applyFeedback(feedback, outfitItems, delta) {
  const next = {
    pairs: { ...(feedback?.pairs || {}) },
    colorPairs: { ...(feedback?.colorPairs || {}) },
    dislikedOutfits: [...(feedback?.dislikedOutfits || [])],
  };
  for (let a = 0; a < outfitItems.length; a++) {
    for (let b = a + 1; b < outfitItems.length; b++) {
      const k = pairKey(outfitItems[a].id, outfitItems[b].id);
      next.pairs[k] = Math.max(-5, Math.min(5, (next.pairs[k] || 0) + delta));
      const ck = pairKey(outfitItems[a].color, outfitItems[b].color);
      next.colorPairs[ck] = Math.max(-6, Math.min(6, (next.colorPairs[ck] || 0) + delta * 0.5));
    }
  }
  if (delta < 0) {
    const sig = outfitSignature(outfitItems);
    if (!next.dislikedOutfits.includes(sig)) next.dislikedOutfits.push(sig);
    next.dislikedOutfits = next.dislikedOutfits.slice(-300);
  }
  return next;
}

// ---------- closet insights ----------

const GAP_TIPS = {
  casual: 'a couple of T-shirts, jeans and sneakers',
  smart_casual: 'an oxford shirt, chinos and leather sneakers or boots',
  office: 'chinos or trousers, a button-up or sweater, and loafers or boots',
  business: 'dress trousers, a dress shirt, a blazer and dress shoes',
  date: 'dark jeans or chinos, a well-fitting shirt or knit and boots',
  workout: 'an athletic top, shorts or joggers and training shoes',
  lounge: 'joggers and a hoodie or sweatshirt',
};

const SUGGEST_COLORS = ['navy', 'white', 'light_blue', 'grey', 'olive', 'burgundy', 'camel', 'forest', 'rust', 'khaki', 'charcoal', 'cream'];

export function closetInsights(items, prefs) {
  const out = [];
  const wearable = items.filter((i) => typeOf(i).cat !== 'accessory');
  if (wearable.length < 3) return [{ kind: 'start', text: 'Add at least a top, a bottom and a pair of shoes to start getting outfits.' }];

  for (const occ of ['casual', 'smart_casual', 'office', 'business', 'date', 'workout']) {
    const n = generateOutfits(items, { occasion: occ, tempF: 65, rain: false, prefs, feedback: {} }, 3).length;
    if (n === 0) out.push({ kind: 'gap', text: `No ${OCCASION_BY_KEY[occ].label.toLowerCase()} outfits yet — consider ${GAP_TIPS[occ]}.` });
  }

  const owned = new Set(items.map((i) => i.color));
  let best = null;
  for (const c of SUGGEST_COLORS) {
    if (owned.has(c)) continue;
    const n = wearable.filter((i) => classicPairing(c, i.color)).length;
    if (!best || n > best.n) best = { c, n };
  }
  if (best && best.n >= 2) {
    out.push({
      kind: 'color',
      text: `${/^[aeiou]/i.test(COLOR_BY_KEY[best.c].label) ? 'An' : 'A'} ${COLOR_BY_KEY[best.c].label.toLowerCase()} piece would pair classically with ${best.n} things you own.`,
    });
  }

  const counts = {};
  for (const i of wearable) counts[typeOf(i).cat] = (counts[typeOf(i).cat] || 0) + 1;
  if ((counts.shoes || 0) < 2) out.push({ kind: 'gap', text: 'More shoe options multiply your outfits fastest.' });
  const neverWorn = wearable.filter((i) => !i.wearCount).length;
  if (neverWorn >= 3) out.push({ kind: 'tip', text: `${neverWorn} pieces haven’t been worn yet — Style mixes them in.` });
  return out;
}
