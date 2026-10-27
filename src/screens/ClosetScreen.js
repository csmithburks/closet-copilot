import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Chip from '../components/Chip';
import ItemThumb from '../components/ItemThumb';
import { CATEGORIES } from '../catalog';
import { typeOf } from '../stylist';
import { colors, radius, serif, spacing } from '../theme';

export default function ClosetScreen({ items, images, onOpenItem, onAdd, onLoadDemo }) {
  const [cat, setCat] = useState('all');
  const { width } = useWindowDimensions();
  const cols = 3;
  const gap = spacing.sm;
  const size = Math.floor((Math.min(width, 560) - spacing.lg * 2 - gap * (cols - 1)) / cols);

  const counts = {};
  for (const i of items) counts[typeOf(i).cat] = (counts[typeOf(i).cat] || 0) + 1;
  const shown = (cat === 'all' ? items : items.filter((i) => typeOf(i).cat === cat)).sort(
    (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={shown}
        keyExtractor={(i) => i.id}
        numColumns={cols}
        key={cols}
        columnWrapperStyle={{ gap }}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Closet</Text>
            <Text style={styles.sub}>
              {items.length} piece{items.length === 1 ? '' : 's'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
              <Chip label={`All ${items.length}`} on={cat === 'all'} onPress={() => setCat('all')} small />
              {CATEGORIES.map((c) => (
                <Chip
                  key={c.key}
                  label={`${c.label} ${counts[c.key] || 0}`}
                  on={cat === c.key}
                  onPress={() => setCat(c.key)}
                  small
                />
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Your closet is empty</Text>
            <Text style={styles.emptyText}>
              Tap + to photograph your clothes. Start with a few tops, bottoms and shoes — outfits appear once you have
              one of each.
            </Text>
            {items.length === 0 && (
              <Pressable style={styles.demoBtn} onPress={onLoadDemo}>
                <Text style={styles.demoText}>Try it with a sample closet</Text>
              </Pressable>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={{ width: size, marginBottom: spacing.md }} onPress={() => onOpenItem(item)}>
            <ItemThumb item={item} uri={images[item.id]} size={size} showLabel={!images[item.id]} />
            <Text style={styles.name} numberOfLines={1}>
              {item.favorite ? '★ ' : ''}
              {item.name}
            </Text>
          </Pressable>
        )}
      />
      <Pressable style={styles.fab} onPress={onAdd}>
        <Text style={styles.fabText}>＋</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, paddingBottom: 140 },
  title: { ...serif, color: colors.text, fontSize: 32 },
  sub: { color: colors.muted, fontSize: 14, marginBottom: spacing.md },
  name: { color: colors.text, fontSize: 12, marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: spacing.xl * 2, paddingHorizontal: spacing.lg },
  emptyTitle: { ...serif, color: colors.text, fontSize: 22 },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 20, marginTop: spacing.sm },
  demoBtn: { marginTop: spacing.lg, backgroundColor: colors.accentSoft, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 18 },
  demoText: { color: colors.accent, fontSize: 15, fontWeight: '700' },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 30, marginTop: -2 },
});
