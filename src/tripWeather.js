/**
 * Destinations and weather for the trip planner, from Open-Meteo (free, no
 * account or key).
 *
 * - Place search: Open-Meteo geocoding.
 * - Dates within the next 16 days: the real forecast.
 * - Dates further out: what those dates were typically like over the last
 *   five years (historical weather archive), marked as "typical".
 */
import { addDays, addYears, dateRange, daysBetween, today } from './dates';

const FORECAST_DAYS_AHEAD = 15;
const FORECAST_DAYS_BACK = 80;
const YEARS = 5;
const WINDOW = 2; // days either side, to smooth one-off weather in past years

export async function searchPlaces(query) {
  const q = query.trim();
  if (q.length < 2) return [];
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`);
  if (!r.ok) throw new Error('Place search is unavailable right now.');
  const d = await r.json();
  return (d.results || []).map((p) => ({
    name: p.name,
    region: p.admin1 || '',
    country: p.country || '',
    countryCode: p.country_code || '',
    lat: p.latitude,
    lon: p.longitude,
  }));
}

export const placeLabel = (p) => [p.name, p.countryCode === 'US' ? p.region : p.country].filter(Boolean).join(', ');

const RAIN_CODES = (c) => (c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95;
const SNOW_CODES = (c) => (c >= 71 && c <= 77) || c === 85 || c === 86;

// Open-Meteo forecast response → one entry per day.
export function parseForecast(json) {
  const d = json?.daily;
  if (!d?.time) return [];
  return d.time
    .map((date, i) => {
      const code = d.weather_code?.[i] ?? 0;
      const chance = d.precipitation_probability_max?.[i];
      const snow = SNOW_CODES(code);
      return {
        date,
        high: d.temperature_2m_max?.[i],
        low: d.temperature_2m_min?.[i],
        rainChance: chance ?? (RAIN_CODES(code) || snow ? 70 : 10),
        rain: (chance ?? 0) >= 50 || RAIN_CODES(code) || snow,
        snow,
        source: 'forecast',
      };
    })
    .filter((x) => x.high != null && x.low != null)
    .map((x) => ({ ...x, high: Math.round(x.high), low: Math.round(x.low) }));
}

// Archive responses for the same dates in past years → a typical day for each date.
// samples: [{ offsetYears, json }]
export function parseTypical(dates, samples) {
  const byDate = {};
  for (const { offsetYears, json } of samples) {
    const d = json?.daily;
    if (!d?.time) continue;
    d.time.forEach((t, i) => {
      if (d.temperature_2m_max?.[i] == null || d.temperature_2m_min?.[i] == null) return;
      (byDate[addYears(t, offsetYears)] ||= []).push({
        high: d.temperature_2m_max[i],
        low: d.temperature_2m_min[i],
        wet: (d.precipitation_sum?.[i] || 0) >= 1,
        snow: (d.snowfall_sum?.[i] || 0) >= 0.5,
      });
    });
  }
  const out = [];
  for (const date of dates) {
    const near = [];
    for (let k = -WINDOW; k <= WINDOW; k++) near.push(...(byDate[addDays(date, k)] || []));
    if (!near.length) continue;
    const avg = (f) => near.reduce((a, s) => a + s[f], 0) / near.length;
    const share = (f) => near.filter((s) => s[f]).length / near.length;
    const rainChance = Math.round(share('wet') * 100);
    out.push({
      date,
      high: Math.round(avg('high')),
      low: Math.round(avg('low')),
      rainChance,
      rain: rainChance >= 50,
      snow: share('snow') >= 0.4,
      source: 'typical',
    });
  }
  return out;
}

const getJson = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Weather service error ${r.status}`);
  return r.json();
};

/**
 * Weather for each day of a stay. Returns [{ date, high, low, rainChance,
 * rain, snow, source }] (°F), with any day it couldn't get left out.
 */
export async function tripWeather({ lat, lon, start, end }, now = new Date()) {
  const t = today(now);
  const dates = dateRange(start, end);
  const inForecast = (d) => daysBetween(t, d) <= FORECAST_DAYS_AHEAD && daysBetween(t, d) >= -FORECAST_DAYS_BACK;
  const near = dates.filter(inForecast);
  let far = dates.filter((d) => !inForecast(d));
  const loc = `latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&temperature_unit=fahrenheit&timezone=auto`;
  const days = [];

  if (near.length) {
    try {
      const json = await getJson(
        `https://api.open-meteo.com/v1/forecast?${loc}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code` +
          `&start_date=${near[0]}&end_date=${near[near.length - 1]}`
      );
      days.push(...parseForecast(json));
    } catch {
      far = dates; // fall back to typical weather for the whole stay
    }
    const got = new Set(days.map((d) => d.date));
    far = [...new Set([...far, ...near.filter((d) => !got.has(d))])].sort();
  }

  if (far.length) {
    // The same dates in each of the last few years (always fully in the past).
    const firstOffset = Math.max(1, Math.ceil((daysBetween(t, far[far.length - 1]) + WINDOW + 7) / 365));
    const reqs = [];
    for (let k = 0; k < YEARS; k++) {
      const off = firstOffset + k;
      const s = addYears(addDays(far[0], -WINDOW), -off);
      const e = addYears(addDays(far[far.length - 1], WINDOW), -off);
      reqs.push(
        getJson(
          `https://archive-api.open-meteo.com/v1/archive?${loc}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum&start_date=${s}&end_date=${e}`
        )
          .then((json) => ({ offsetYears: off, json }))
          .catch(() => null)
      );
    }
    const samples = (await Promise.all(reqs)).filter(Boolean);
    days.push(...parseTypical(far, samples));
  }
  return days.sort((a, b) => (a.date < b.date ? -1 : 1));
}
