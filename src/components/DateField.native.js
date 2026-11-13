import { StyleSheet, TextInput } from 'react-native';
import { colors, radius } from '../theme';

// Expo Go: type the date as YYYY-MM-DD.
export default function DateField({ value, onChange }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder="YYYY-MM-DD"
      placeholderTextColor={colors.muted}
      keyboardType="numbers-and-punctuation"
      maxLength={10}
      style={styles.input}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    alignSelf: 'stretch',
    height: 44,
    paddingHorizontal: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
});
