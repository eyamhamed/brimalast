// src/theme/typography.js
import { Platform } from 'react-native';

const fontFamily = {
  heading: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  body: Platform.OS === 'ios' ? 'San Francisco' : 'Roboto',
};

export default {
  fontFamily,
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    display1: 24,
    display2: 30,
    display3: 36,
    display4: 42,
  },
  fontWeight: {
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  }
};