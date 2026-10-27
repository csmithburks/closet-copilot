import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  items: 'cc:items',
  outfits: 'cc:outfits', // saved looks
  log: 'cc:wearLog', // what was worn when
  feedback: 'cc:feedback',
  prefs: 'cc:prefs',
  aiKey: 'cc:aiKey', // kept out of backups on purpose
};

export const DEFAULT_PREFS = {
  boldness: 'some',
  avoidColors: [],
  occasion: 'casual',
  aesthetic: null,
  tempUnit: 'F',
};

async function read(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function write(key, value) {
  try {
    if (value == null) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const loadItems = () => read(KEYS.items, []);
export const saveItems = (v) => write(KEYS.items, v);
export const loadOutfits = () => read(KEYS.outfits, []);
export const saveOutfits = (v) => write(KEYS.outfits, v);
export const loadLog = () => read(KEYS.log, []);
export const saveLog = (v) => write(KEYS.log, v);
export const loadFeedback = () => read(KEYS.feedback, {});
export const saveFeedback = (v) => write(KEYS.feedback, v);
export const loadPrefs = async () => ({ ...DEFAULT_PREFS, ...(await read(KEYS.prefs, {})) });
export const savePrefs = (v) => write(KEYS.prefs, v);
export const loadAiKey = () => read(KEYS.aiKey, '');
export const saveAiKey = (v) => write(KEYS.aiKey, v || null);

export async function clearAll() {
  try {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  } catch {}
}
