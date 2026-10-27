import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'cc:img:';

export const putImage = (id, dataUri) => AsyncStorage.setItem(PREFIX + id, dataUri);
export const deleteImage = (id) => AsyncStorage.removeItem(PREFIX + id);

export async function clearImages() {
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
  if (keys.length) await AsyncStorage.multiRemove(keys);
}

export async function loadAllImages() {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
    const pairs = await AsyncStorage.multiGet(keys);
    return Object.fromEntries(pairs.map(([k, v]) => [k.slice(PREFIX.length), v]));
  } catch {
    return {};
  }
}
