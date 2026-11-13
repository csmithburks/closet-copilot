import { createElement } from 'react';
import { colors, radius } from '../theme';

// Web / home-screen app: the phone's own date picker.
export default function DateField({ value, onChange, min }) {
  return createElement('input', {
    type: 'date',
    value: value || '',
    min: min || undefined,
    onChange: (e) => onChange(e.target.value),
    style: {
      display: 'block',
      width: '100%',
      minWidth: 0,
      boxSizing: 'border-box',
      height: 44,
      padding: '0 10px',
      fontSize: 16,
      fontFamily: 'inherit',
      color: colors.text,
      backgroundColor: colors.card,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.md,
      WebkitAppearance: 'none',
    },
  });
}
