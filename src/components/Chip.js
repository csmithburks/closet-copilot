import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, spacing } from '../theme';

export default function Chip({ label, on, onPress, style, small }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, small && styles.small, on && styles.on, style]} hitSlop={4}>
      <Text style={[styles.text, small && styles.smallText, on && styles.textOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.cardAlt,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  small: { paddingHorizontal: 10, paddingVertical: 5 },
  on: { backgroundColor: colors.text },
  text: { color: colors.text, fontSize: 14, fontWeight: '600' },
  smallText: { fontSize: 12 },
  textOn: { color: '#FFFFFF' },
});
