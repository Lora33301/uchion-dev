import React, { useState, useCallback, useEffect } from 'react'
import type { PresentationStructure, PresentationSlide, PresentationThemePreset } from '../../../shared/types'
import { THEMES } from './shared/themes'
import { NavButton } from './shared/components'
import { PROFESSIONAL_RENDERERS } from './themes/professional'
import { MINIMAL_RENDERERS } from './themes/minimal'
import { KIDS_RENDERERS } from './themes/kids'
import { SCHOOL_RENDERERS } from './themes/school'
import type { SlideRendererMap } from './shared/types'

// =============================================================================
// Theme renderer selection
// =============================================================================

function getRenderers(themePreset: PresentationThemePreset): SlideRendererMap {
  switch (themePreset) {
    case 'minimal':
      return MINIMAL_RENDERERS
    case 'kids':
      return KIDS_RENDERERS
    case 'school':
      return SCHOOL_RENDERERS
    default:
      return PROFESSIONAL_RENDERERS
  }
}

// =============================================================================
// Main component -- Presentation Viewer
// =============================================================================

interface SlidePreviewProps {
  structure: PresentationStructure
  themePreset?: PresentationThemePreset
}

export default function SlidePreview({ structure, themePreset = 'professional' }: SlidePreviewProps) {
  const theme = THEMES[themePreset]
  const renderers = getRenderers(themePreset)
  const [currentSlide, setCurrentSlide] = useState(0)
  const totalSlides = structure.slides.length

  const goTo = useCallback((idx: number) => {
    setCurrentSlide(Math.max(0, Math.min(idx, totalSlides - 1)))
  }, [totalSlides])

  const goPrev = useCallback(() => goTo(currentSlide - 1), [currentSlide, goTo])
  const goNext = useCallback(() => goTo(currentSlide + 1), [currentSlide, goTo])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goPrev, goNext])

  const slide = structure.slides[currentSlide]

  const renderSlide = (s: PresentationSlide, idx: number) => {
    const Renderer = renderers[s.type] || renderers.content
    return <Renderer slide={s} theme={theme} index={idx} total={totalSlides} />
  }

  return (
    <div className="w-full space-y-4">
      {/* Main slide viewer */}
      <div className="relative w-full rounded-2xl shadow-xl border border-gray-200 overflow-hidden bg-gray-900">
        {/* Slide area -- 16:9 aspect ratio */}
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ background: theme.bg }}
          >
            {renderSlide(slide, currentSlide)}
            {/* Watermark */}
            <div
              className="absolute top-2 right-3 text-xs font-medium pointer-events-none select-none"
              style={{ color: theme.muted || theme.accent, opacity: 0.35 }}
            >
              УчиОн
            </div>
            {/* Slide number */}
            <div
              className="absolute bottom-3 right-4 text-xs font-medium px-2 py-1 rounded"
              style={{ color: theme.accent, background: theme.accentLight }}
            >
              {currentSlide + 1} / {totalSlides}
            </div>
          </div>
        </div>

        {/* Navigation arrows */}
        <NavButton direction="prev" onClick={goPrev} disabled={currentSlide === 0} />
        <NavButton direction="next" onClick={goNext} disabled={currentSlide === totalSlides - 1} />
      </div>

      {/* Slide counter + keyboard hint */}
      <div className="flex items-center justify-center gap-3 text-sm text-slate-400">
        <span>
          {currentSlide + 1} / {totalSlides}
        </span>
        <span className="hidden sm:inline text-slate-300">|</span>
        <span className="hidden sm:inline">
          Используйте стрелки для навигации
        </span>
      </div>

      {/* Thumbnail strip */}
      <div className="relative">
        <div className="flex gap-2 overflow-x-auto pb-2 px-1 scrollbar-thin">
          {structure.slides.map((s, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              className={`relative flex-shrink-0 w-32 sm:w-40 rounded-lg overflow-hidden border-2 transition-all hover:shadow-md ${
                idx === currentSlide
                  ? 'border-[#8C52FF] shadow-md ring-2 ring-[#8C52FF]/20'
                  : 'border-gray-200 opacity-70 hover:opacity-100'
              }`}
              style={{ aspectRatio: '16/9' }}
            >
              <div className="absolute inset-0 overflow-hidden" style={{ background: theme.bg }}>
                {/* Scale down the slide content for thumbnail */}
                <div className="w-[300%] h-[300%] origin-top-left" style={{ transform: 'scale(0.333)' }}>
                  <div className="relative w-full h-full">
                    {renderSlide(s, idx)}
                  </div>
                </div>
              </div>
              {/* Slide number overlay */}
              <div className="absolute bottom-0.5 right-1 text-[9px] font-semibold px-1 rounded bg-black/40 text-white">
                {idx + 1}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
