import { useEffect, useMemo, useState } from 'react';
import { FlatList, Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Chip from '../components/Chip';
import ItemThumb from '../components/ItemThumb';
import OutfitCard, { CardAction } from '../components/OutfitCard';
import { OCCASIONS } from '../catalog';
import { AESTHETICS, AESTHETIC_BY_KEY } from '../aesthetics';
import { generateOutfits, typeOf } from '../stylist';
import { currentWeather } from '../weather';
import { colors, radius, serif, spacing } from '../theme';

const TEMPS = [30, 40, 50, 60, 70, 80, 90];

export default function StyleScreen({
  items,
  images,
  prefs,
  feedback,
  weather,
  setWeather,
  occasion,
  setOccasion,
  aesthetic,
  setAesthetic,
  lockId,
  setLockId,
  onWear,
  onSave,
  onPass,
  onOpenItem,
  goToCloset,
}) {
  const [seed, setSeed] = useState(0);
  const [weatherOpen, setWeatherOpen] = useState(false);
  const [loadingWx, setLoadingWx] = useState(false);
  const [hidden, setHidden] = useState([]); // signatures acted on this session

  const refreshWeather = async () => {
    setLoadingWx(true);
    const w = await currentWeather();
    setLoadingWx(false);
    if (w) setWeather({ ...w, auto: true });
    return w;
  };

  // Fetch weather once if we don't have a recent reading.
  useEffect(() => {
    if (!weather || (weather.auto && Date.now() - weather.at > 3 * 3600 * 1000)) refreshWeather();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const locked = lockId ? items.find((i) => i.id === lockId) : null;

  const outfits = useMemo(
    () =>
      generateOutfits(
        items,
        {
          occasion,
          aesthetic,
          tempF: weather?.tempF ?? null,
          rain: !!weather?.rain,
          lockId,
          prefs,
          feedback,
          seed,
          now: Date.now(),
        },
        10
      ),
    [items, occasion, aesthetic, weather, lockId, prefs, feedback, seed]
  );
  const visible = outfits.filter((o) => !hidden.includes(o.signature));

  const hasBasics =
    items.some((i) => ['top', 'onepiece'].includes(typeOf(i).cat)) &&
    items.some((i) => ['bottom', 'onepiece'].includes(typeOf(i).cat));

  const wxLabel = weather
    ? `${weather.tempF}°${weather.high != null && weather.auto ? ` (H ${weather.high}° L ${weather.low}°)` : ''} · ${weather.rain ? weather.summary || 'Rain' : weather.summary || 'Dry'}`
    : loadingWx
    ? 'Checking weather…'
    : 'Set weather';

  const header = (
    <View>
      <Text style={styles.title}>{locked ? 'Style this piece' : 'Today’s looks'}</Text>
      <Pressable style={styles.wx} onPress={() => setWeatherOpen(true)}>
        <Text style={styles.wxText}>☁︎ {wxLabel}</Text>
        <Text style={styles.wxEdit}>change</Text>
      </Pressable>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
        {OCCASIONS.map((o) => (
          <Chip key={o.key} label={o.label} on={occasion === o.key} onPress={() => setOccasion(o.key)} />
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.xs }}>
        <Chip small label="Any vibe" on={!aesthetic} onPress={() => setAesthetic(null)} />
        {AESTHETICS.map((a) => (
          <Chip small key={a.key} label={a.label} on={aesthetic === a.key} onPress={() => setAesthetic(aesthetic === a.key ? null : a.key)} />
        ))}
      </ScrollView>
      {!!aesthetic && (
        <Text style={styles.vibeBlurb}>
          {AESTHETIC_BY_KEY[aesthetic]?.blurb}{' '}
          {AESTHETIC_BY_KEY[aesthetic]?.source ? (
            <Text style={styles.vibeSource} onPress={() => Linking.openURL(AESTHETIC_BY_KEY[aesthetic].source.url)}>
              Source: {AESTHETIC_BY_KEY[aesthetic].source.name}
            </Text>
          ) : (
            <Text style={styles.vibeSourceMuted}>(general menswear convention — no wiki source)</Text>
          )}
        </Text>
      )}

      {locked && (
        <View style={styles.lock}>
          <ItemThumb item={locked} uri={images[locked.id]} size={40} showLabel={false} />
          <Text style={styles.lockText} numberOfLines={1}>
            Outfits built around {locked.name}
          </Text>
          <Pressable onPress={() => setLockId(null)} hitSlop={10}>
            <Text style={styles.lockClear}>✕</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.row}>
        <Text style={styles.count}>
          {visible.length ? `${visible.length} outfit${visible.length === 1 ? '' : 's'}` : ''}
        </Text>
        <Pressable onPress={() => setSeed(Math.floor(Math.random() * 1e9))} style={styles.shuffle}>
          <Text style={styles.shuffleText}>⟳ Shuffle</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={hasBasics ? visible : []}
        keyExtractor={(o) => o.signature}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{hasBasics ? 'No outfits for this combo' : 'Add a few pieces first'}</Text>
            <Text style={styles.emptyText}>
              {hasBasics
                ? 'Nothing in your closet fits this occasion and weather yet. Try another occasion, or add pieces — the Profile tab shows what’s missing.'
                : 'You need at least one top and one bottom (or a dress) — shoes help too.'}
            </Text>
            {!hasBasics && (
              <Pressable style={styles.cta} onPress={goToCloset}>
                <Text style={styles.ctaText}>Go to Closet</Text>
              </Pressable>
            )}
          </View>
        }
        renderItem={({ item: o, index }) => (
          <OutfitCard
            outfit={o}
            images={images}
            title={index === 0 ? 'Top pick' : `Look ${index + 1}`}
            onPressItem={onOpenItem}
            actions={
              <>
                <CardAction
                  label="✓ Wear today"
                  primary
                  onPress={() => {
                    setHidden((h) => [...h, o.signature]);
                    onWear(o.items, occasion);
                  }}
                />
                <CardAction label="♡ Save" onPress={() => onSave(o.items, occasion)} />
                <CardAction
                  label="✕ Not for me"
                  onPress={() => {
                    setHidden((h) => [...h, o.signature]);
                    onPass(o.items);
                  }}
                />
              </>
            }
          />
        )}
      />

      <Modal visible={weatherOpen} transparent animationType="fade" onRequestClose={() => setWeatherOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setWeatherOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Weather</Text>
            <Pressable
              style={styles.locBtn}
              onPress={async () => {
                const w = await refreshWeather();
                if (w) setWeatherOpen(false);
              }}
            >
              <Text style={styles.locText}>{loadingWx ? 'Getting forecast…' : '📍 Use my location'}</Text>
            </Pressable>
            <Text style={styles.sheetLabel}>Or set it yourself</Text>
            <View style={styles.wrap}>
              {TEMPS.map((t) => (
                <Chip
                  key={t}
                  label={`${t}°`}
                  on={weather?.tempF === t && !weather?.auto}
                  onPress={() => setWeather({ tempF: t, rain: !!weather?.rain, auto: false, at: Date.now() })}
                />
              ))}
            </View>
            <View style={styles.rainRow}>
              <Text style={styles.sheetLabel}>Rain or snow</Text>
              <Switch
                value={!!weather?.rain}
                onValueChange={(v) =>
                  setWeather({ ...(weather || { tempF: 65, at: Date.now() }), rain: v, summary: v ? 'Rain' : 'Dry', auto: false })
                }
              />
            </View>
            <Pressable onPress={() => setWeatherOpen(false)} style={styles.done}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, paddingBottom: 120 },
  title: { ...serif, color: colors.text, fontSize: 32, marginBottom: spacing.sm },
  wx: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: spacing.md,
  },
  wxText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  wxEdit: { color: colors.accent, fontSize: 12, fontWeight: '700', marginLeft: spacing.sm },
  vibeBlurb: { color: colors.muted, fontSize: 13, fontStyle: 'italic', lineHeight: 18, marginBottom: spacing.md },
  vibeSource: { color: colors.accent, fontStyle: 'normal', fontSize: 12, fontWeight: '600' },
  vibeSourceMuted: { color: colors.muted, fontStyle: 'normal', fontSize: 12 },
  lock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  lockText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600', marginLeft: spacing.sm },
  lockClear: { color: colors.accent, fontSize: 18, fontWeight: '800', paddingHorizontal: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  count: { color: colors.muted, fontSize: 13 },
  shuffle: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.cardAlt },
  shuffleText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.md },
  emptyTitle: { ...serif, color: colors.text, fontSize: 20 },
  emptyText: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: spacing.sm },
  cta: { marginTop: spacing.lg, backgroundColor: colors.text, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 20 },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl * 1.5,
  },
  sheetTitle: { ...serif, color: colors.text, fontSize: 20, marginBottom: spacing.md },
  sheetLabel: { color: colors.muted, fontSize: 13, fontWeight: '600', marginBottom: spacing.sm },
  locBtn: { backgroundColor: colors.text, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', marginBottom: spacing.lg },
  locText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm },
  rainRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  done: { alignItems: 'center', paddingTop: spacing.lg },
  doneText: { color: colors.accent, fontSize: 16, fontWeight: '700' },
});
