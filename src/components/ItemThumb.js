import { Image, StyleSheet, Text, View } from 'react-native';
import { COLOR_BY_KEY, TYPES } from '../catalog';
import { hslOf } from '../color';
import { radius } from '../theme';

// A clothing tile: the photo if there is one, otherwise a swatch in the
// item's color labeled with its type.
export default function ItemThumb({ item, uri, size = 96, style, showLabel = true }) {
  const color = COLOR_BY_KEY[item.color] || COLOR_BY_KEY.grey;
  const light = hslOf(item.color).l > 60;
  const box = { width: size, height: size * 1.25, borderRadius: radius.md };
  if (uri) {
    return <Image source={{ uri }} style={[box, styles.photo, style]} resizeMode="cover" />;
  }
  const bg = item.color === 'multi' ? '#B9A88F' : color.hex;
  return (
    <View style={[box, styles.swatch, { backgroundColor: bg }, style]}>
      {item.pattern && item.pattern !== 'solid' && item.pattern !== 'texture' && (
        <View style={[StyleSheet.absoluteFill, styles.patternOverlay]}>
          {Array.from({ length: 6 }, (_, i) => (
            <View
              key={i}
              style={[
                item.pattern === 'check' ? styles.checkLine : styles.stripe,
                { top: `${i * 18}%`, backgroundColor: light ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.18)' },
              ]}
            />
          ))}
        </View>
      )}
      {showLabel && (
        <Text style={[styles.label, { color: light ? '#1D1B19' : '#FFFFFF', fontSize: Math.max(10, size / 8) }]} numberOfLines={2}>
          {TYPES[item.type]?.label || 'Item'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { backgroundColor: '#E9E2D8' },
  swatch: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 6,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  patternOverlay: { overflow: 'hidden' },
  stripe: { position: 'absolute', left: 0, right: 0, height: '7%' },
  checkLine: { position: 'absolute', left: 0, right: 0, height: '4%' },
  label: { fontWeight: '700', textAlign: 'center' },
});
