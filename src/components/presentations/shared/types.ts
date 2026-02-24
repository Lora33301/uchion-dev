import type React from 'react'
import type { PresentationSlide } from '../../../../shared/types'

// =============================================================================
// Shared types for SlidePreview
// =============================================================================

export interface ThemeColors {
  bg: string
  title: string
  text: string
  accent: string
  accentLight: string
  // Minimalism/Kids/School-specific
  dark?: string
  muted?: string
}

export type SlideRendererProps = {
  slide: PresentationSlide
  theme: ThemeColors
  index: number
  total: number
}

export type SlideRendererMap = Record<PresentationSlide['type'], (props: SlideRendererProps) => React.JSX.Element>
