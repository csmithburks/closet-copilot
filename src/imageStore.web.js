// Photos live in IndexedDB on the web build: browser localStorage is only a
// few MB, which a closet of photos would fill quickly.
const DB = 'closet-copilot';
const STORE = 'images';

let dbPromise = null;
function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function tx(mode, fn) {
  return db().then(
    (d) =>
      new Promise((resolve, reject) => {
        const t = d.transaction(STORE, mode);
        const store = t.objectStore(STORE);
        const req = fn(store);
        t.oncomplete = () => resolve(req && req.result);
        t.onerror = () => reject(t.error);
      })
  );
}

export const putImage = (id, dataUri) => tx('readwrite', (s) => s.put(dataUri, id));
export const deleteImage = (id) => tx('readwrite', (s) => s.delete(id));
export const clearImages = () => tx('readwrite', (s) => s.clear());

export async function loadAllImages() {
  try {
    const d = await db();
    return await new Promise((resolve, reject) => {
      const out = {};
      const t = d.transaction(STORE, 'readonly');
      const req = t.objectStore(STORE).openCursor();
      req.onsuccess = () => {
        const cur = req.result;
        if (cur) {
          out[cur.key] = cur.value;
          cur.continue();
        } else resolve(out);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return {};
  }
}
