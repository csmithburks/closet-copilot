import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import ItemThumb from './ItemThumb';
import { colors, radius, serif, spacing } from '../theme';
import { typeOf } from '../stylist';

const ORDER = { outerwear: 0, top: 1, onepiece: 1, bottom: 2, shoes: 3 };

// One suggested (or saved) outfit: the pieces, why it works, and actions.
export default function OutfitCard({ outfit, images, title, subtitle, actions, onPressItem }) {
  const { width } = useWindowDimensions();
  const items = [...outfit.items].sort((a, b) => (ORDER[typeOf(a).cat] ?? 9) - (ORDER[typeOf(b).cat] ?? 9));
  const inner = Math.min(width, 520) - spacing.lg * 2 - spacing.md * 2;
  const size = Math.floor((inner - spacing.sm * (items.length - 1)) / Math.max(items.length, 3));

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          {!!title && <Text style={styles.title}>{title}</Text>}
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {outfit.score != null && (
          <View style={styles.score}>
            <Text style={styles.scoreNum}>{outfit.score}</Text>
            <Text style={styles.scoreLabel}>match</Text>
          </View>
        )}
      </View>

      <View style={styles.items}>
        {items.map((it) => (
          <Pressable key={it.id} onPress={() => onPressItem && onPressItem(it)} style={{ width: size }}>
            <ItemThumb item={it} uri={images[it.id]} size={size} showLabel={!images[it.id]} />
            <Text style={styles.itemName} numberOfLines={1}>
              {it.name}
            </Text>
          </Pressable>
        ))}
      </View>

      {(outfit.reasons || []).slice(0, 3).map((r) => (
        <Text key={r} style={styles.reason}>
          ✓ {r}
        </Text>
      ))}
      {(outfit.cautions || []).slice(0, 1).map((c) => (
        <Text key={c} style={styles.caution}>
          ⚠ {c}
        </Text>
      ))}

      {!!actions && <View style={styles.actions}>{actions}</View>}
    </View>
  );
}

export function CardAction({ label, onPress, primary, danger }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.btn, primary && styles.btnPrimary, pressed && { opacity: 0.75 }]}
    >
      <Text style={[styles.btnText, primary && { color: '#fff' }, danger && { color: colors.danger }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  title: { ...serif, color: colors.text, fontSize: 18 },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 2 },
  score: {
    backgroundColor: colors.goodSoft,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  scoreNum: { color: colors.good, fontSize: 18, fontWeight: '800' },
  scoreLabel: { color: colors.good, fontSize: 10, fontWeight: '700', marginTop: -2 },
  items: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  itemName: { color: colors.muted, fontSize: 11, marginTop: 4, textAlign: 'center' },
  reason: { color: colors.text, fontSize: 13, lineHeight: 19 },
  caution: { color: colors.warn, fontSize: 13, lineHeight: 19, marginTop: 2 },
  actions: { flexDirection: 'row', marginTop: spacing.md, flexWrap: 'wrap' },
  btn: {
    backgroundColor: colors.cardAlt,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
  },
  btnPrimary: { backgroundColor: colors.text },
  btnText: { color: colors.text, fontSize: 14, fontWeight: '700' },
});
