import { COLORS, COLOR_BY_KEY } from './catalog';

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbToHsl([r, g, b]) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

const HSL = Object.fromEntries(COLORS.map((c) => [c.key, rgbToHsl(hexToRgb(c.hex))]));
export const hslOf = (key) => HSL[key] || HSL.grey;

export const isNeutral = (key) => !!COLOR_BY_KEY[key]?.neutral;
export const isSoft = (key) => !!COLOR_BY_KEY[key]?.soft;
export const isAccent = (key) => key !== 'multi' && !isNeutral(key);

export function hueDistance(a, b) {
  const d = Math.abs(hslOf(a).h - hslOf(b).h) % 360;
  return d > 180 ? 360 - d : d;
}

// Nearest named color to an RGB sample (weighted RGB distance, close to how eyes judge).
export function nearestColor(rgb) {
  let best = null;
  let bestD = Infinity;
  for (const c of COLORS) {
    if (c.key === 'multi') continue;
    const [r, g, b] = hexToRgb(c.hex);
    const rm = (rgb[0] + r) / 2;
    const dr = rgb[0] - r;
    const dg = rgb[1] - g;
    const db = rgb[2] - b;
    const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
    if (d < bestD) {
      bestD = d;
      best = c.key;
    }
  }
  return best;
}

// Well-known pairings stylists lean on. Order doesn't matter.
const CLASSIC = [
  ['navy', 'khaki', 'Navy and khaki is a timeless pairing'],
  ['navy', 'grey', 'Navy and grey is clean and classic'],
  ['navy', 'white', 'Navy and white is crisp and nautical'],
  ['navy', 'camel', 'Navy and camel is a rich, classic combo'],
  ['navy', 'burgundy', 'Burgundy against navy reads polished'],
  ['white', 'light_denim', 'White and denim is effortless'],
  ['white', 'dark_denim', 'White with dark denim is a clean staple'],
  ['black', 'white', 'Black and white is high-contrast and sharp'],
  ['black', 'grey', 'Black and grey makes a sleek monochrome'],
  ['black', 'camel', 'Camel lifts black nicely'],
  ['olive', 'khaki', 'Olive and khaki is a relaxed earthy pairing'],
  ['olive', 'white', 'Olive and white is fresh and easy'],
  ['olive', 'navy', 'Olive and navy is understated'],
  ['olive', 'dark_denim', 'Olive works great with dark denim'],
  ['brown', 'light_blue', 'Brown and light blue is a classic warm–cool combo'],
  ['brown', 'dark_denim', 'Brown and denim is rugged and easy'],
  ['brown', 'cream', 'Brown and cream is warm and tonal'],
  ['light_blue', 'navy', 'Light blue and navy is a tonal favorite'],
  ['light_blue', 'khaki', 'Light blue with khaki is smart and summery'],
  ['light_blue', 'grey', 'Light blue and grey is office-classic'],
  ['charcoal', 'white', 'Charcoal and white is sharp'],
  ['charcoal', 'light_blue', 'Light blue softens charcoal'],
  ['burgundy', 'grey', 'Burgundy pops against grey'],
  ['burgundy', 'khaki', 'Burgundy and khaki is warm and autumnal'],
  ['rust', 'cream', 'Rust and cream is warm and earthy'],
  ['rust', 'dark_denim', 'Rust and denim is a strong fall look'],
  ['forest', 'khaki', 'Forest green and khaki is outdoorsy-classic'],
  ['forest', 'cream', 'Forest green and cream is rich and calm'],
  ['camel', 'white', 'Camel and white is light and refined'],
  ['camel', 'grey', 'Camel and grey is soft and elegant'],
  ['sage', 'cream', 'Sage and cream is soft and modern'],
  ['blush', 'grey', 'Blush and grey is gentle and modern'],
  ['teal', 'khaki', 'Teal and tan balance each other'],
  ['mustard', 'navy', 'Mustard and navy is a confident complement'],
  ['mustard', 'charcoal', 'Mustard brightens charcoal'],
  ['lavender', 'grey', 'Lavender and grey is soft and modern'],
];
const CLASSIC_MAP = {};
for (const [a, b, why] of CLASSIC) {
  CLASSIC_MAP[`${a}|${b}`] = why;
  CLASSIC_MAP[`${b}|${a}`] = why;
}
export const classicPairing = (a, b) => CLASSIC_MAP[`${a}|${b}`] || null;

// Pairings that commonly read as mismatched.
const AWKWARD = {
  'black|navy': 'Black and navy side by side can look like a mismatch',
  'navy|black': 'Black and navy side by side can look like a mismatch',
  'black|brown': 'Brown and black together is tricky to pull off',
  'brown|black': 'Brown and black together is tricky to pull off',
  'light_denim|dark_denim': 'Two different denim washes compete',
  'dark_denim|light_denim': 'Two different denim washes compete',
};
export const awkwardPairing = (a, b) => AWKWARD[`${a}|${b}`] || null;

// How two accent colors relate on the color wheel.
export function accentHarmony(a, b) {
  if (a === b) return { score: 0.5, why: 'Matching accent colors tie the look together' };
  const d = hueDistance(a, b);
  const sa = hslOf(a).s;
  const sb = hslOf(b).s;
  const muted = Math.min(sa, sb) < 35 || isSoft(a) || isSoft(b);
  if (d <= 35) return { score: 1, why: 'Analogous colors (neighbors on the color wheel) blend smoothly' };
  if (d >= 150) return { score: muted ? 1.2 : 0.6, why: 'Complementary colors create energy' };
  if (muted) return { score: 0, why: null };
  return { score: -1.5, why: 'These two colors compete for attention' };
}
