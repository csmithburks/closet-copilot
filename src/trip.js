/**
 * Trip planner: picks an outfit for everything on the agenda, day by day,
 * from the forecast — while packing as little as possible.
 *
 * Each outfit comes from the same style engine as the Style tab. The planner
 * then trades a little outfit score for a lighter bag: a look that reuses
 * shoes, a jacket or trousers already going in the bag beats a slightly
 * better look that needs something new. Pieces can only be re-worn a sensible
 * number of times (a T-shirt once, jeans several times).
 */
import { OCCASION_BY_KEY, TYPES } from './catalog';
import { dateRange } from './dates';
import { generateOutfits, outfitSignature, scoreOutfit, typeOf, warmthOf } from './stylist';

// What can go on a day's agenda. `time` picks which part of the day's
// temperature range the outfit is dressed for.
export const ACTIVITIES = [
  { key: 'casual', label: 'Casual', time: 'day' },
  { key: 'smart_casual', label: 'Smart casual', time: 'day' },
  { key: 'office', label: 'Business casual', time: 'day' },
  { key: 'business', label: 'Business formal', time: 'day' },
  { key: 'date', label: 'Dinner out', time: 'evening' },
  { key: 'workout', label: 'Workout', time: 'indoor' },
  { key: 'lounge', label: 'Lounge', time: 'evening' },
];
export const ACTIVITY_BY_KEY = Object.fromEntries(ACTIVITIES.map((a) => [a.key, a]));
export const BASE_ACTIVITIES = ['casual', 'smart_casual', 'office', 'business'];

export const BAGS = [
  { key: 'carryon', label: 'Carry-on', sub: 'Fewest pieces; re-wear more' },
  { key: 'checked', label: 'Checked bag', sub: 'More variety' },
];

// ---------- the trip's days ----------

export const tripDates = (trip) => {
  const all = trip.stops.flatMap((s) => dateRange(s.start, s.end));
  return [...new Set(all)].sort();
};

// The agenda for a day: what the user set, otherwise the trip's defaults.
export function agendaFor(trip, date, index, total) {
  const set = trip.plan?.[date];
  if (set) return set;
  const out = [trip.base || 'casual'];
  if (trip.dinners && index < total - 1) out.push('date');
  if (trip.workouts && index % 2 === 1) out.push('workout');
  return out;
}

/**
 * One entry per day: { date, stop, place, weather, agenda }.
 * Where two stops share a date (a travel day), the later stop wins — that is
 * where the day ends.
 */
export function tripDays(trip) {
  const dates = tripDates(trip);
  return dates.map((date, i) => {
    const stop = [...trip.stops].reverse().find((s) => s.start <= date && date <= s.end);
    const weather = (trip.weather?.[stop.id]?.days || []).find((d) => d.date === date) || null;
    return { date, stop, place: stop.place, weather, agenda: agendaFor(trip, date, i, dates.length) };
  });
}

// Temperature an outfit should be dressed for, by time of day.
export function tempFor(weather, time) {
  if (time === 'indoor') return 68; // gym
  if (!weather) return null;
  const { high, low } = weather;
  const span = high - low;
  if (time === 'evening') return Math.round(low + span * 0.35);
  if (time === 'morning') return Math.round(low + span * 0.2);
  return Math.round(high - span * 0.25);
}

// ---------- packing rules ----------

// How much room a piece takes; adding it to the bag costs this many score points.
function bulk(item) {
  const t = typeOf(item);
  if (t.cat === 'shoes') return 16;
  if (t.cat === 'outerwear') return warmthOf(item) >= 3 ? 16 : 12;
  if (t.cat === 'bottom') return 7;
  if (t.cat === 'onepiece') return 6;
  return warmthOf(item) >= 2 ? 6 : 4;
}

const WEARS = {
  tshirt: 1, tank: 1, athletic_top: 1, jersey: 1, polo: 1, dress_shirt: 1, blouse: 1,
  henley: 2, oxford: 2, linen_shirt: 2, knit_polo: 2, flannel: 2,
  sweater: 3, turtleneck: 3, cardigan: 4, quarter_zip: 3, sweater_vest: 3, sweatshirt: 3, hoodie: 3,
  jeans: 4, chinos: 3, trousers: 3, linen_trousers: 2, cargo: 3, joggers: 3, shorts: 3, skirt: 2,
  athletic_shorts: 1, leggings: 1, dress: 1, jumpsuit: 1,
};

// How many times a piece can reasonably be worn on one trip without laundry.
export function maxWears(item, bag) {
  const t = typeOf(item);
  if (t.cat === 'shoes' || t.cat === 'outerwear') return Infinity;
  const base = WEARS[item.type] ?? 2;
  // Packing light: shirts and gym kit get one more outing.
  return bag === 'carryon' && (base >= 2 || t.athletic) ? base + 1 : base;
}

// ---------- planner ----------

const ctxKey = (occasion, tempF, rain) => `${occasion}|${tempF == null ? 'x' : Math.round(tempF / 4)}|${rain ? 1 : 0}`;

// The settled outfits of a plan, in the shape planTrip takes back as `keep`.
export function picksOf(plan) {
  const out = {};
  for (const d of plan.days) for (const l of d.looks) if (l.outfit) out[l.slot] = { ids: l.outfit.items.map((i) => i.id).sort(), ctx: l.ctx };
  return out;
}

/**
 * days: from tripDays(). Returns:
 *   days:  [{ ...day, looks: [{ slot, activity, tempF, outfit | null, options }] }]
 *   pack:  [{ item, wears }] — every closet piece that goes in the bag
 *   gaps:  things the closet can't cover
 *
 * keep: { [slot]: { ids, ctx } } — outfits already settled for this trip.
 * They stay put (so a packing list in progress doesn't reshuffle) unless the
 * weather for that day has changed or a piece has left the closet.
 */
export function planTrip({ items, days, prefs, feedback, bag = 'carryon', avoid = {}, keep = {} }) {
  // Trips are in the future: what was worn this week shouldn't count against a piece.
  const closet = items.map((i) => ({ ...i, lastWorn: null }));
  const lambda = bag === 'carryon' ? 1 : 0.45;
  const cache = new Map();
  const candidatesFor = (occasion, tempF, rain) => {
    const key = ctxKey(occasion, tempF, rain);
    if (!cache.has(key)) cache.set(key, generateOutfits(closet, ctxOf(occasion, tempF, rain), 24));
    return cache.get(key);
  };
  const ctxOf = (occasion, tempF, rain) => ({ occasion, aesthetic: prefs?.aesthetic, tempF, rain, prefs, feedback: feedback || {}, now: 0, seed: 0 });
  const closetById = Object.fromEntries(closet.map((i) => [i.id, i]));

  const slots = [];
  days.forEach((day, dayIndex) => {
    for (const key of day.agenda) {
      const activity = ACTIVITY_BY_KEY[key];
      if (!activity) continue;
      const tempF = tempFor(day.weather, activity.time);
      const rain = activity.time !== 'indoor' && !!day.weather?.rain;
      const slot = `${day.date}|${key}`;
      const banned = new Set(avoid[slot] || []);
      let options = candidatesFor(key, tempF, rain).filter((o) => !banned.has(o.signature));
      const ctx = ctxKey(key, tempF, rain);
      let pick = -1;
      let fixed = false;
      const kept = keep[slot];
      if (kept && kept.ctx === ctx && kept.ids.every((id) => closetById[id])) {
        const outfit = kept.ids.map((id) => closetById[id]);
        const signature = outfitSignature(outfit);
        if (!banned.has(signature)) {
          const { raw, ...scored } = scoreOutfit(outfit, { ...ctxOf(key, tempF, rain) });
          options = [{ items: outfit, signature, ...scored }, ...options.filter((o) => o.signature !== signature)];
          pick = 0;
          fixed = true;
        }
      }
      slots.push({ slot, dayIndex, date: day.date, activity, tempF, rain, ctx, options, pick, fixed });
    }
  });

  // Uses of each piece across the trip, leaving out one slot.
  const usesWithout = (skip) => {
    const uses = {};
    for (const s of slots) {
      if (s === skip || s.pick < 0) continue;
      for (const it of s.options[s.pick].items) uses[it.id] = (uses[it.id] || 0) + 1;
    }
    return uses;
  };
  // Tops/dresses worn on the same or the neighboring day, to keep days looking different.
  const nearbyCores = (skip) => {
    const ids = new Set();
    for (const s of slots) {
      if (s === skip || s.pick < 0 || Math.abs(s.dayIndex - skip.dayIndex) > 1) continue;
      for (const it of s.options[s.pick].items) if (['top', 'onepiece'].includes(typeOf(it).cat)) ids.add(it.id);
    }
    return ids;
  };
  const value = (outfit, uses, near) => {
    let v = outfit.score;
    for (const it of outfit.items) {
      const used = uses[it.id] || 0;
      if (!used) v -= lambda * bulk(it);
      if (used + 1 > maxWears(it, bag)) v -= 40;
      if (near.has(it.id)) v -= 8;
    }
    return v;
  };
  const choose = (s) => {
    if (s.fixed || !s.options.length) return;
    const uses = usesWithout(s);
    const near = nearbyCores(s);
    let best = 0;
    let bestV = -Infinity;
    s.options.forEach((o, i) => {
      const v = value(o, uses, near);
      if (v > bestV) {
        bestV = v;
        best = i;
      }
    });
    s.pick = best;
  };

  // Start with the slots that have the fewest options, then keep revisiting
  // each slot with all the others fixed until the bag stops improving.
  const order = [...slots].sort((a, b) => a.options.length - b.options.length);
  order.forEach(choose);
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    for (const s of order) {
      const before = s.pick;
      choose(s);
      if (s.pick !== before) changed = true;
    }
    if (!changed) break;
  }

  const wears = usesWithout(null);
  const byId = Object.fromEntries(closet.map((i) => [i.id, i]));
  const original = Object.fromEntries(items.map((i) => [i.id, i]));
  const CAT_ORDER = { outerwear: 0, top: 1, onepiece: 2, bottom: 3, shoes: 4 };
  const pack = Object.keys(wears)
    .map((id) => ({ item: original[id], wears: wears[id] }))
    .sort((a, b) => (CAT_ORDER[typeOf(a.item).cat] ?? 9) - (CAT_ORDER[typeOf(b.item).cat] ?? 9) || b.wears - a.wears);

  const gaps = [];
  const missing = {};
  for (const s of slots) if (s.pick < 0) (missing[s.activity.key] ||= []).push(s);
  for (const [key, list] of Object.entries(missing)) {
    const t = list[0].tempF;
    gaps.push(
      `Nothing in your closet works for ${OCCASION_BY_KEY[key].label.toLowerCase()}${t != null ? ` at around ${t}°` : ''}${
        list[0].rain ? ' in the rain' : ''
      } (${list.length} time${list.length === 1 ? '' : 's'} on this trip).`
    );
  }
  const overworn = pack.filter((p) => p.wears > maxWears(byId[p.item.id], bag));
  if (overworn.length) {
    gaps.push(`You’ll re-wear ${overworn.map((p) => p.item.name).join(', ')} more than is ideal — plan a wash, or add similar pieces to your closet.`);
  }

  const out = days.map((day) => ({
    ...day,
    looks: slots
      .filter((s) => s.date === day.date)
      .map((s) => ({
        slot: s.slot,
        activity: s.activity,
        tempF: s.tempF,
        ctx: s.ctx,
        outfit: s.pick >= 0 ? s.options[s.pick] : null,
        options: s.options.length,
      })),
  }));
  return { days: out, pack, gaps, outfits: slots.filter((s) => s.pick >= 0).length };
}

// ---------- everything else that goes in the bag ----------

/**
 * Non-closet items, with quantities worked out from the trip.
 * Returns [{ key, label, qty, why }].
 */
export function essentials({ days, plan, trip, items }) {
  const n = days.length;
  const nights = Math.max(0, n - 1);
  const count = (key) => days.reduce((a, d) => a + (d.agenda.includes(key) ? 1 : 0), 0);
  const workouts = count('workout');
  const wx = days.map((d) => d.weather).filter(Boolean);
  const anyRain = wx.some((w) => w.rain && !w.snow);
  const anySnow = wx.some((w) => w.snow);
  const coldest = wx.length ? Math.min(...wx.map((w) => w.low)) : null;
  const hottest = wx.length ? Math.max(...wx.map((w) => w.high)) : null;
  const packed = plan.pack.map((p) => p.item);
  const dressy = packed.some((i) => ['chinos', 'trousers', 'linen_trousers', 'jeans'].includes(i.type));
  const formal = count('business') > 0;
  const countries = new Set(trip.stops.map((s) => s.place.countryCode).filter(Boolean));
  const out = [];
  const add = (key, label, qty, why) => out.push({ key, label, qty: qty || 1, why: why || '' });

  add('underwear', 'Underwear', n + 1 + workouts, `${n} day${n === 1 ? '' : 's'} + a spare${workouts ? ' + workouts' : ''}`);
  add('socks', 'Socks', n + 1 + workouts, formal ? 'include dress socks' : '');
  if (nights) add('sleepwear', 'Sleepwear', nights >= 6 ? 2 : 1);
  if (dressy) {
    const own = items.find((i) => i.type === 'belt');
    add('belt', own ? own.name : 'Belt', 1, 'for trousers or jeans');
  }
  if (formal) add('tie', 'Tie / dress accessories', 1, 'business formal days');
  if (workouts) add('gym', 'Earbuds & water bottle', 1, `${workouts} workout${workouts === 1 ? '' : 's'}`);
  if (trip.beach) {
    add('swim', 'Swimsuit', n >= 5 ? 2 : 1, 'beach / pool');
    add('sandals', 'Flip-flops', 1, 'beach / pool');
  }
  if (anyRain) add('umbrella', 'Compact umbrella', 1, 'rain in the forecast');
  if (anySnow || (coldest != null && coldest <= 36)) add('cold', 'Hat, gloves & scarf', 1, anySnow ? 'snow expected' : `lows near ${coldest}°`);
  if (trip.beach || (hottest != null && hottest >= 75)) add('sun', 'Sunglasses & sunscreen', 1, trip.beach ? 'beach / pool' : `highs near ${hottest}°`);
  add('toiletries', 'Toiletry kit', 1, bagNote(trip.bag));
  add('meds', 'Medications', 1);
  add('chargers', 'Phone charger & cables', 1);
  add('id', countries.size > 1 || trip.international ? 'Passport, ID & wallet' : 'ID & wallet', 1);
  if (trip.international) add('adapter', 'Plug adapter', 1, 'check the outlet type');
  if (nights >= 5) add('laundry', 'Laundry bag', 1);
  return out;
}

const bagNote = (bag) => (bag === 'carryon' ? 'liquids under 3.4 oz / 100 ml' : '');

// Bulkiest shoes and coat are better worn on the way than packed.
export function wearInTransit(plan) {
  const pick = (cat) =>
    plan.pack
      .map((p) => p.item)
      .filter((i) => typeOf(i).cat === cat)
      .sort((a, b) => warmthOf(b) - warmthOf(a) || (TYPES[b.type]?.formality || 0) - (TYPES[a.type]?.formality || 0))[0];
  const shoes = plan.pack.filter((p) => typeOf(p.item).cat === 'shoes').length > 1 ? pick('shoes') : null;
  const coat = pick('outerwear');
  return [coat, shoes].filter(Boolean);
}

// Plain-text packing list for sharing or notes.
export function packingText({ title, plan, extras, essentialsList }) {
  const lines = [title, ''];
  lines.push('CLOTHES');
  for (const p of plan.pack) lines.push(`☐ ${p.item.name}${p.wears > 1 ? ` (×${p.wears} wears)` : ''}`);
  lines.push('', 'ESSENTIALS');
  for (const e of essentialsList) lines.push(`☐ ${e.label}${e.qty > 1 ? ` ×${e.qty}` : ''}`);
  if (extras?.length) {
    lines.push('', 'ALSO');
    for (const e of extras) lines.push(`☐ ${e.label}`);
  }
  return lines.join('\n');
}
