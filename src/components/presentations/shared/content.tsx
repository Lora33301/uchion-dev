import React from 'react'
import type { ContentElement } from '../../../../shared/types'
import type { ThemeColors } from './types'

// =============================================================================
// Rich content helpers
// =============================================================================

export function getContentItemText(item: string | ContentElement): string {
  if (typeof item === 'string') return item
  return item.text || ''
}

export function normalizeContent(content: (string | ContentElement)[]): ContentElement[] {
  return content.map(item => {
    if (typeof item === 'string') return { el: 'bullet' as const, text: item }
    return item
  })
}

/** Render rich content elements with semantic styling */
export function RichContent({ items, theme }: { items: ContentElement[]; theme: ThemeColors }) {
  return (
    <>
      {items.map((item, i) => {
        switch (item.el) {
          case 'heading':
            return (
              <div key={i} className="text-xl font-bold text-center my-2" style={{ color: theme.title }}>
                {item.text}
              </div>
            )
          case 'definition':
            return (
              <div key={i} className="text-base my-1.5 pl-3 italic" style={{ color: theme.text, borderLeft: `3px solid ${theme.accent}` }}>
                {item.text}
              </div>
            )
          case 'text':
            return (
              <p key={i} className="text-base leading-relaxed my-1" style={{ color: theme.text }}>
                {item.text}
              </p>
            )
          case 'highlight':
            return (
              <div key={i} className="text-lg font-bold my-1.5" style={{ color: theme.accent }}>
                {item.text}
              </div>
            )
          case 'task':
            return (
              <div key={i} className="text-base leading-relaxed my-1.5 flex gap-1" style={{ color: theme.text }}>
                <span className="font-bold flex-shrink-0">{item.number}.</span>
                <span>{item.text}</span>
              </div>
            )
          case 'formula':
            return (
              <div key={i} className="text-xl font-bold text-center my-2" style={{ color: theme.accent }}>
                {item.text}
              </div>
            )
          case 'bullet':
          default:
            return (
              <div key={i} className="flex items-start gap-3 text-lg leading-relaxed">
                <span className="mt-1.5 flex-shrink-0 w-2.5 h-2.5 rounded-full" style={{ background: theme.accent }} />
                <span style={{ color: theme.text }}>{item.text}</span>
              </div>
            )
        }
      })}
    </>
  )
}

/** Rich content for minimalism/kids themes (smaller sizing) */
export function RichContentCompact({ items, theme }: { items: ContentElement[]; theme: ThemeColors }) {
  return (
    <>
      {items.map((item, i) => {
        switch (item.el) {
          case 'heading':
            return (
              <div key={i} className="text-lg font-bold text-center my-1.5" style={{ color: theme.title, fontFamily: 'Georgia, serif' }}>
                {item.text}
              </div>
            )
          case 'definition':
            return (
              <div key={i} className="text-sm my-1 pl-2.5 italic" style={{ color: theme.text, borderLeft: `3px solid ${theme.accent}` }}>
                {item.text}
              </div>
            )
          case 'text':
            return (
              <p key={i} className="text-sm leading-relaxed my-0.5" style={{ color: theme.text }}>
                {item.text}
              </p>
            )
          case 'highlight':
            return (
              <div key={i} className="text-sm font-bold my-1" style={{ color: theme.accent }}>
                {item.text}
              </div>
            )
          case 'task':
            return (
              <div key={i} className="text-sm leading-relaxed my-1 flex gap-1" style={{ color: theme.text }}>
                <span className="font-bold flex-shrink-0">{item.number}.</span>
                <span>{item.text}</span>
              </div>
            )
          case 'formula':
            return (
              <div key={i} className="text-base font-bold text-center my-1.5" style={{ color: theme.accent, fontFamily: 'Georgia, serif' }}>
                {item.text}
              </div>
            )
          case 'bullet':
          default:
            return (
              <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
                <span className="mt-1 flex-shrink-0 w-2 h-2 rounded-full" style={{ background: theme.accent }} />
                <span style={{ color: theme.text }}>{item.text}</span>
              </li>
            )
        }
      })}
    </>
  )
}
