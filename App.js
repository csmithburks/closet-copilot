import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import StyleScreen from './src/screens/StyleScreen';
import ClosetScreen from './src/screens/ClosetScreen';
import LooksScreen from './src/screens/LooksScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ItemEditor from './src/screens/ItemEditor';
import { TYPES } from './src/catalog';
import { demoCloset } from './src/demo';
import { notify } from './src/dialogs';
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
  loadAiKey,
  saveAiKey,
  saveFeedback,
  saveItems,
  saveLog,
  saveOutfits,
  savePrefs,
} from './src/storage';
import { colors } from './src/theme';

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const TABS = [
  { key: 'style', label: 'Style', icon: 'sparkles' },
  { key: 'closet', label: 'Closet', icon: 'shirt' },
  { key: 'looks', label: 'Looks', icon: 'albums' },
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

  useEffect(() => {
    if (Platform.OS === 'web') setupHomeScreenApp();
    (async () => {
      const [it, im, ou, lg, fb, pr, key] = await Promise.all([
        loadItems(),
        loadAllImages(),
        loadOutfits(),
        loadLog(),
        loadFeedback(),
        loadPrefs(),
        loadAiKey(),
      ]);
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

  const saveItem = async (item, photo, backPhoto) => {
    const isNew = !item.id;
    const saved = isNew ? { ...item, id: uid(), createdAt: Date.now() } : { ...item };
    try {
      if (photo !== undefined) await storePhoto(saved.id, photo);
      if (backPhoto !== undefined) await storePhoto(`${saved.id}:back`, backPhoto);
    } catch (e) {
      notify('Photo not saved', 'Your phone may be out of storage for this app. The piece was saved without the new photo.');
    }
    updateItems(isNew ? [saved, ...items] : items.map((i) => (i.id === saved.id ? saved : i)));
    setEditor(null);
  };

  const deleteItem = async (id) => {
    updateItems(items.filter((i) => i.id !== id));
    try {
      await deleteImage(id);
      await deleteImage(`${id}:back`);
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
      return;
    }
    const next = [{ id: uid(), itemIds: outfitItems.map((i) => i.id), occasion, createdAt: Date.now() }, ...outfits];
    setOutfits(next);
    saveOutfits(next);
    updateFeedback(applyFeedback(feedback, outfitItems, 1));
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
    setImages((m) => ({ ...m, ...added }));
    updateItems([...fresh, ...items]);
    const oIds = new Set(outfits.map((o) => o.id));
    const nextO = [...outfits, ...(data.outfits || []).filter((o) => o && !oIds.has(o.id))];
    setOutfits(nextO);
    saveOutfits(nextO);
    const lIds = new Set(log.map((l) => l.id));
    const nextL = [...log, ...(data.log || []).filter((l) => l && !lIds.has(l.id))].sort((a, b) => b.date - a.date);
    setLog(nextL);
    saveLog(nextL);
    if (data.prefs) changePrefs(data.prefs);
    if (data.feedback && !Object.keys(feedback.pairs || {}).length) updateFeedback(data.feedback);
    return fresh.length;
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
  } else {
    screen = (
      <ProfileScreen
        items={items}
        outfits={outfits}
        log={log}
        prefs={prefs}
        onChangePrefs={changePrefs}
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
  tabText: { fontSize: 11, fontWeight: '600', marginTop: 2 },
});
