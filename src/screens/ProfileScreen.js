import { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Chip from '../components/Chip';
import { COLORS } from '../catalog';
import { AESTHETICS, SOURCES } from '../aesthetics';
import { confirm, notify } from '../dialogs';
import { pickTextFile, shareTextFile } from '../files';
import { closetInsights } from '../stylist';
import { colors, radius, serif, spacing } from '../theme';

const BOLDNESS = [
  { key: 'minimal', label: 'Minimal', sub: 'Mostly neutrals, one accent at most' },
  { key: 'some', label: 'Balanced', sub: 'Up to two accent colors' },
  { key: 'lots', label: 'Bold', sub: 'Happy to mix several colors' },
];

export default function ProfileScreen({
  items,
  outfits,
  log,
  prefs,
  onChangePrefs,
  aiKey,
  onChangeAiKey,
  buildBackup,
  onRestore,
  onLoadDemo,
  onRemoveDemo,
  onResetLearning,
  onClearAll,
}) {
  const [busy, setBusy] = useState(false);
  const [keyDraft, setKeyDraft] = useState('');
  const insights = useMemo(() => closetInsights(items, prefs), [items, prefs]);
  const hasDemo = items.some((i) => i.demo);
  const mostWorn = [...items].sort((a, b) => (b.wearCount || 0) - (a.wearCount || 0)).filter((i) => i.wearCount)[0];

  const toggleAvoid = (key) => {
    const set = new Set(prefs.avoidColors || []);
    set.has(key) ? set.delete(key) : set.add(key);
    onChangePrefs({ avoidColors: [...set] });
  };

  const backup = async () => {
    setBusy(true);
    try {
      const data = await buildBackup();
      const stamp = new Date().toISOString().slice(0, 10);
      await shareTextFile(`closet-copilot-backup-${stamp}.json`, JSON.stringify(data), 'application/json');
    } catch (e) {
      notify('Backup failed', e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    try {
      const f = await pickTextFile();
      if (!f) return;
      setBusy(true);
      const data = JSON.parse(f.text);
      if (data.app !== 'closet-copilot') throw new Error('That file is not a Closet Copilot backup.');
      const n = await onRestore(data);
      notify('Restored', `Added ${n} piece${n === 1 ? '' : 's'} to your closet.`);
    } catch (e) {
      notify('Restore failed', e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.stats}>
        <Stat value={items.length} label="Pieces" />
        <Stat value={outfits.length} label="Saved looks" />
        <Stat value={log.length} label="Times dressed" />
      </View>
      {mostWorn && <Text style={styles.note}>Most worn: {mostWorn.name} ({mostWorn.wearCount}×)</Text>}

      <Text style={styles.section}>Stylist notes</Text>
      <View style={styles.card}>
        {insights.length ? (
          insights.map((x, i) => (
            <Text key={i} style={styles.insight}>
              {x.kind === 'gap' ? '◇ ' : x.kind === 'color' ? '◆ ' : '• '}
              {x.text}
            </Text>
          ))
        ) : (
          <Text style={styles.insight}>Your closet covers every occasion. Nice.</Text>
        )}
      </View>

      <Text style={styles.section}>Your style</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Color</Text>
        {BOLDNESS.map((b) => (
          <Pressable key={b.key} style={styles.option} onPress={() => onChangePrefs({ boldness: b.key })}>
            <View style={[styles.radio, prefs.boldness === b.key && styles.radioOn]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.optTitle}>{b.label}</Text>
              <Text style={styles.optSub}>{b.sub}</Text>
            </View>
          </Pressable>
        ))}

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Colors to avoid</Text>
        <View style={styles.wrap}>
          {COLORS.filter((c) => c.key !== 'multi').map((c) => (
            <Chip key={c.key} small label={c.label} on={(prefs.avoidColors || []).includes(c.key)} onPress={() => toggleAvoid(c.key)} />
          ))}
        </View>
        <Pressable onPress={onResetLearning}>
          <Text style={styles.link}>Reset what the stylist has learned from your likes</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>AI auto-fill (free)</Text>
      <View style={styles.card}>
        {aiKey ? (
          <>
            <Text style={styles.body}>
              <Text style={{ fontWeight: '700', color: colors.good }}>On.</Text> When you add a photo, Google Gemini fills in
              the type, color, pattern, dressiness, warmth, logos and vibes — on Google’s free tier, so it costs nothing.
            </Text>
            <Text style={styles.keyMask}>Key: {aiKey.slice(0, 8)}…{aiKey.slice(-4)}</Text>
            <Pressable onPress={() => onChangeAiKey('')}>
              <Text style={[styles.link, { color: colors.danger }]}>Turn off and remove key</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.body}>
              Have AI fill in each piece from its photos, free. You need a free Gemini API key from Google (no credit
              card):
            </Text>
            <Text style={styles.step}>1. Open aistudio.google.com/apikey and sign in with any Google account.</Text>
            <Text style={styles.step}>2. Tap “Create API key” (accept the terms if asked).</Text>
            <Text style={styles.step}>3. Copy the key — it starts with “AIza” — and paste it below.</Text>
            <Pressable onPress={() => Linking.openURL('https://aistudio.google.com/apikey')}>
              <Text style={styles.link}>Open aistudio.google.com/apikey</Text>
            </Pressable>
            <TextInput
              value={keyDraft}
              onChangeText={setKeyDraft}
              placeholder="AIza…"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              style={styles.keyInput}
            />
            <Pressable
              style={styles.keyBtn}
              onPress={() => {
                const k = keyDraft.trim();
                if (k.length < 20 || /\s/.test(k)) return notify('That doesn’t look like a key', 'Gemini API keys are one long string starting with “AIza”.');
                onChangeAiKey(k);
                setKeyDraft('');
                notify('AI auto-fill is on', 'Add a piece with a photo to try it.');
              }}
            >
              <Text style={styles.keyBtnText}>Turn on AI auto-fill</Text>
            </Pressable>
          </>
        )}
        <Text style={styles.small}>
          Free tier: a daily allowance that resets overnight — plenty for adding clothes. On the free tier Google may use
          what’s sent to improve its products, so only clothing photos are sent, and only when a piece is auto-filled.
          Your key stays on this phone and is never included in backups.
        </Text>
      </View>

      <Text style={styles.section}>How the stylist works</Text>
      <View style={styles.card}>
        <Text style={styles.body}>
          Every suggestion is built only from your closet and scored on: matching dressiness to the occasion; color
          theory (neutrals plus one or two accents, classic pairings like navy and khaki, avoiding clashes, light–dark
          contrast, tonal looks); pattern mixing (one bold pattern, anchored by solids); the style vibe you pick (old money, streetwear and more —
          each with its own pieces, palette and signature pairings); dressing for the temperature and
          rain; keeping things varied (pieces worn in the last few days rank lower); and your taste — every Wear, Save
          and Not-for-me teaches it which pieces and colors you like together. It all runs on your phone.
        </Text>
      </View>

      <Text style={styles.section}>Sources & credits</Text>
      <View style={styles.card}>
        <Text style={styles.body}>
          Style vibes combine two public references. Rules a vibe’s source lists count fully; common conventions added on
          top count less.
        </Text>
        {SOURCES.map((src) => (
          <Pressable key={src.name} onPress={() => Linking.openURL(src.url)} style={{ marginTop: spacing.md }}>
            <Text style={styles.link}>{src.name}</Text>
            <Text style={styles.small}>
              {src.used}. {src.license}.
            </Text>
          </Pressable>
        ))}
        <Text style={[styles.label, { marginTop: spacing.lg }]}>Per vibe</Text>
        {AESTHETICS.map((a) => (
          <Text key={a.key} style={styles.small}>
            {a.label}: {a.source ? a.source.name.replace('Aesthetics Wiki — ', 'Aesthetics Wiki “') + '”' : 'general convention (no wiki page)'}
          </Text>
        ))}
      </View>

      <Text style={styles.section}>Your data</Text>
      <View style={styles.card}>
        <Row title="Back up closet" sub="Photos, pieces, looks and preferences in one file." onPress={backup} />
        <Row title="Restore from backup" sub="Adds anything missing; nothing is overwritten." onPress={restore} />
        {hasDemo ? (
          <Row title="Remove sample pieces" sub="Deletes the demo items, keeps your own." onPress={onRemoveDemo} />
        ) : (
          <Row title="Load sample closet" sub="28 demo pieces to try the stylist and vibes." onPress={onLoadDemo} />
        )}
        <Row
          title="Delete everything"
          danger
          last
          onPress={async () => {
            if (await confirm('Delete everything?', 'Removes all pieces, photos, looks and history from this phone.', { confirmText: 'Delete', destructive: true })) onClearAll();
          }}
        />
      </View>
      <Text style={styles.note}>
        Everything is stored only on this {Platform.OS === 'web' ? 'phone (in the home-screen app)' : 'device'}. Back up now
        and then — save the file to iCloud Drive.
      </Text>

      {busy && (
        <View style={styles.busy}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}
    </ScrollView>
  );
}

function Stat({ value, label }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Row({ title, sub, onPress, danger, last }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && { opacity: 0.6 }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, danger && { color: colors.danger }]}>{title}</Text>
        {!!sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      <Text style={styles.chev}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: 120 },
  title: { ...serif, color: colors.text, fontSize: 32, marginBottom: spacing.md },
  stats: { flexDirection: 'row', marginBottom: spacing.sm },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginRight: spacing.sm },
  statValue: { ...serif, color: colors.text, fontSize: 24 },
  statLabel: { color: colors.muted, fontSize: 12, marginTop: 2 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 17, marginBottom: spacing.md },
  section: { ...serif, color: colors.text, fontSize: 20, marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm },
  insight: { color: colors.text, fontSize: 14, lineHeight: 20, marginBottom: spacing.sm },
  label: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: spacing.sm },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, marginRight: spacing.md },
  radioOn: { borderColor: colors.accent, backgroundColor: colors.accent },
  optTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  optSub: { color: colors.muted, fontSize: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  link: { color: colors.accent, fontSize: 13, fontWeight: '600', marginTop: spacing.sm },
  body: { color: colors.text, fontSize: 14, lineHeight: 21 },
  step: { color: colors.text, fontSize: 14, lineHeight: 20, marginTop: spacing.sm },
  keyInput: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    marginTop: spacing.md,
  },
  keyBtn: { backgroundColor: colors.text, borderRadius: 999, paddingVertical: 11, alignItems: 'center', marginTop: spacing.sm },
  keyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  keyMask: { color: colors.muted, fontSize: 13, marginTop: spacing.sm, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  small: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  rowSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  chev: { color: colors.muted, fontSize: 22, marginLeft: spacing.sm },
  busy: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
