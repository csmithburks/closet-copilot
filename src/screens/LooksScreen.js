import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Chip from '../components/Chip';
import OutfitCard, { CardAction } from '../components/OutfitCard';
import { OCCASION_BY_KEY } from '../catalog';
import { confirm } from '../dialogs';
import { colors, serif, spacing } from '../theme';

// Saved looks and a log of what was worn.
export default function LooksScreen({ items, images, outfits, log, onWear, onDeleteOutfit, onDeleteLog, onOpenItem }) {
  const [tab, setTab] = useState('saved');
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  const resolve = (ids) => ids.map((id) => byId[id]).filter(Boolean);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const thisMonth = log.filter((l) => l.date >= monthStart.getTime()).length;

  const data = (tab === 'saved' ? outfits : log)
    .map((o) => ({ ...o, items: resolve(o.itemIds) }))
    .filter((o) => o.items.length);

  return (
    <FlatList
      data={data}
      keyExtractor={(o) => o.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View>
          <Text style={styles.title}>Looks</Text>
          <Text style={styles.sub}>
            {outfits.length} saved · {thisMonth} worn this month
          </Text>
          <View style={styles.tabs}>
            <Chip label="Saved" on={tab === 'saved'} onPress={() => setTab('saved')} />
            <Chip label="Worn" on={tab === 'worn'} onPress={() => setTab('worn')} />
          </View>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>
          {tab === 'saved'
            ? 'Tap ♡ Save on any outfit in Style to keep it here.'
            : 'Tap ✓ Wear today on an outfit and it’s logged here. Style uses this to keep your looks varied.'}
        </Text>
      }
      renderItem={({ item: o }) => {
        const occ = OCCASION_BY_KEY[o.occasion]?.label;
        const when = new Date(tab === 'saved' ? o.createdAt : o.date).toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
        return (
          <OutfitCard
            outfit={{ items: o.items }}
            images={images}
            title={tab === 'saved' ? occ || 'Saved look' : when}
            subtitle={tab === 'saved' ? `Saved ${when}` : occ}
            onPressItem={onOpenItem}
            actions={
              <>
                {tab === 'saved' && <CardAction label="✓ Wear today" primary onPress={() => onWear(o.items, o.occasion)} />}
                <CardAction
                  label="Delete"
                  danger
                  onPress={async () => {
                    if (await confirm(tab === 'saved' ? 'Delete this saved look?' : 'Remove from wear log?', undefined, { confirmText: 'Delete', destructive: true })) {
                      tab === 'saved' ? onDeleteOutfit(o.id) : onDeleteLog(o.id);
                    }
                  }}
                />
              </>
            }
          />
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, paddingBottom: 120 },
  title: { ...serif, color: colors.text, fontSize: 32 },
  sub: { color: colors.muted, fontSize: 14, marginBottom: spacing.md },
  tabs: { flexDirection: 'row', marginBottom: spacing.sm },
  empty: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: spacing.xl, paddingHorizontal: spacing.lg },
});
