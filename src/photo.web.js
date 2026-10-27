import { nearestColor } from './color';

const MAX = 640;

// Opens the camera (source 'camera') or photo library, shrinks the photo,
// and guesses the garment's main color from the middle of the frame.
export function pickPhoto(source) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (source === 'camera') input.setAttribute('capture', 'environment');
    input.style.display = 'none';
    input.onchange = async () => {
      const file = input.files && input.files[0];
      input.remove();
      if (!file) return resolve(null);
      try {
        resolve(await processFile(file));
      } catch {
        resolve(null);
      }
    };
    document.body.appendChild(input);
    input.click();
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function processFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, MAX / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const uri = canvas.toDataURL('image/jpeg', 0.72);
    return { uri, color: dominantColor(ctx, w, h) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Most common color in the central area (where the garment usually is),
// counted in coarse buckets so small shading differences group together.
function dominantColor(ctx, w, h) {
  const x0 = Math.floor(w * 0.25);
  const y0 = Math.floor(h * 0.25);
  const cw = Math.max(1, Math.floor(w * 0.5));
  const ch = Math.max(1, Math.floor(h * 0.5));
  const data = ctx.getImageData(x0, y0, cw, ch).data;
  const buckets = {};
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = `${r >> 5},${g >> 5},${b >> 5}`;
    const bk = buckets[key] || (buckets[key] = { n: 0, r: 0, g: 0, b: 0 });
    bk.n++;
    bk.r += r;
    bk.g += g;
    bk.b += b;
  }
  let best = null;
  for (const k in buckets) if (!best || buckets[k].n > best.n) best = buckets[k];
  if (!best) return null;
  return nearestColor([best.r / best.n, best.g / best.n, best.b / best.n]);
}
