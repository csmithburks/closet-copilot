import { nearestColor } from './color';
import { cleanGarment } from './segment';

export const canCleanPhotos = true;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Turns a photo (data URI) into a catalog-style shot: the piece on its own,
// centered on white. Returns { uri, color } or null if the garment couldn't
// be separated from what it's lying on.
export async function cleanPhoto(uri) {
  try {
    const img = await loadImage(uri);
    const scale = Math.min(1, 640 / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const res = cleanGarment(ctx.getImageData(0, 0, w, h).data, w, h);
    if (!res) return null;
    canvas.width = res.width;
    canvas.height = res.height;
    const out = canvas.getContext('2d');
    out.putImageData(new ImageData(res.data, res.width, res.height), 0, 0);
    return { uri: canvas.toDataURL('image/jpeg', 0.82), color: res.color ? nearestColor(res.color) : null };
  } catch {
    return null;
  }
}
