import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import StyleScreen from './src/screens/StyleScreen';
import ClosetScreen from './src/screens/ClosetScreen';
import LooksScreen from './src/screens/LooksScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import TripsScreen from './src/screens/TripsScreen';
import ItemEditor from './src/screens/ItemEditor';
import { TYPES } from './src/catalog';
import { demoCloset } from './src/demo';
import { notify } from './src/dialogs';
import { cleanPhoto } from './src/cleanup';
import { applyFeedback } from './src/stylist';
import { clearImages, deleteImage, loadAllImages, putImage } from './src/imageStore';
import {
  DEFAULT_PREFS,
  clearAll,
  loadFeedback,
  loadItems,
  loadLog,
  loadOutfits,
  loadPrefs,
  loadTrips,
  loadAiKey,
  saveAiKey,
  saveFeedback,
  saveItems,
  saveLog,
  saveOutfits,
  savePrefs,
  saveTrips,
} from './src/storage';
import { colors } from './src/theme';

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const TABS = [
  { key: 'style', label: 'Style', icon: 'sparkles' },
  { key: 'closet', label: 'Closet', icon: 'shirt' },
  { key: 'looks', label: 'Looks', icon: 'albums' },
  { key: 'trips', label: 'Trips', icon: 'airplane' },
  { key: 'profile', label: 'Profile', icon: 'person-circle' },
];

export default function App() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('style');
  const [items, setItems] = useState([]);
  const [images, setImages] = useState({});
  const [outfits, setOutfits] = useState([]);
  const [log, setLog] = useState([]);
  const [feedback, setFeedback] = useState({});
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [weather, setWeather] = useState(null);
  const [lockId, setLockId] = useState(null);
  const [editor, setEditor] = useState(null); // { item } | { item: null } for new
  const [aiKey, setAiKey] = useState('');
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    if (Platform.OS === 'web') setupHomeScreenApp();
    (async () => {
      const [it, im, ou, lg, fb, pr, key, tr] = await Promise.all([
        loadItems(),
        loadAllImages(),
        loadOutfits(),
        loadLog(),
        loadFeedback(),
        loadPrefs(),
        loadAiKey(),
        loadTrips(),
      ]);
      setTrips(tr);
      setAiKey(key || '');
      setItems(it);
      setImages(im);
      setOutfits(ou);
      setLog(lg);
      setFeedback(fb);
      setPrefs(pr);
      if (!it.length) setTab('closet');
      setReady(true);
    })();
  }, []);

  const updateItems = (next) => {
    setItems(next);
    saveItems(next);
  };
  const updateFeedback = (next) => {
    setFeedback(next);
    saveFeedback(next);
  };

  // ---- closet ----
  // Front photo is stored under the item id, the back under `${id}:back`.
  const storePhoto = async (key, uri) => {
    if (uri) {
      await putImage(key, uri);
      setImages((m) => ({ ...m, [key]: uri }));
    } else {
      await deleteImage(key);
      setImages((m) => {
        const n = { ...m };
        delete n[key];
        return n;
      });
    }
  };

  // originals: { front, back } — the photo as taken, kept next to a cleaned-up
  // one (under `${key}:orig`) so clean-up can always be undone.
  const saveItem = async (item, photo, backPhoto, originals = {}) => {
    const isNew = !item.id;
    const saved = isNew ? { ...item, id: uid(), createdAt: Date.now() } : { ...item };
    try {
      for (const [key, uri, flag, orig] of [
        [saved.id, photo, 'photoClean', originals.front],
        [`${saved.id}:back`, backPhoto, 'backClean', originals.back],
      ]) {
        if (uri === undefined) continue;
        await storePhoto(key, uri);
        await storePhoto(`${key}:orig`, uri && saved[flag] && orig ? orig : null);
      }
    } catch (e) {
      notify('Photo not saved', 'Your phone may be out of storage for this app. The piece was saved without the new photo.');
    }
    updateItems(isNew ? [saved, ...items] : items.map((i) => (i.id === saved.id ? saved : i)));
    setEditor(null);
  };

  const deleteItem = async (id) => {
    updateItems(items.filter((i) => i.id !== id));
    try {
      for (const k of [id, `${id}:back`, `${id}:orig`, `${id}:back:orig`]) await deleteImage(k);
    } catch {}
    setImages((m) => {
      const n = { ...m };
      delete n[id];
      delete n[`${id}:back`];
      return n;
    });
    if (lockId === id) setLockId(null);
    setEditor(null);
  };

  const loadDemo = () => {
    const demo = demoCloset(uid, TYPES);
    updateItems([...items, ...demo]);
    setTab('style');
  };

  const removeDemo = () => {
    const ids = new Set(items.filter((i) => i.demo).map((i) => i.id));
    updateItems(items.filter((i) => !i.demo));
    const o = outfits.filter((x) => !x.itemIds.some((id) => ids.has(id)));
    setOutfits(o);
    saveOutfits(o);
  };

  // Cleans up every photo that hasn't been cleaned yet. Returns { cleaned, skipped }.
  const cleanAllPhotos = async () => {
    let cleaned = 0;
    let skipped = 0;
    const flags = {};
    for (const item of items) {
      for (const [key, flag] of [[item.id, 'photoClean'], [`${item.id}:back`, 'backClean']]) {
        if (!images[key] || item[flag]) continue;
        const res = await cleanPhoto(images[key]);
        if (!res) {
          skipped++;
          continue;
        }
        try {
          await storePhoto(`${key}:orig`, images[key]); // keep the photo as taken
          await storePhoto(key, res.uri);
          (flags[item.id] ||= {})[flag] = true;
          cleaned++;
        } catch {
          skipped++;
        }
      }
    }
    if (cleaned) updateItems(items.map((i) => (flags[i.id] ? { ...i, ...flags[i.id] } : i)));
    return { cleaned, skipped };
  };

  // Puts back the photo as taken wherever one was kept. Returns { restored, lost }
  // (lost = cleaned photos whose original was not kept).
  const undoCleanAll = async () => {
    let restored = 0;
    let lost = 0;
    const flags = {};
    for (const item of items) {
      for (const [key, flag] of [[item.id, 'photoClean'], [`${item.id}:back`, 'backClean']]) {
        if (!item[flag] || !images[key]) continue;
        const orig = images[`${key}:orig`];
        if (!orig) {
          lost++;
          continue;
        }
        try {
          await storePhoto(key, orig);
          await storePhoto(`${key}:orig`, null);
          (flags[item.id] ||= {})[flag] = false;
          restored++;
        } catch {}
      }
    }
    if (restored) updateItems(items.map((i) => (flags[i.id] ? { ...i, ...flags[i.id] } : i)));
    return { restored, lost };
  };

  // ---- trips ----
  const saveTrip = (trip) =>
    setTrips((prev) => {
      const next = prev.some((t) => t.id === trip.id) ? prev.map((t) => (t.id === trip.id ? trip : t)) : [trip, ...prev];
      saveTrips(next);
      return next;
    });
  const updateTrip = (id, fn) =>
    setTrips((prev) => {
      const next = prev.map((t) => (t.id === id ? fn(t) : t));
      saveTrips(next);
      return next;
    });
  const deleteTrip = (id) =>
    setTrips((prev) => {
      const next = prev.filter((t) => t.id !== id);
      saveTrips(next);
      return next;
    });

  // ---- outfits ----
  const wear = (outfitItems, occasion) => {
    const now = Date.now();
    const ids = new Set(outfitItems.map((i) => i.id));
    updateItems(items.map((i) => (ids.has(i.id) ? { ...i, wearCount: (i.wearCount || 0) + 1, lastWorn: now } : i)));
    const nextLog = [{ id: uid(), itemIds: [...ids], occasion, date: now }, ...log].slice(0, 1000);
    setLog(nextLog);
    saveLog(nextLog);
    updateFeedback(applyFeedback(feedback, outfitItems, 1));
    notify('Logged', 'Have a great day. Style will keep tomorrow’s picks fresh.');
  };

  const saveOutfit = (outfitItems, occasion) => {
    const sig = outfitItems.map((i) => i.id).sort().join('+');
    if (outfits.some((o) => [...o.itemIds].sort().join('+') === sig)) {
      notify('Already saved', 'This look is in your Looks tab.');
      return false;
    }
    const next = [{ id: uid(), itemIds: outfitItems.map((i) => i.id), occasion, createdAt: Date.now() }, ...outfits];
    setOutfits(next);
    saveOutfits(next);
    updateFeedback(applyFeedback(feedback, outfitItems, 1));
    return true;
  };

  const pass = (outfitItems) => updateFeedback(applyFeedback(feedback, outfitItems, -1));

  // ---- prefs & data ----
  const changePrefs = (patch) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    savePrefs(next);
  };

  const buildBackup = async () => ({
    app: 'closet-copilot',
    version: 1,
    exportedAt: new Date().toISOString(),
    items,
    images: await loadAllImages(),
    outfits,
    log,
    feedback,
    prefs,
    trips,
  });

  const restore = async (data) => {
    const have = new Set(items.map((i) => i.id));
    const fresh = (data.items || []).filter((i) => i && i.id && !have.has(i.id));
    const imgs = data.images || {};
    const added = {};
    for (const i of fresh) {
      for (const key of [i.id, `${i.id}:back`]) {
        if (!imgs[key]) continue;
        try {
          await putImage(key, imgs[key]);
          added[key] = imgs[key];
        } catch {}
      }
    }
    // Pieces already here whose photo was cleaned up since the backup: put the
    // backed-up (as-taken) photo back.
    const backed = Object.fromEntries((data.items || []).filter((i) => i && i.id).map((i) => [i.id, i]));
    const unflag = {};
    let photosRestored = 0;
    for (const i of items) {
      const b = backed[i.id];
      if (!b) continue;
      for (const [key, flag] of [[i.id, 'photoClean'], [`${i.id}:back`, 'backClean']]) {
        const src = b[flag] ? imgs[`${key}:orig`] : imgs[key];
        if (!i[flag] || !src) continue;
        try {
          await putImage(key, src);
          await deleteImage(`${key}:orig`);
          added[key] = src;
          (unflag[i.id] ||= {})[flag] = false;
          photosRestored++;
        } catch {}
      }
    }
    setImages((m) => {
      const n = { ...m, ...added };
      for (const id of Object.keys(unflag)) for (const k of [`${id}:orig`, `${id}:back:orig`]) if (added[k.replace(':orig', '')]) delete n[k];
      return n;
    });
    updateItems([...fresh, ...items.map((i) => (unflag[i.id] ? { ...i, ...unflag[i.id] } : i))]);
    const oIds = new Set(outfits.map((o) => o.id));
    const nextO = [...outfits, ...(data.outfits || []).filter((o) => o && !oIds.has(o.id))];
    setOutfits(nextO);
    saveOutfits(nextO);
    const lIds = new Set(log.map((l) => l.id));
    const nextL = [...log, ...(data.log || []).filter((l) => l && !lIds.has(l.id))].sort((a, b) => b.date - a.date);
    setLog(nextL);
    saveLog(nextL);
    const tIds = new Set(trips.map((t) => t.id));
    const freshTrips = (data.trips || []).filter((t) => t && t.id && Array.isArray(t.stops) && !tIds.has(t.id));
    if (freshTrips.length) {
      const nextT = [...trips, ...freshTrips];
      setTrips(nextT);
      saveTrips(nextT);
    }
    if (data.prefs) changePrefs(data.prefs);
    if (data.feedback && !Object.keys(feedback.pairs || {}).length) updateFeedback(data.feedback);
    return { pieces: fresh.length, photos: photosRestored };
  };

  const clearEverything = async () => {
    await clearAll();
    try {
      await clearImages();
    } catch {}
    setItems([]);
    setImages({});
    setOutfits([]);
    setLog([]);
    setFeedback({});
    setTrips([]);
    setPrefs(DEFAULT_PREFS);
    setLockId(null);
    setTab('closet');
  };

  const openItem = (item) => setEditor({ item });

  let screen;
  if (tab === 'style') {
    screen = (
      <StyleScreen
        items={items}
        images={images}
        prefs={prefs}
        feedback={feedback}
        weather={weather}
        setWeather={setWeather}
        occasion={prefs.occasion}
        setOccasion={(o) => changePrefs({ occasion: o })}
        aesthetic={prefs.aesthetic}
        setAesthetic={(a) => changePrefs({ aesthetic: a })}
        lockId={lockId}
        setLockId={setLockId}
        onWear={wear}
        onSave={saveOutfit}
        onPass={pass}
        onOpenItem={openItem}
        goToCloset={() => setTab('closet')}
      />
    );
  } else if (tab === 'closet') {
    screen = (
      <ClosetScreen
        items={items}
        images={images}
        onOpenItem={openItem}
        onAdd={() => setEditor({ item: null })}
        onLoadDemo={loadDemo}
      />
    );
  } else if (tab === 'looks') {
    screen = (
      <LooksScreen
        items={items}
        images={images}
        outfits={outfits}
        log={log}
        onWear={wear}
        onOpenItem={openItem}
        onDeleteOutfit={(id) => {
          const n = outfits.filter((o) => o.id !== id);
          setOutfits(n);
          saveOutfits(n);
        }}
        onDeleteLog={(id) => {
          const n = log.filter((l) => l.id !== id);
          setLog(n);
          saveLog(n);
        }}
      />
    );
  } else if (tab === 'trips') {
    screen = (
      <TripsScreen
        items={items}
        images={images}
        prefs={prefs}
        feedback={feedback}
        trips={trips}
        onSaveTrip={saveTrip}
        onUpdateTrip={updateTrip}
        onDeleteTrip={deleteTrip}
        onOpenItem={openItem}
        onSaveLook={saveOutfit}
      />
    );
  } else {
    screen = (
      <ProfileScreen
        items={items}
        outfits={outfits}
        log={log}
        prefs={prefs}
        onChangePrefs={changePrefs}
        photoCount={items.reduce((n, i) => n + (images[i.id] && !i.photoClean ? 1 : 0) + (images[`${i.id}:back`] && !i.backClean ? 1 : 0), 0)}
        onCleanAllPhotos={cleanAllPhotos}
        cleanedCount={items.reduce((n, i) => n + (images[i.id] && i.photoClean ? 1 : 0) + (images[`${i.id}:back`] && i.backClean ? 1 : 0), 0)}
        onUndoCleanAll={undoCleanAll}
        aiKey={aiKey}
        onChangeAiKey={(k) => {
          setAiKey(k);
          saveAiKey(k);
        }}
        buildBackup={buildBackup}
        onRestore={restore}
        onLoadDemo={loadDemo}
        onRemoveDemo={removeDemo}
        onResetLearning={() => {
          updateFeedback({});
          notify('Reset', 'The stylist will start learning your taste fresh.');
        }}
        onClearAll={clearEverything}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.root} edges={['top']}>
        {ready ? (
          <View style={{ flex: 1 }}>{screen}</View>
        ) : (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} />
          </View>
        )}
      </SafeAreaView>
      <SafeAreaView style={styles.tabWrap} edges={['bottom']}>
        <View style={styles.tabBar}>
          {TABS.map((t) => {
            const on = tab === t.key;
            const color = on ? colors.text : colors.muted;
            return (
              <Pressable key={t.key} style={styles.tab} onPress={() => setTab(t.key)}>
                <Ionicons name={on ? t.icon : `${t.icon}-outline`} size={23} color={color} />
                <Text style={[styles.tabText, { color }]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>

      <ItemEditor
        visible={!!editor}
        item={editor?.item || null}
        imageUri={editor?.item ? images[editor.item.id] : null}
        backUri={editor?.item ? images[`${editor.item.id}:back`] : null}
        aiKey={aiKey}
        origUri={editor?.item ? images[`${editor.item.id}:orig`] : null}
        backOrigUri={editor?.item ? images[`${editor.item.id}:back:orig`] : null}
        autoClean={prefs.cleanPhotos === true}
        onSave={saveItem}
        onDelete={deleteItem}
        onStyle={(item) => {
          setLockId(item.id);
          setEditor(null);
          setTab('style');
        }}
        onClose={() => setEditor(null)}
      />
    </SafeAreaProvider>
  );
}

// Web build only: lets iOS "Add to Home Screen" open it full-screen with an icon.
function setupHomeScreenApp() {
  const head = document.head;
  const add = (tag, attrs) => {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    head.appendChild(el);
  };
  document.title = 'Closet Copilot';
  add('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
  add('meta', { name: 'mobile-web-app-capable', content: 'yes' });
  add('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'default' });
  add('meta', { name: 'apple-mobile-web-app-title', content: 'Closet' });
  add('meta', { name: 'theme-color', content: colors.bg });
  add('link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' });
  add('link', { rel: 'manifest', href: '/manifest.json' });
  document.body.style.backgroundColor = colors.bg;
  const vp = document.querySelector('meta[name="viewport"]');
  if (vp) vp.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover');
  // Ask the browser not to clear stored photos when space runs low.
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabWrap: { backgroundColor: colors.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  tabBar: { flexDirection: 'row', height: 56 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 10, fontWeight: '600', marginTop: 2 },
});
