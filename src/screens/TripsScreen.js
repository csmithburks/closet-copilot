import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import Chip from '../components/Chip';
import ItemThumb from '../components/ItemThumb';
import OutfitCard, { CardAction } from '../components/OutfitCard';
import TripEditor from './TripEditor';
import { CATEGORIES } from '../catalog';
import { formatDay, formatSpan, today } from '../dates';
import { confirm, notify } from '../dialogs';
import { typeOf } from '../stylist';
import { ACTIVITIES, BAGS, essentials, packingText, picksOf, planTrip, tripDays, wearInTransit } from '../trip';
import { tripWeather } from '../tripWeather';
import { colors, radius, serif, spacing } from '../theme';

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const STALE = 6 * 3600 * 1000;
const stopKey = (s) => `${s.place.lat},${s.place.lon},${s.start},${s.end}`;
export const tripTitle = (trip) => trip.stops.map((s) => s.place.name).join(' → ');
const tripSpan = (trip) => formatSpan(trip.stops[0].start, trip.stops[trip.stops.length - 1].end);
const wxIcon = (w) => (w.snow ? '❄' : w.rain ? '☂' : w.rainChance >= 30 ? '☁' : '☀');

export default function TripsScreen({ items, images, prefs, feedback, trips, onSaveTrip, onUpdateTrip, onDeleteTrip, onOpenItem, onSaveLook }) {
  const [openId, setOpenId] = useState(null);
  const [editing, setEditing] = useState(null); // trip | 'new' | null
  const open = trips.find((t) => t.id === openId);

  const editor = (
    <TripEditor
      visible={!!editing}
      trip={editing === 'new' ? null : editing}
      onClose={() => setEditing(null)}
      onSave={(t) => {
        const old = t.id && trips.find((x) => x.id === t.id);
        // A different bag size means re-planning from scratch.
        if (old && old.bag !== t.bag) t = { ...t, picks: {}, avoid: {} };
        const saved = t.id ? t : { ...t, id: uid(), createdAt: Date.now(), plan: {}, avoid: {}, packed: {}, extras: [], weather: {}, picks: {} };
        onSaveTrip(saved);
        setEditing(null);
        setOpenId(saved.id);
      }}
    />
  );

  if (open) {
    return (
      <View style={{ flex: 1 }}>
        <TripDetail
          trip={open}
          items={items}
          images={images}
          prefs={prefs}
          feedback={feedback}
          onBack={() => setOpenId(null)}
          onEdit={() => setEditing(open)}
          onUpdate={(fn) => onUpdateTrip(open.id, fn)}
          onDelete={async () => {
            if (await confirm('Delete this trip?', tripTitle(open), { confirmText: 'Delete', destructive: true })) {
              setOpenId(null);
              onDeleteTrip(open.id);
            }
          }}
          onOpenItem={onOpenItem}
          onSaveLook={onSaveLook}
        />
        {editor}
      </View>
    );
  }

  const t = today();
  const sorted = [...trips].sort((a, b) => (a.stops[0].start < b.stops[0].start ? -1 : 1));
  const upcoming = sorted.filter((x) => x.stops[x.stops.length - 1].end >= t);
  const past = sorted.filter((x) => x.stops[x.stops.length - 1].end < t).reverse();

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Trips</Text>
        <Text style={styles.sub}>Outfits for each day’s weather and plans, and a packing list that keeps the bag light.</Text>
        <Pressable style={styles.cta} onPress={() => setEditing('new')}>
          <Text style={styles.ctaText}>＋ Plan a trip</Text>
        </Pressable>
        {!trips.length && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Pick where you’re going and when. The planner pulls the forecast for each day, builds outfits from your closet,
              and re-uses pieces so you pack less.
            </Text>
          </View>
        )}
        {[...upcoming, ...past].map((trip) => {
          const days = tripDays(trip);
          const wx = days.map((d) => d.weather).filter(Boolean);
          const isPast = trip.stops[trip.stops.length - 1].end < t;
          return (
            <Pressable key={trip.id} style={[styles.card, isPast && { opacity: 0.6 }]} onPress={() => setOpenId(trip.id)}>
              <Text style={styles.cardTitle}>{tripTitle(trip)}</Text>
              <Text style={styles.cardSub}>
                {tripSpan(trip)} · {days.length} day{days.length === 1 ? '' : 's'}
                {wx.length ? ` · ${Math.min(...wx.map((w) => w.low))}°–${Math.max(...wx.map((w) => w.high))}°` : ''}
                {wx.some((w) => w.rain) ? ' · ☂' : ''}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {editor}
    </View>
  );
}

function TripDetail({ trip, items, images, prefs, feedback, onBack, onEdit, onUpdate, onDelete, onOpenItem, onSaveLook }) {
  const [tab, setTab] = useState('outfits');
  const [loadingWx, setLoadingWx] = useState(false);
  const [wxError, setWxError] = useState(false);
  const [extra, setExtra] = useState('');
  const busy = useRef(false);

  // Get (or refresh) the weather for each stop.
  const refreshWeather = async (force) => {
    if (busy.current) return;
    const t = today();
    const need = trip.stops.filter((s) => {
      const w = trip.weather?.[s.id];
      if (force || !w || w.key !== stopKey(s) || !w.days?.length) return true;
      return s.end >= t && Date.now() - w.fetchedAt > STALE;
    });
    if (!need.length) return;
    busy.current = true;
    setLoadingWx(true);
    setWxError(false);
    const got = {};
    let failed = false;
    await Promise.all(
      need.map(async (s) => {
        try {
          const days = await tripWeather({ lat: s.place.lat, lon: s.place.lon, start: s.start, end: s.end });
          if (days.length) got[s.id] = { days, fetchedAt: Date.now(), key: stopKey(s) };
          else failed = true;
        } catch {
          failed = true;
        }
      })
    );
    busy.current = false;
    setLoadingWx(false);
    setWxError(failed);
    if (Object.keys(got).length) onUpdate((tr) => ({ ...tr, weather: { ...(tr.weather || {}), ...got } }));
  };
  const stopsKey = trip.stops.map(stopKey).join('|');
  useEffect(() => {
    refreshWeather(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.id, stopsKey]);

  // Keyed on what affects the plan, so ticking off the packing list doesn't re-plan.
  const days = useMemo(
    () => tripDays(trip),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trip.stops, trip.plan, trip.weather, trip.base, trip.dinners, trip.workouts]
  );
  const plan = useMemo(
    () => planTrip({ items, days, prefs, feedback, bag: trip.bag, avoid: trip.avoid || {}, keep: trip.picks || {} }),
    [items, days, prefs, feedback, trip.bag, trip.avoid, trip.picks]
  );
  // Remember the outfits it settled on, so the plan (and the packing list)
  // stays put while you pack instead of reshuffling as your closet changes.
  useEffect(() => {
    const picks = picksOf(plan);
    if (JSON.stringify(picks) !== JSON.stringify(trip.picks || {})) onUpdate((tr) => ({ ...tr, picks }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);
  const needs = useMemo(() => essentials({ days, plan, trip, items }), [days, plan, trip, items]);
  const transit = wearInTransit(plan);
  const anyTypical = days.some((d) => d.weather?.source === 'typical');
  const noWeather = days.some((d) => !d.weather);

  const packed = trip.packed || {};
  const extras = trip.extras || [];
  const keys = [...plan.pack.map((p) => `i:${p.item.id}`), ...needs.map((e) => `e:${e.key}`), ...extras.map((e) => `x:${e.id}`)];
  const done = keys.filter((k) => packed[k]).length;
  const toggle = (key) => onUpdate((tr) => ({ ...tr, packed: { ...(tr.packed || {}), [key]: !tr.packed?.[key] } }));

  const toggleAgenda = (day, key) =>
    onUpdate((tr) => {
      const next = day.agenda.includes(key) ? day.agenda.filter((k) => k !== key) : ACTIVITIES.map((a) => a.key).filter((k) => k === key || day.agenda.includes(k));
      return { ...tr, plan: { ...(tr.plan || {}), [day.date]: next } };
    });

  const swap = (look) =>
    onUpdate((tr) => {
      const seen = tr.avoid?.[look.slot] || [];
      // Out of alternatives: start the cycle again.
      const next = look.options <= 1 ? [look.outfit.signature] : [...seen, look.outfit.signature];
      return { ...tr, avoid: { ...(tr.avoid || {}), [look.slot]: next } };
    });

  const share = async () => {
    const message = packingText({ title: `${tripTitle(trip)} · ${tripSpan(trip)}`, plan, extras, essentialsList: needs });
    try {
      if (Platform.OS === 'web' && !navigator.share) {
        await navigator.clipboard.writeText(message);
        notify('Copied', 'The packing list is on your clipboard.');
      } else await Share.share({ message });
    } catch {}
  };

  const addExtra = () => {
    const label = extra.trim();
    if (!label) return;
    onUpdate((tr) => ({ ...tr, extras: [...(tr.extras || []), { id: uid(), label }] }));
    setExtra('');
  };

  const Check = ({ k }) => (
    <View style={[styles.check, packed[k] && styles.checkOn]}>{packed[k] && <Text style={styles.checkMark}>✓</Text>}</View>
  );

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.topRow}>
        <Pressable onPress={onBack} hitSlop={10}>
          <Text style={styles.back}>‹ Trips</Text>
        </Pressable>
        <View style={{ flexDirection: 'row' }}>
          <Pressable onPress={onEdit} hitSlop={10}>
            <Text style={styles.topLink}>Edit</Text>
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={10}>
            <Text style={[styles.topLink, { color: colors.danger, marginLeft: spacing.lg }]}>Delete</Text>
          </Pressable>
        </View>
      </View>
      <Text style={styles.title}>{tripTitle(trip)}</Text>
      <Text style={styles.sub}>
        {tripSpan(trip)} · {days.length} day{days.length === 1 ? '' : 's'} · {BAGS.find((b) => b.key === trip.bag)?.label}
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.wxStrip}>
        {days.map((d) => (
          <View key={d.date} style={styles.wxDay}>
            <Text style={styles.wxDow}>{formatDay(d.date).slice(0, 3)}</Text>
            <Text style={styles.wxDate}>{formatDay(d.date).slice(4)}</Text>
            {d.weather ? (
              <>
                <Text style={styles.wxIcon}>{wxIcon(d.weather)}</Text>
                <Text style={styles.wxHi}>{d.weather.high}°</Text>
                <Text style={styles.wxLo}>{d.weather.low}°</Text>
              </>
            ) : (
              <Text style={styles.wxLo}>{loadingWx ? '…' : '—'}</Text>
            )}
          </View>
        ))}
      </ScrollView>
      <View style={styles.wxNoteRow}>
        {loadingWx ? (
          <ActivityIndicator color={colors.accent} size="small" />
        ) : (
          <Text style={styles.wxNote}>
            {wxError || noWeather
              ? 'Couldn’t get the weather for some days — outfits for those days ignore temperature. '
              : anyTypical
              ? 'Days more than about two weeks out show what’s typical for those dates; they switch to the real forecast as the trip gets closer. '
              : 'Live forecast. '}
            <Text style={styles.link} onPress={() => refreshWeather(true)}>
              Refresh
            </Text>
          </Text>
        )}
      </View>

      <View style={styles.tabs}>
        <Chip label={`Outfits ${plan.outfits}`} on={tab === 'outfits'} onPress={() => setTab('outfits')} />
        <Chip label={`Packing list ${done}/${keys.length}`} on={tab === 'pack'} onPress={() => setTab('pack')} />
      </View>

      {plan.gaps.map((g) => (
        <Text key={g} style={styles.gap}>
          ⚠ {g}
        </Text>
      ))}

      {tab === 'outfits' &&
        plan.days.map((d) => (
          <View key={d.date} style={{ marginBottom: spacing.md }}>
            <Text style={styles.dayTitle}>{formatDay(d.date)}</Text>
            <Text style={styles.daySub}>
              {trip.stops.length > 1 ? `${d.place.name} · ` : ''}
              {d.weather
                ? `${d.weather.high}° / ${d.weather.low}° · ${d.weather.snow ? 'snow' : `${d.weather.rainChance}% rain`}${d.weather.source === 'typical' ? ' · typical' : ''}`
                : 'no weather yet'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.xs }}>
              {ACTIVITIES.map((a) => (
                <Chip small key={a.key} label={a.label} on={d.agenda.includes(a.key)} onPress={() => toggleAgenda(d, a.key)} />
              ))}
            </ScrollView>
            {!d.looks.length && <Text style={styles.muted}>Nothing planned — tap what you’re doing this day.</Text>}
            {d.looks.map((look) =>
              look.outfit ? (
                <OutfitCard
                  key={look.slot}
                  outfit={look.outfit}
                  images={images}
                  title={look.activity.label}
                  subtitle={look.activity.time === 'indoor' ? 'Indoors' : look.tempF != null ? `Dressed for about ${look.tempF}°${d.weather?.rain ? ' and wet weather' : ''}` : null}
                  onPressItem={onOpenItem}
                  actions={
                    <>
                      <CardAction label="⟳ Swap" onPress={() => swap(look)} />
                      <CardAction label="♡ Save look" onPress={() => onSaveLook(look.outfit.items, look.activity.key) && notify('Saved', 'This look is in your Looks tab.')} />
                    </>
                  }
                />
              ) : (
                <View key={look.slot} style={styles.noLook}>
                  <Text style={styles.noLookTitle}>{look.activity.label}</Text>
                  <Text style={styles.muted}>Nothing in your closet fits this plan and weather.</Text>
                </View>
              )
            )}
          </View>
        ))}

      {tab === 'pack' && (
        <View>
          {transit.length > 0 && (
            <Text style={styles.tip}>
              ✈ Wear {transit.map((i) => i.name).join(' and ')} on travel days — {transit.length > 1 ? 'they’re' : 'it’s'} the bulkiest to pack.
            </Text>
          )}
          {!plan.pack.length && <Text style={styles.muted}>Add clothes to your closet (or plans to your days) to get a packing list.</Text>}
          {CATEGORIES.map((c) => {
            const rows = plan.pack.filter((p) => typeOf(p.item).cat === c.key);
            if (!rows.length) return null;
            return (
              <View key={c.key}>
                <Text style={styles.group}>
                  {c.label} · {rows.length}
                </Text>
                <View style={styles.listCard}>
                  {rows.map((p, i) => (
                    <Pressable key={p.item.id} style={[styles.row, i < rows.length - 1 && styles.rowBorder]} onPress={() => toggle(`i:${p.item.id}`)}>
                      <Check k={`i:${p.item.id}`} />
                      <ItemThumb item={p.item} uri={images[p.item.id]} size={36} showLabel={false} />
                      <View style={{ flex: 1, marginLeft: spacing.md }}>
                        <Text style={[styles.rowTitle, packed[`i:${p.item.id}`] && styles.struck]} numberOfLines={1}>
                          {p.item.name}
                        </Text>
                        <Text style={styles.rowSub}>
                          {p.wears} outfit{p.wears === 1 ? '' : 's'}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            );
          })}

          <Text style={styles.group}>Essentials</Text>
          <View style={styles.listCard}>
            {needs.map((e, i) => (
              <Pressable key={e.key} style={[styles.row, i < needs.length - 1 && styles.rowBorder]} onPress={() => toggle(`e:${e.key}`)}>
                <Check k={`e:${e.key}`} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, packed[`e:${e.key}`] && styles.struck]}>
                    {e.label}
                    {e.qty > 1 ? ` × ${e.qty}` : ''}
                  </Text>
                  {!!e.why && <Text style={styles.rowSub}>{e.why}</Text>}
                </View>
              </Pressable>
            ))}
          </View>

          <Text style={styles.group}>Your own</Text>
          <View style={styles.listCard}>
            {extras.map((e) => (
              <Pressable key={e.id} style={[styles.row, styles.rowBorder]} onPress={() => toggle(`x:${e.id}`)}>
                <Check k={`x:${e.id}`} />
                <Text style={[styles.rowTitle, { flex: 1 }, packed[`x:${e.id}`] && styles.struck]}>{e.label}</Text>
                <Pressable hitSlop={10} onPress={() => onUpdate((tr) => ({ ...tr, extras: (tr.extras || []).filter((x) => x.id !== e.id) }))}>
                  <Text style={styles.remove}>✕</Text>
                </Pressable>
              </Pressable>
            ))}
            <View style={styles.addRow}>
              <TextInput
                value={extra}
                onChangeText={setExtra}
                onSubmitEditing={addExtra}
                placeholder="Add something (camera, gift, laptop…)"
                placeholderTextColor={colors.muted}
                returnKeyType="done"
                style={styles.addInput}
              />
              <Pressable onPress={addExtra} hitSlop={8}>
                <Text style={styles.link}>Add</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.packActions}>
            <Pressable style={styles.btn} onPress={share}>
              <Text style={styles.btnText}>Share list</Text>
            </Pressable>
            {done > 0 && (
              <Pressable style={styles.btn} onPress={() => onUpdate((tr) => ({ ...tr, packed: {} }))}>
                <Text style={styles.btnText}>Uncheck all</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: 120 },
  title: { ...serif, color: colors.text, fontSize: 32 },
  sub: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 4, marginBottom: spacing.md },
  cta: { backgroundColor: colors.text, borderRadius: 999, paddingVertical: 13, alignItems: 'center', marginBottom: spacing.lg },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  empty: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg },
  emptyText: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  cardTitle: { ...serif, color: colors.text, fontSize: 20 },
  cardSub: { color: colors.muted, fontSize: 13, marginTop: 4 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  back: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  topLink: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  wxStrip: { marginBottom: spacing.sm },
  wxDay: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    width: 58,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  wxDow: { color: colors.text, fontSize: 12, fontWeight: '700' },
  wxDate: { color: colors.muted, fontSize: 11 },
  wxIcon: { fontSize: 18, marginVertical: 2, color: colors.text },
  wxHi: { color: colors.text, fontSize: 15, fontWeight: '700' },
  wxLo: { color: colors.muted, fontSize: 13 },
  wxNoteRow: { minHeight: 20, marginBottom: spacing.md, alignItems: 'flex-start' },
  wxNote: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  link: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  tabs: { flexDirection: 'row', marginBottom: spacing.sm },
  gap: { color: colors.warn, fontSize: 13, lineHeight: 19, marginBottom: spacing.sm },
  dayTitle: { ...serif, color: colors.text, fontSize: 20, marginTop: spacing.sm },
  daySub: { color: colors.muted, fontSize: 13, marginTop: 2, marginBottom: spacing.sm },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: spacing.md },
  noLook: { backgroundColor: colors.cardAlt, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg },
  noLookTitle: { ...serif, color: colors.text, fontSize: 17, marginBottom: 4 },
  tip: { backgroundColor: colors.accentSoft, color: colors.text, borderRadius: radius.md, padding: spacing.md, fontSize: 13, lineHeight: 19, marginBottom: spacing.sm, overflow: 'hidden' },
  group: { color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: spacing.md, marginBottom: spacing.sm },
  listCard: { backgroundColor: colors.card, borderRadius: radius.lg, paddingHorizontal: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, minHeight: 48 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  rowSub: { color: colors.muted, fontSize: 12, marginTop: 1 },
  struck: { color: colors.muted, textDecorationLine: 'line-through' },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  checkOn: { backgroundColor: colors.good, borderColor: colors.good },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: '800' },
  remove: { color: colors.muted, fontSize: 16, paddingHorizontal: spacing.sm },
  addRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  addInput: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 8 },
  packActions: { flexDirection: 'row', marginTop: spacing.lg },
  btn: { backgroundColor: colors.cardAlt, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 18, marginRight: spacing.sm },
  btnText: { color: colors.text, fontSize: 14, fontWeight: '700' },
});
