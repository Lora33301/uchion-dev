import React from 'react'
import type { ThemeColors } from './types'

// =============================================================================
// Shared sub-components
// =============================================================================

export function SlideHeader({ title, theme }: { title: string; theme: ThemeColors }) {
  return (
    <>
      <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: theme.accent }} />
      <h3
        className="text-2xl font-bold leading-tight pl-3"
        style={{ color: theme.title, fontFamily: 'Georgia, serif', borderLeft: `3px solid ${theme.accent}` }}
      >
        {title}
      </h3>
      <div className="w-20 h-0.5 mt-2" style={{ background: theme.accent }} />
    </>
  )
}

export function NavButton({
  direction,
  onClick,
  disabled,
}: {
  direction: 'prev' | 'next'
  onClick: () => void
  disabled: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`absolute top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white/90 shadow-lg border border-gray-200 transition-all hover:bg-white hover:shadow-xl disabled:opacity-30 disabled:cursor-not-allowed ${
        direction === 'prev' ? 'left-2 sm:left-4' : 'right-2 sm:right-4'
      }`}
      aria-label={direction === 'prev' ? 'Previous slide' : 'Next slide'}
    >
      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {direction === 'prev' ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        )}
      </svg>
    </button>
  )
}
