import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { notify } from './dialogs';

const MAX = 640;

// Native (Expo Go) version: camera or library, resized to keep storage small.
// Color is chosen by hand here; automatic color detection runs in the
// home-screen (web) version.
export async function pickPhoto(source) {
  const perm =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    notify('Permission needed', `Allow ${source === 'camera' ? 'camera' : 'photo'} access in Settings to add photos.`);
    return null;
  }
  const opts = { mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [3, 4] };
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];
  try {
    const resize = asset.width >= asset.height ? { width: Math.min(MAX, asset.width) } : { height: Math.min(MAX, asset.height) };
    const out = await ImageManipulator.manipulateAsync(asset.uri, [{ resize }], {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });
    return { uri: `data:image/jpeg;base64,${out.base64}`, color: null };
  } catch {
    return null;
  }
}
