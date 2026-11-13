import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Chip from '../components/Chip';
import DateField from '../components/DateField';
import { addDays, daysBetween, isDate, today } from '../dates';
import { notify } from '../dialogs';
import { ACTIVITY_BY_KEY, BAGS, BASE_ACTIVITIES } from '../trip';
import { placeLabel, searchPlaces } from '../tripWeather';
import { colors, radius, serif, spacing } from '../theme';

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const MAX_DAYS = 30;

const blank = () => {
  const start = addDays(today(), 7);
  return {
    stops: [{ id: uid(), place: null, start, end: addDays(start, 3) }],
    base: 'casual',
    dinners: true,
    workouts: false,
    beach: false,
    international: false,
    bag: 'carryon',
  };
};

// trip: existing trip to edit, or null to plan a new one.
export default function TripEditor({ visible, trip, onSave, onClose }) {
  const [draft, setDraft] = useState(blank());

  useEffect(() => {
    if (visible) setDraft(trip ? { ...trip, stops: trip.stops.map((s) => ({ ...s })) } : blank());
  }, [visible, trip]);

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const setStop = (id, patch) => setDraft((d) => ({ ...d, stops: d.stops.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));

  const addStop = () =>
    setDraft((d) => {
      const last = d.stops[d.stops.length - 1];
      const start = isDate(last.end) ? last.end : today();
      return { ...d, stops: [...d.stops, { id: uid(), place: null, start, end: addDays(start, 2) }] };
    });

  const save = () => {
    for (const s of draft.stops) {
      if (!s.place) return notify('Where to?', 'Search for each destination and pick it from the list.');
      if (!isDate(s.start) || !isDate(s.end)) return notify('Check the dates', 'Each stop needs an arrival and a departure date.');
      if (s.end < s.start) return notify('Check the dates', `You leave ${s.place.name} before you arrive.`);
    }
    const stops = [...draft.stops].sort((a, b) => (a.start < b.start ? -1 : 1));
    if (daysBetween(stops[0].start, stops[stops.length - 1].end) + 1 > MAX_DAYS) {
      return notify('That’s a long trip', `The planner handles trips up to ${MAX_DAYS} days.`);
    }
    onSave({ ...draft, stops });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>{trip ? 'Edit trip' : 'Plan a trip'}</Text>
          <Pressable onPress={save} hitSlop={12}>
            <Text style={styles.save}>{trip ? 'Save' : 'Plan it'}</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {draft.stops.map((s, i) => (
            <View key={s.id} style={styles.stop}>
              <View style={styles.stopHead}>
                <Text style={styles.label}>{draft.stops.length > 1 ? `Stop ${i + 1}` : 'Where to?'}</Text>
                {draft.stops.length > 1 && (
                  <Pressable hitSlop={10} onPress={() => setDraft((d) => ({ ...d, stops: d.stops.filter((x) => x.id !== s.id) }))}>
                    <Text style={styles.removeStop}>Remove</Text>
                  </Pressable>
                )}
              </View>
              <PlaceField place={s.place} onChange={(place) => setStop(s.id, { place })} />
              <View style={styles.dates}>
                <View style={styles.dateCol}>
                  <Text style={styles.small}>Arrive</Text>
                  <DateField
                    value={s.start}
                    onChange={(start) => setStop(s.id, { start, end: isDate(start) && isDate(s.end) && s.end < start ? start : s.end })}
                  />
                </View>
                <View style={[styles.dateCol, { marginLeft: spacing.md }]}>
                  <Text style={styles.small}>Leave</Text>
                  <DateField value={s.end} min={s.start} onChange={(end) => setStop(s.id, { end })} />
                </View>
              </View>
            </View>
          ))}
          <Pressable onPress={addStop} style={{ marginBottom: spacing.lg }}>
            <Text style={styles.link}>＋ Add another stop</Text>
          </Pressable>

          <Text style={styles.label}>Most days are</Text>
          <View style={styles.wrap}>
            {BASE_ACTIVITIES.map((k) => (
              <Chip key={k} small label={ACTIVITY_BY_KEY[k].label} on={draft.base === k} onPress={() => set({ base: k })} />
            ))}
          </View>

          <Toggle label="Dinner out most nights" sub="Adds an evening look each night" value={draft.dinners} onChange={(v) => set({ dinners: v })} />
          <Toggle label="Workouts" sub="Gym kit every other day" value={draft.workouts} onChange={(v) => set({ workouts: v })} />
          <Toggle label="Beach or pool" sub="Adds swimwear and sun kit to the list" value={draft.beach} onChange={(v) => set({ beach: v })} />
          <Toggle label="International" sub="Adds passport and plug adapter" value={draft.international} onChange={(v) => set({ international: v })} />
          <Text style={styles.hint}>You can change what’s planned on any single day afterwards.</Text>

          <Text style={[styles.label, { marginTop: spacing.lg }]}>Bag</Text>
          {BAGS.map((b) => (
            <Pressable key={b.key} style={styles.option} onPress={() => set({ bag: b.key })}>
              <View style={[styles.radio, draft.bag === b.key && styles.radioOn]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.optTitle}>{b.label}</Text>
                <Text style={styles.optSub}>{b.sub}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// Destination search (Open-Meteo geocoding — free, no account).
function PlaceField({ place, onChange }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const seq = useRef(0);

  useEffect(() => {
    const text = q.trim();
    if (text.length < 2) {
      setResults(null);
      setError(null);
      return undefined;
    }
    const mine = ++seq.current;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await searchPlaces(text);
        if (mine !== seq.current) return;
        setResults(r);
        setError(null);
      } catch {
        if (mine !== seq.current) return;
        setResults(null);
        setError('Couldn’t search right now — check your connection and try again.');
      } finally {
        if (mine === seq.current) setBusy(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [q]);

  if (place) {
    return (
      <View style={styles.place}>
        <Text style={styles.placeText} numberOfLines={1}>
          📍 {placeLabel(place)}
        </Text>
        <Pressable hitSlop={10} onPress={() => onChange(null)}>
          <Text style={styles.link}>Change</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <View>
      <View style={styles.searchRow}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="City or town"
          placeholderTextColor={colors.muted}
          autoCorrect={false}
          style={styles.search}
        />
        {busy && <ActivityIndicator color={colors.accent} size="small" style={{ marginRight: spacing.md }} />}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {results && !results.length && !busy && <Text style={styles.hint}>No places found — try the nearest city.</Text>}
      {(results || []).map((p) => (
        <Pressable
          key={`${p.lat},${p.lon}`}
          style={styles.result}
          onPress={() => {
            onChange(p);
            setQ('');
            setResults(null);
          }}
        >
          <Text style={styles.resultName}>{p.name}</Text>
          <Text style={styles.resultSub}>{[p.region, p.country].filter(Boolean).join(', ')}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Toggle({ label, sub, value, onChange }) {
  return (
    <View style={styles.toggle}>
      <View style={{ flex: 1 }}>
        <Text style={styles.optTitle}>{label}</Text>
        <Text style={styles.optSub}>{sub}</Text>
      </View>
      <Switch value={!!value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  cancel: { color: colors.muted, fontSize: 16 },
  save: { color: colors.accent, fontSize: 16, fontWeight: '800' },
  title: { ...serif, color: colors.text, fontSize: 18 },
  scroll: { padding: spacing.lg, paddingBottom: 80 },
  stop: { backgroundColor: colors.cardAlt, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  stopHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  removeStop: { color: colors.danger, fontSize: 13, fontWeight: '600', marginBottom: spacing.sm },
  label: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: spacing.sm },
  small: { color: colors.muted, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  dates: { flexDirection: 'row', marginTop: spacing.md },
  dateCol: { flex: 1, minWidth: 0 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm },
  link: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: spacing.sm },
  error: { color: colors.danger, fontSize: 12, lineHeight: 17, marginTop: spacing.sm },
  place: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 46,
  },
  placeText: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '600', marginRight: spacing.sm },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md },
  search: { flex: 1, height: 46, paddingHorizontal: spacing.md, fontSize: 16, color: colors.text },
  result: { paddingVertical: 10, paddingHorizontal: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  resultName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  resultSub: { color: colors.muted, fontSize: 12, marginTop: 1 },
  toggle: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, marginRight: spacing.md },
  radioOn: { borderColor: colors.accent, backgroundColor: colors.accent },
  optTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  optSub: { color: colors.muted, fontSize: 12 },
});
