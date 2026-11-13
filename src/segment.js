/**
 * Photo clean-up: turns a snapshot of a garment lying on a bed, floor or
 * hanging on a door into a catalog-style shot — background removed, colors
 * evened out, the piece centered on white.
 *
 * It runs entirely on the phone with no AI service. The idea: whatever
 * colors run around the edge of the photo are background. Starting from the
 * edges it spreads inward across everything that looks like those colors
 * (following gentle lighting changes and soft shadows) and stops at the
 * garment. What is left in the middle is the piece.
 *
 * Works on raw RGBA pixels so it can be tested without a browser.
 */

const OUT_W = 640;
const OUT_H = 800; // 4:5, the shape of closet tiles
const FILL = 0.86; // how much of the frame the piece occupies

// ---------- color ----------

const LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
const fLab = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);

function toLab(src, n) {
  const L = new Float32Array(n);
  const A = new Float32Array(n);
  const B = new Float32Array(n);
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const r = LIN[src[p]];
    const g = LIN[src[p + 1]];
    const b = LIN[src[p + 2]];
    const x = fLab((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
    const y = fLab(0.2126 * r + 0.7152 * g + 0.0722 * b);
    const z = fLab((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
    L[i] = 116 * y - 16;
    A[i] = 500 * (x - y);
    B[i] = 200 * (y - z);
  }
  return { L, A, B };
}

// ---------- background model ----------

// Groups the colors found around the photo's edge into up to four background
// colors. A color that shows up along only one side is probably the garment
// poking out of frame (a trouser leg, a sleeve), so it is not treated as
// background.
function backgroundColors(src, lab, w, h) {
  const band = Math.max(2, Math.round(Math.min(w, h) * 0.03));
  const samples = []; // [index, side]
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const side = y < band ? 0 : y >= h - band ? 1 : x < band ? 2 : x >= w - band ? 3 : -1;
      if (side >= 0) samples.push([y * w + x, side]);
    }
  }
  const { L, A, B } = lab;
  const K = 4;
  const byL = samples.map((s) => s[0]).sort((p, q) => L[p] - L[q]);
  let centers = Array.from({ length: K }, (_, k) => {
    const i = byL[Math.floor(((k + 0.5) / K) * byL.length)];
    return [L[i], A[i], B[i]];
  });
  const assign = new Uint8Array(samples.length);
  for (let iter = 0; iter < 10; iter++) {
    const sum = centers.map(() => [0, 0, 0, 0]);
    for (let s = 0; s < samples.length; s++) {
      const i = samples[s][0];
      let best = 0;
      let bd = Infinity;
      for (let k = 0; k < centers.length; k++) {
        const c = centers[k];
        const d = (L[i] - c[0]) ** 2 + (A[i] - c[1]) ** 2 + (B[i] - c[2]) ** 2;
        if (d < bd) {
          bd = d;
          best = k;
        }
      }
      assign[s] = best;
      const t = sum[best];
      t[0] += L[i];
      t[1] += A[i];
      t[2] += B[i];
      t[3]++;
    }
    centers = centers.map((c, k) => (sum[k][3] ? [sum[k][0] / sum[k][3], sum[k][1] / sum[k][3], sum[k][2] / sum[k][3]] : c));
  }

  const sideTotal = [0, 0, 0, 0];
  for (const s of samples) sideTotal[s[1]]++;
  const out = [];
  for (let k = 0; k < centers.length; k++) {
    const c = centers[k];
    let n = 0;
    let spread = 0;
    const rgb = [0, 0, 0];
    const onSide = [0, 0, 0, 0];
    for (let s = 0; s < samples.length; s++) {
      if (assign[s] !== k) continue;
      const i = samples[s][0];
      n++;
      spread += Math.sqrt((L[i] - c[0]) ** 2 + (A[i] - c[1]) ** 2 + (B[i] - c[2]) ** 2);
      rgb[0] += src[i * 4];
      rgb[1] += src[i * 4 + 1];
      rgb[2] += src[i * 4 + 2];
      onSide[samples[s][1]]++;
    }
    if (!n) continue;
    const share = n / samples.length;
    const sides = onSide.filter((v, i) => v >= sideTotal[i] * 0.1).length;
    if (share < 0.05 || (sides < 2 && share < 0.3)) continue;
    out.push({
      L: c[0],
      A: c[1],
      B: c[2],
      share,
      tol: Math.max(9, Math.min(20, 2.5 * (spread / n) + 7)),
      rgb: rgb.map((v) => v / n),
    });
  }
  return out;
}

// ---------- segmentation ----------

/**
 * Returns a Uint8Array mask (1 = garment) or null when the piece can't be
 * told apart from what it is lying on.
 */
export function garmentMask(src, w, h) {
  const n = w * h;
  const lab = toLab(src, n);
  const { L, A, B } = lab;
  const bgs = backgroundColors(src, lab, w, h);
  if (!bgs.length) return null;

  // Two tries. The second forgives darker pixels much more, which removes
  // the drop shadow around the piece — but on a dark garment against a light
  // surface it would eat the garment too, so it is only used if most of the
  // piece survives it.
  const strict = finishMask(floodBackground(lab, bgs, w, h, 0.75), w, h);
  if (!strict) return null;
  const relaxed = finishMask(floodBackground(lab, bgs, w, h, 0.4), w, h);
  const best = relaxed && relaxed.area >= strict.area * 0.7 ? relaxed : strict;
  return { mask: best.mask, bgs };
}

// Marks everything reachable from the photo's edges that looks like
// background. shadowWeight < 1 forgives pixels darker than the background.
function floodBackground(lab, bgs, w, h, shadowWeight) {
  const { L, A, B } = lab;
  const n = w * h;
  // How far each pixel is from the nearest background color, as a fraction of
  // that color's tolerance (≤ 1 means "looks like background").
  const dist = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let best = Infinity;
    for (let k = 0; k < bgs.length; k++) {
      const c = bgs[k];
      let dl = L[i] - c.L;
      if (dl < 0) dl *= shadowWeight;
      const d = Math.sqrt(dl * dl + (A[i] - c.A) ** 2 + (B[i] - c.B) ** 2) / c.tol;
      if (d < best) best = d;
    }
    dist[i] = best;
  }

  const bg = new Uint8Array(n);
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;
  const seed = (i) => {
    if (!bg[i] && dist[i] <= 1) {
      bg[i] = 1;
      queue[tail++] = i;
    }
  };
  for (let x = 0; x < w; x++) {
    seed(x);
    seed((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    seed(y * w);
    seed(y * w + w - 1);
  }
  const visit = (p, q) => {
    if (bg[q]) return;
    let ok = dist[q] <= 1;
    if (!ok && dist[q] <= 1.8) {
      // A gradual change from a background pixel (lighting falloff, a soft
      // shadow) is still background; a garment edge is a sharp step.
      const d = Math.abs(L[p] - L[q]) + Math.abs(A[p] - A[q]) + Math.abs(B[p] - B[q]);
      ok = d <= 2.5;
    }
    if (ok) {
      bg[q] = 1;
      queue[tail++] = q;
    }
  };
  while (head < tail) {
    const p = queue[head++];
    const x = p % w;
    if (x > 0) visit(p, p - 1);
    if (x < w - 1) visit(p, p + 1);
    if (p >= w) visit(p, p - w);
    if (p < n - w) visit(p, p + w);
  }
  return bg;
}

// Shrinks (grow = false) or grows a mask by r pixels.
function morph(m, w, h, r, grow) {
  const tmp = new Uint8Array(m.length);
  const out = new Uint8Array(m.length);
  const hit = grow ? 1 : 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 1 - hit;
      for (let d = -r; d <= r; d++) {
        const xx = x + d;
        if (xx < 0 || xx >= w ? !grow : m[y * w + xx] === hit) {
          v = hit;
          break;
        }
      }
      tmp[y * w + x] = v;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 1 - hit;
      for (let d = -r; d <= r; d++) {
        const yy = y + d;
        if (yy < 0 || yy >= h ? !grow : tmp[yy * w + x] === hit) {
          v = hit;
          break;
        }
      }
      out[y * w + x] = v;
    }
  }
  return out;
}

// Turns the raw "not background" area into a clean garment mask, or null.
function finishMask(bg, w, h) {
  const n = w * h;
  // Shave off thin whiskers (floorboard seams, cords, shadow lines) that
  // touch the piece, without moving its outline.
  let fg = new Uint8Array(n);
  for (let i = 0; i < n; i++) fg[i] = bg[i] ? 0 : 1;
  const r = Math.max(1, Math.round(Math.min(w, h) / 220));
  fg = morph(morph(fg, w, h, r, false), w, h, r, true);
  bg = fg.map((v) => 1 - v);
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;

  // Keep the main piece (and anything nearly as big, e.g. the second shoe);
  // drop crumbs, cords and wrinkles that survived.
  const label = new Int32Array(n);
  const sizes = [0];
  for (let i = 0; i < n; i++) {
    if (bg[i] || label[i]) continue;
    const id = sizes.length;
    let size = 0;
    head = tail = 0;
    queue[tail++] = i;
    label[i] = id;
    while (head < tail) {
      const p = queue[head++];
      size++;
      const x = p % w;
      const push = (q) => {
        if (!bg[q] && !label[q]) {
          label[q] = id;
          queue[tail++] = q;
        }
      };
      if (x > 0) push(p - 1);
      if (x < w - 1) push(p + 1);
      if (p >= w) push(p - w);
      if (p < n - w) push(p + w);
    }
    sizes.push(size);
  }
  const largest = Math.max(...sizes);
  const minSize = Math.max(largest * 0.15, n * 0.002);
  let mask = new Uint8Array(n);
  let area = 0;
  for (let i = 0; i < n; i++) {
    if (label[i] && sizes[label[i]] >= minSize) {
      mask[i] = 1;
      area++;
    }
  }

  // Smooth ragged edges: each pixel takes the majority of its 3×3 block.
  const smooth = new Uint8Array(n);
  area = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let c = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx >= 0 && xx < w) c += mask[yy * w + xx];
        }
      }
      if (c >= 5) {
        smooth[y * w + x] = 1;
        area++;
      }
    }
  }
  mask = smooth;

  // Sanity checks: a sliver or nearly the whole frame means it didn't work.
  const frac = area / n;
  if (frac < 0.04 || frac > 0.85) return null;
  let edge = 0;
  for (let x = 0; x < w; x++) edge += mask[x] + mask[(h - 1) * w + x];
  for (let y = 0; y < h; y++) edge += mask[y * w] + mask[y * w + w - 1];
  if (edge > (w + h) * 2 * 0.45) return null;

  return { mask, area };
}

// ---------- compose ----------

/**
 * src: RGBA pixels (Uint8ClampedArray), w × h.
 * Returns { data, width, height, color: [r, g, b] } — the piece centered on
 * white — or null if the garment couldn't be separated from its background.
 */
export function cleanGarment(src, w, h) {
  const seg = garmentMask(src, w, h);
  if (!seg) return null;
  const { mask, bgs } = seg;
  const n = w * h;

  // If the piece was shot on something white-ish, that surface tells us the
  // lighting: correct the color cast and lift the exposure to match.
  let gain = [1, 1, 1];
  const main = [...bgs].sort((a, b) => b.share - a.share)[0];
  if (main && main.L > 68 && Math.hypot(main.A, main.B) < 12) {
    const m = (main.rgb[0] + main.rgb[1] + main.rgb[2]) / 3;
    const lift = Math.max(1, Math.min(1.18, 236 / m));
    gain = main.rgb.map((v) => Math.max(0.85, Math.min(1.18, m / v)) * lift);
  }

  // Soft edge: blur the mask a little, then tighten it so no background
  // fringe comes along.
  const soft = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let c = 0;
      let k = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          c += mask[yy * w + xx];
          k++;
        }
      }
      soft[y * w + x] = Math.max(0, Math.min(1, (c / k - 0.4) / 0.5));
    }
  }

  let x0 = w;
  let y0 = h;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;
  const scale = Math.min((OUT_W * FILL) / bw, (OUT_H * FILL) / bh, 2.5);
  const ox = (OUT_W - bw * scale) / 2;
  const oy = (OUT_H - bh * scale) / 2;

  const out = new Uint8ClampedArray(OUT_W * OUT_H * 4).fill(255);
  const buckets = new Map();
  for (let Y = 0; Y < OUT_H; Y++) {
    const sy = (Y + 0.5 - oy) / scale + y0 - 0.5;
    if (sy < -1 || sy > h) continue;
    const yA = Math.max(0, Math.min(h - 1, Math.floor(sy)));
    const yB = Math.min(h - 1, yA + 1);
    const fy = Math.max(0, Math.min(1, sy - yA));
    for (let X = 0; X < OUT_W; X++) {
      const sx = (X + 0.5 - ox) / scale + x0 - 0.5;
      if (sx < -1 || sx > w) continue;
      const xA = Math.max(0, Math.min(w - 1, Math.floor(sx)));
      const xB = Math.min(w - 1, xA + 1);
      const fx = Math.max(0, Math.min(1, sx - xA));
      const i00 = yA * w + xA;
      const i01 = yA * w + xB;
      const i10 = yB * w + xA;
      const i11 = yB * w + xB;
      const w00 = (1 - fx) * (1 - fy);
      const w01 = fx * (1 - fy);
      const w10 = (1 - fx) * fy;
      const w11 = fx * fy;
      const a = soft[i00] * w00 + soft[i01] * w01 + soft[i10] * w10 + soft[i11] * w11;
      if (a <= 0.004) continue;
      const o = (Y * OUT_W + X) * 4;
      const rgb = [0, 0, 0];
      for (let c = 0; c < 3; c++) {
        const v = (src[i00 * 4 + c] * w00 + src[i01 * 4 + c] * w01 + src[i10 * 4 + c] * w10 + src[i11 * 4 + c] * w11) * gain[c];
        rgb[c] = v > 255 ? 255 : v;
        out[o + c] = rgb[c] * a + 255 * (1 - a);
      }
      if (a > 0.95 && (X & 3) === 0 && (Y & 3) === 0) {
        const key = ((rgb[0] >> 5) << 6) | ((rgb[1] >> 5) << 3) | (rgb[2] >> 5);
        const b = buckets.get(key) || [0, 0, 0, 0];
        b[0] += rgb[0];
        b[1] += rgb[1];
        b[2] += rgb[2];
        b[3]++;
        buckets.set(key, b);
      }
    }
  }

  let top = null;
  for (const b of buckets.values()) if (!top || b[3] > top[3]) top = b;
  return {
    data: out,
    width: OUT_W,
    height: OUT_H,
    color: top ? [top[0] / top[3], top[1] / top[3], top[2] / top[3]] : null,
  };
}
