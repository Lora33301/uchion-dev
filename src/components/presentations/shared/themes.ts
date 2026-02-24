import type { PresentationThemePreset } from '../../../../shared/types'
import type { ThemeColors } from './types'

// =============================================================================
// Theme colors (mirrors PPTX generator themes)
// =============================================================================

export const THEMES: Record<PresentationThemePreset, ThemeColors> = {
  professional: {
    bg: '#FFFFFF',
    title: '#1B2A4A',
    text: '#333333',
    accent: '#2E5090',
    accentLight: '#E8EDF5',
  },
  educational: {
    bg: '#FFFBF5',
    title: '#8C52FF',
    text: '#2D2D2D',
    accent: '#FF6B35',
    accentLight: '#FFF0E8',
  },
  minimal: {
    bg: '#F5F3F0',
    title: '#1A1A1A',
    text: '#2D2D2D',
    accent: '#8B7355',
    accentLight: '#E8E4DF',
    dark: '#1A1A1A',
    muted: '#6B6B6B',
  },
  scientific: {
    bg: '#F8FAF8',
    title: '#1A5632',
    text: '#2C2C2C',
    accent: '#2A7B4F',
    accentLight: '#E8F5EE',
  },
  kids: {
    bg: '#FDF6E3',
    title: '#2D3436',
    text: '#2D3436',
    accent: '#4ECDC4',
    accentLight: '#E0F7F5',
    dark: '#4ECDC4',
    muted: '#94A3B8',
  },
  school: {
    bg: '#F5F0EA',
    title: '#2D3436',
    text: '#2D3436',
    accent: '#C9A96E',
    accentLight: '#F0E8D8',
    dark: '#5C6878',
    muted: '#6B7B8D',
  },
}
