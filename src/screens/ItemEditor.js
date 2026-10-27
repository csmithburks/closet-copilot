import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Chip from '../components/Chip';
import ItemThumb from '../components/ItemThumb';
import { CATEGORIES, COLORS, COLOR_BY_KEY, DETAILS, FITS, FORMALITY_LABELS, MATERIALS, PATTERNS, TYPES, WARMTH_LABELS, typesFor } from '../catalog';
import { confirm, notify } from '../dialogs';
import { AESTHETICS } from '../aesthetics';
import { autoTag } from '../ai';
import { pickPhoto } from '../photo';
import { colors, radius, serif, spacing } from '../theme';

const blank = () => ({
  id: null,
  name: '',
  cat: 'top',
  type: 'tshirt',
  color: 'white',
  pattern: 'solid',
  formality: TYPES.tshirt.formality,
  warmth: TYPES.tshirt.warmth,
  favorite: false,
  wearCount: 0,
  lastWorn: null,
  hasPhoto: false,
  hasBack: false,
  graphic: false,
  styles: [],
  material: null,
  fit: null,
  details: [],
});

// item: existing item to edit, or null to add a new one.
export default function ItemEditor({ visible, item, imageUri, backUri, aiKey, onSave, onDelete, onStyle, onClose }) {
  const [draft, setDraft] = useState(blank());
  const [photo, setPhoto] = useState(null);
  const [back, setBack] = useState(null);
  const [detected, setDetected] = useState(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState(null);

  useEffect(() => {
    if (!visible) return;
    setDraft(item ? { styles: [], details: [], ...item } : blank());
    setPhoto(item ? imageUri || null : null);
    setBack(item ? backUri || null : null);
    setDetected(null);
    setAiNote(null);
    setAiBusy(false);
  }, [visible, item, imageUri, backUri]);

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const chooseType = (type) => {
    const t = TYPES[type];
    set({ type, cat: t.cat, formality: t.formality, warmth: t.warmth });
  };

  const chooseCat = (cat) => {
    if (cat === draft.cat) return;
    chooseType(typesFor(cat)[0].key);
  };

  const runAi = async (front, backPhoto) => {
    if (!aiKey || !front) return;
    setAiBusy(true);
    setAiNote(null);
    try {
      const tags = await autoTag({ apiKey: aiKey, front, back: backPhoto });
      const { note, ...fields } = tags;
      setDraft((d) => ({ ...d, ...fields, name: d.name.trim() ? d.name : fields.name || d.name }));
      setDetected(null);
      setAiNote(`✨ Filled in by AI${note ? ` — ${note}` : ''}. Check and adjust anything that’s off.`);
    } catch (e) {
      setAiNote(`AI auto-fill didn’t work: ${e.message}`);
    } finally {
      setAiBusy(false);
    }
  };

  const addPhoto = async (side, source) => {
    const res = await pickPhoto(source);
    if (!res) return;
    if (side === 'back') {
      setBack(res.uri);
      // Re-run with both sides so a graphic on the back is caught.
      if (aiKey && photo) runAi(photo, res.uri);
      return;
    }
    setPhoto(res.uri);
    if (aiKey) runAi(res.uri, back);
    else if (res.color) {
      setDetected(res.color);
      set({ color: res.color });
    }
  };

  const save = () => {
    const name = draft.name.trim() || `${COLOR_BY_KEY[draft.color]?.label || ''} ${TYPES[draft.type]?.label || ''}`.trim();
    if (!name) return notify('Add a name', 'Give this piece a name.');
    const frontChange = photo !== (item ? imageUri || null : null) ? photo : undefined;
    const backChange = back !== (item ? backUri || null : null) ? back : undefined;
    onSave({ ...draft, name, hasPhoto: !!photo, hasBack: !!back }, frontChange, backChange);
  };

  const toggleDetail = (key) =>
    setDraft((d) => {
      const list = d.details || [];
      return { ...d, details: list.includes(key) ? list.filter((k) => k !== key) : [...list, key] };
    });

  const toggleVibe = (key) =>
    setDraft((d) => {
      const list = d.styles || [];
      return { ...d, styles: list.includes(key) ? list.filter((k) => k !== key) : [...list, key] };
    });

  const remove = async () => {
    if (await confirm('Remove from closet?', draft.name, { confirmText: 'Remove', destructive: true })) onDelete(draft.id);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>{item ? 'Edit piece' : 'Add a piece'}</Text>
          <Pressable onPress={save} hitSlop={12}>
            <Text style={styles.save}>Save</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.photoRow}>
            {[
              ['front', 'Front', photo, setPhoto],
              ['back', 'Back (optional)', back, setBack],
            ].map(([side, label, uri, setUri]) => (
              <View key={side} style={styles.slot}>
                <Text style={styles.slotLabel}>{label}</Text>
                {uri ? (
                  <ItemThumb item={draft} uri={uri} size={120} />
                ) : (
                  <View style={styles.emptySlot}>
                    <Text style={styles.emptySlotText}>{side === 'front' ? 'No photo yet' : 'Add if there’s a print or logo on the back'}</Text>
                  </View>
                )}
                <View style={styles.slotBtns}>
                  <Pressable style={styles.slotBtn} onPress={() => addPhoto(side, 'camera')}>
                    <Text style={styles.slotBtnText}>📷</Text>
                  </Pressable>
                  <Pressable style={styles.slotBtn} onPress={() => addPhoto(side, 'library')}>
                    <Text style={styles.slotBtnText}>🖼</Text>
                  </Pressable>
                  {!!uri && (
                    <Pressable style={styles.slotBtn} onPress={() => setUri(null)}>
                      <Text style={[styles.slotBtnText, { color: colors.danger }]}>✕</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
          </View>

          {aiKey ? (
            <Pressable
              style={[styles.aiBtn, (!photo || aiBusy) && { opacity: 0.5 }]}
              disabled={!photo || aiBusy}
              onPress={() => runAi(photo, back)}
            >
              {aiBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.aiBtnText}>✨ Auto-fill from photos</Text>}
            </Pressable>
          ) : (
            <Text style={styles.photoHint}>
              Tip: lay it flat on a plain background. Turn on AI auto-fill in Profile to have everything below filled in
              from the photo.
            </Text>
          )}
          {!!aiNote && <Text style={[styles.aiNote, aiNote.startsWith('AI') && { color: colors.danger }]}>{aiNote}</Text>}

          <TextInput
            value={draft.name}
            onChangeText={(name) => set({ name })}
            placeholder={`Name (e.g. ${COLOR_BY_KEY[draft.color]?.label} ${TYPES[draft.type]?.label})`}
            placeholderTextColor={colors.muted}
            style={styles.nameInput}
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.wrap}>
            {CATEGORIES.map((c) => (
              <Chip key={c.key} label={c.label} on={draft.cat === c.key} onPress={() => chooseCat(c.key)} small />
            ))}
          </View>

          <Text style={styles.label}>Type</Text>
          <View style={styles.wrap}>
            {typesFor(draft.cat).map((t) => (
              <Chip key={t.key} label={t.label} on={draft.type === t.key} onPress={() => chooseType(t.key)} small />
            ))}
          </View>

          <Text style={styles.label}>
            Main color{detected ? <Text style={styles.detected}>  · detected from photo, tap to change</Text> : null}
          </Text>
          <View style={styles.wrap}>
            {COLORS.map((c) => (
              <Pressable key={c.key} onPress={() => set({ color: c.key })} style={styles.swatchWrap}>
                <View
                  style={[
                    styles.swatch,
                    { backgroundColor: c.key === 'multi' ? '#B9A88F' : c.hex },
                    draft.color === c.key && styles.swatchOn,
                  ]}
                >
                  {c.key === 'multi' && <Text style={styles.multi}>✱</Text>}
                </View>
                <Text style={[styles.swatchLabel, draft.color === c.key && { color: colors.text, fontWeight: '700' }]} numberOfLines={1}>
                  {c.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Pattern</Text>
          <View style={styles.wrap}>
            {PATTERNS.map((p) => (
              <Chip key={p.key} label={p.label} on={draft.pattern === p.key} onPress={() => set({ pattern: p.key })} small />
            ))}
          </View>

          <Text style={styles.label}>
            Fabric <Text style={styles.optional}>optional</Text>
          </Text>
          <View style={styles.wrap}>
            {MATERIALS.map((m) => (
              <Chip key={m.key} label={m.label} on={draft.material === m.key} onPress={() => set({ material: draft.material === m.key ? null : m.key })} small />
            ))}
          </View>

          <Text style={styles.label}>
            Fit <Text style={styles.optional}>optional</Text>
          </Text>
          <View style={styles.wrap}>
            {FITS.map((f) => (
              <Chip key={f.key} label={f.label} on={draft.fit === f.key} onPress={() => set({ fit: draft.fit === f.key ? null : f.key })} small />
            ))}
          </View>

          <Text style={styles.label}>
            Details <Text style={styles.optional}>optional</Text>
          </Text>
          <View style={styles.wrap}>
            {DETAILS.map((d) => (
              <Chip key={d.key} label={d.label} on={(draft.details || []).includes(d.key)} onPress={() => toggleDetail(d.key)} small />
            ))}
          </View>

          <Text style={styles.label}>Dressiness</Text>
          <View style={styles.wrap}>
            {[1, 2, 3, 4, 5].map((f) => (
              <Chip key={f} label={FORMALITY_LABELS[f]} on={draft.formality === f} onPress={() => set({ formality: f })} small />
            ))}
          </View>

          <Text style={styles.label}>Warmth</Text>
          <View style={styles.wrap}>
            {WARMTH_LABELS.map((w, i) => (
              <Chip key={w} label={w} on={draft.warmth === i} onPress={() => set({ warmth: i })} small />
            ))}
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.label}>Visible logo or graphic</Text>
            <Switch value={!!draft.graphic} onValueChange={(v) => set({ graphic: v })} />
          </View>

          <Text style={styles.label}>Fits these vibes</Text>
          <View style={styles.wrap}>
            {AESTHETICS.map((a) => (
              <Chip key={a.key} label={a.label} on={(draft.styles || []).includes(a.key)} onPress={() => toggleVibe(a.key)} small />
            ))}
          </View>

          <Pressable style={styles.favRow} onPress={() => set({ favorite: !draft.favorite })}>
            <Text style={styles.favText}>{draft.favorite ? '★ Favorite' : '☆ Mark as favorite'}</Text>
          </Pressable>

          {item && (
            <View style={styles.footer}>
              <Text style={styles.stat}>
                Worn {draft.wearCount || 0} time{draft.wearCount === 1 ? '' : 's'}
                {draft.lastWorn ? ` · last ${new Date(draft.lastWorn).toLocaleDateString()}` : ''}
              </Text>
              <Pressable style={styles.styleBtn} onPress={() => onStyle(item)}>
                <Text style={styles.styleBtnText}>✨ Style this piece</Text>
              </Pressable>
              <Pressable onPress={remove} style={{ padding: spacing.md }}>
                <Text style={styles.delete}>Remove from closet</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  cancel: { color: colors.muted, fontSize: 16 },
  save: { color: colors.accent, fontSize: 16, fontWeight: '800' },
  title: { ...serif, color: colors.text, fontSize: 18 },
  scroll: { padding: spacing.lg, paddingBottom: 80 },
  photoRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.md },
  slot: { alignItems: 'center', width: 140 },
  slotLabel: { color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  emptySlot: {
    width: 120,
    height: 150,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  emptySlotText: { color: colors.muted, fontSize: 11, textAlign: 'center' },
  slotBtns: { flexDirection: 'row', marginTop: 6 },
  slotBtn: {
    backgroundColor: colors.card,
    borderRadius: 999,
    width: 38,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  slotBtnText: { fontSize: 16 },
  aiBtn: { backgroundColor: colors.accent, borderRadius: 999, paddingVertical: 12, alignItems: 'center', marginBottom: spacing.sm },
  aiBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  aiNote: { color: colors.good, fontSize: 13, lineHeight: 18, marginBottom: spacing.md },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  photoBtns: { flex: 1, marginLeft: spacing.lg, justifyContent: 'center' },
  photoBtn: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  photoBtnText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  removePhoto: { color: colors.danger, fontSize: 13, marginBottom: spacing.sm },
  photoHint: { color: colors.muted, fontSize: 12, lineHeight: 16, marginBottom: spacing.md, textAlign: 'center' },
  nameInput: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  label: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: spacing.sm },
  optional: { color: colors.muted, fontSize: 12, fontWeight: '400' },
  detected: { color: colors.good, fontSize: 12, fontWeight: '600' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
  swatchWrap: { width: '20%', alignItems: 'center', marginBottom: spacing.sm },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchOn: { borderWidth: 3, borderColor: colors.accent },
  multi: { color: '#fff', fontWeight: '800' },
  swatchLabel: { color: colors.muted, fontSize: 10, marginTop: 3 },
  favRow: { paddingVertical: spacing.md },
  favText: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  footer: { marginTop: spacing.lg, alignItems: 'center' },
  stat: { color: colors.muted, fontSize: 13, marginBottom: spacing.md },
  styleBtn: { backgroundColor: colors.text, borderRadius: 999, paddingVertical: 12, paddingHorizontal: 24 },
  styleBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  delete: { color: colors.danger, fontSize: 15, fontWeight: '600' },
});
