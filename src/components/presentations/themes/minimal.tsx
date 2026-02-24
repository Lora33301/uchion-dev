import React from 'react'
import type { PresentationSlide } from '../../../../shared/types'
import type { ThemeColors, SlideRendererMap } from '../shared/types'
import { getContentItemText, normalizeContent, RichContentCompact } from '../shared/content'

// =============================================================================
// Minimalism slide renderers
// =============================================================================

function getSectionNum(slideIndex: number, totalSlides: number): string | null {
  // Skip title (first) and conclusion (last)
  if (slideIndex === 0 || slideIndex === totalSlides - 1) return null
  return String(slideIndex).padStart(2, '0')
}

function MinBulletList({ items, theme }: { items: (string | { text?: string })[]; theme: ThemeColors }) {
  return (
    <ul className="space-y-2.5 flex-1 overflow-hidden">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
          <span className="mt-1 flex-shrink-0 w-2 h-2 rounded-full" style={{ background: theme.accent }} />
          <span style={{ color: theme.text }}>{getContentItemText(item as string | import('../../../../shared/types').ContentElement)}</span>
        </li>
      ))}
    </ul>
  )
}

function MinTitleSlide({ slide, theme }: { slide: PresentationSlide; theme: ThemeColors }) {
  const category = getContentItemText(slide.content[0] || '')
  const subtitle = getContentItemText(slide.content[1] || '')
  const footer = getContentItemText(slide.content[2] || '')
  return (
    <div className="relative flex h-full" style={{ background: theme.dark }}>
      {/* Left content */}
      <div className="flex-1 flex flex-col justify-center pl-10 pr-6">
        {/* Accent vertical line */}
        <div className="absolute left-8 top-[15%] bottom-[15%] w-0.5" style={{ background: theme.accent }} />
        {category && (
          <p className="text-xs font-bold tracking-[0.25em] mb-3 pl-4" style={{ color: theme.accent }}>
            {category.toUpperCase()}
          </p>
        )}
        <h2 className="text-3xl font-bold leading-tight pl-4" style={{ fontFamily: 'Georgia, serif', color: '#FFFFFF' }}>
          {slide.title}
        </h2>
        {subtitle && (
          <p className="text-base mt-4 pl-4" style={{ color: theme.muted }}>{subtitle}</p>
        )}
        {footer && (
          <p className="text-xs mt-auto mb-4 pl-4" style={{ color: theme.muted }}>{footer}</p>
        )}
      </div>
      {/* Decorative blocks right */}
      <div className="w-[30%] relative mr-4 my-6">
        <div className="absolute inset-0 rounded-sm" style={{ background: theme.accentLight }} />
        <div className="absolute top-[10%] left-[15%] right-[5%] bottom-[20%] rounded-sm" style={{ background: '#FFFFFF' }} />
      </div>
    </div>
  )
}

function MinContentSlide({ slide, theme, index, total }: { slide: PresentationSlide; theme: ThemeColors; index: number; total: number }) {
  const sectionNum = getSectionNum(index, total)
  return (
    <div className="flex flex-col h-full px-10 pt-7" style={{ background: theme.bg }}>
      {sectionNum && (
        <span className="text-xs font-bold mb-1" style={{ color: theme.accent }}>{sectionNum}</span>
      )}
      <h3 className="text-xl font-bold leading-tight" style={{ fontFamily: 'Georgia, serif', color: theme.title }}>
        {slide.title}
      </h3>
      <div className="w-20 h-0.5 mt-2 mb-4" style={{ background: theme.accent }} />
      <ul className="space-y-2.5 flex-1 overflow-hidden">
        <RichContentCompact items={normalizeContent(slide.content)} theme={theme} />
      </ul>
    </div>
  )
}

function MinTwoColumnSlide({ slide, theme, index, total }: { slide: PresentationSlide; theme: ThemeColors; index: number; total: number }) {
  const sectionNum = getSectionNum(index, total)
  const left = slide.leftColumn || []
  const right = slide.rightColumn || []
  const allItems = [...left, ...right]

  return (
    <div className="relative flex h-full" style={{ background: theme.bg }}>
      {/* Dark left panel */}
      <div className="w-[42%] flex flex-col justify-between p-7" style={{ background: theme.dark }}>
        {sectionNum && (
          <span className="text-xs font-bold" style={{ color: theme.accent }}>{sectionNum}</span>
        )}
        <h3 className="text-2xl font-bold leading-snug mt-2" style={{ fontFamily: 'Georgia, serif', color: '#FFFFFF' }}>
          {slide.title}
        </h3>
        <span className="text-[10px] mt-auto" style={{ color: theme.muted }}>
          {getContentItemText(slide.content[0] || '')}
        </span>
      </div>
      {/* Right panel with cards */}
      <div className="flex-1 p-6 space-y-2.5 overflow-hidden">
        {allItems.length > 0 ? allItems.map((item, i) => (
          <div key={i} className="flex items-center rounded-sm px-3 py-2.5" style={{ background: '#FFFFFF', borderLeft: `3px solid ${theme.accent}` }}>
            <span className="text-sm" style={{ color: theme.text }}>{item}</span>
          </div>
        )) : slide.content.slice(1).map((item, i) => (
          <div key={i} className="flex items-center rounded-sm px-3 py-2.5" style={{ background: '#FFFFFF', borderLeft: `3px solid ${theme.accent}` }}>
            <span className="text-sm" style={{ color: theme.text }}>{getContentItemText(item)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MinFormulaSlide({ slide, theme, index, total }: { slide: PresentationSlide; theme: ThemeColors; index: number; total: number }) {
  const sectionNum = getSectionNum(index, total)
  const formula = getContentItemText(slide.content[0] || '')
  const description = getContentItemText(slide.content[1] || '')
  const legendItems = slide.content.slice(2).map(getContentItemText)

  return (
    <div className="flex flex-col h-full px-10 pt-7" style={{ background: '#FFFFFF' }}>
      {sectionNum && (
        <span className="text-xs font-bold mb-1" style={{ color: theme.accent }}>{sectionNum}</span>
      )}
      <h3 className="text-xl font-bold" style={{ fontFamily: 'Georgia, serif', color: theme.title }}>
        {slide.title}
      </h3>
      {/* Formula box */}
      <div className="mt-4 rounded-sm px-6 py-5 flex flex-col items-center" style={{ background: theme.accentLight }}>
        <p className="text-2xl font-bold text-center" style={{ fontFamily: 'Georgia, serif', color: theme.title }}>
          {formula}
        </p>
        {description && (
          <p className="text-xs mt-2 text-center" style={{ color: theme.muted }}>{description}</p>
        )}
      </div>
      {/* Legend */}
      {legendItems.length > 0 && (
        <div className="flex gap-2 mt-3">
          {legendItems.map((item, i) => (
            <div key={i} className="flex-1 rounded-sm px-3 py-2" style={{ background: theme.dark }}>
              <span className="text-xs" style={{ color: '#FFFFFF' }}>{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MinExampleSlide({ slide, theme, index, total }: { slide: PresentationSlide; theme: ThemeColors; index: number; total: number }) {
  const sectionNum = getSectionNum(index, total)
  return (
    <div className="flex flex-col h-full px-10 pt-7" style={{ background: theme.bg }}>
      {sectionNum && (
        <span className="text-xs font-bold mb-1" style={{ color: theme.accent }}>{sectionNum}</span>
      )}
      <h3 className="text-xl font-bold" style={{ fontFamily: 'Georgia, serif', color: theme.title }}>
        {slide.title}
      </h3>
      {/* Card with accent top border */}
      <div className="mt-4 flex-1 rounded-sm overflow-hidden" style={{ background: '#FFFFFF', borderTop: `3px solid ${theme.accent}` }}>
        <div className="p-5 space-y-2">
          <RichContentCompact items={normalizeContent(slide.content)} theme={theme} />
        </div>
      </div>
    </div>
  )
}

function MinPracticeSlide({ slide, theme, index, total }: { slide: PresentationSlide; theme: ThemeColors; index: number; total: number }) {
  const sectionNum = getSectionNum(index, total)
  return (
    <div className="flex flex-col h-full px-10 pt-7" style={{ background: theme.bg }}>
      {sectionNum && (
        <span className="text-xs font-bold mb-1" style={{ color: theme.accent }}>{sectionNum}</span>
      )}
      <h3 className="text-xl font-bold" style={{ fontFamily: 'Georgia, serif', color: theme.title }}>
        {slide.title}
      </h3>
      <div className="w-full h-0.5 mt-2 mb-4" style={{ background: theme.accent }} />
      <div className="space-y-3 flex-1 overflow-hidden">
        <RichContentCompact items={normalizeContent(slide.content)} theme={theme} />
      </div>
    </div>
  )
}

function MinTableSlide({ slide, theme, index, total }: { slide: PresentationSlide; theme: ThemeColors; index: number; total: number }) {
  const sectionNum = getSectionNum(index, total)
  const td = slide.tableData
  return (
    <div className="flex flex-col h-full px-10 pt-7" style={{ background: theme.bg }}>
      {sectionNum && (
        <span className="text-xs font-bold mb-1" style={{ color: theme.accent }}>{sectionNum}</span>
      )}
      <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'Georgia, serif', color: theme.title }}>
        {slide.title}
      </h3>
      {td && td.headers.length > 0 ? (
        <div className="overflow-hidden rounded-sm text-xs">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {td.headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 text-white font-semibold text-center" style={{ background: theme.dark }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {td.rows.map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 === 0 ? theme.accentLight : '#FFFFFF' }}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-1.5 text-center" style={{ color: theme.text, borderBottom: `1px solid ${theme.accentLight}` }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <MinBulletList items={slide.content} theme={theme} />
      )}
    </div>
  )
}

function MinConclusionSlide({ slide, theme }: { slide: PresentationSlide; theme: ThemeColors }) {
  return (
    <div className="relative flex h-full" style={{ background: theme.dark }}>
      {/* Left content */}
      <div className="flex-1 flex flex-col justify-center pl-10">
        {/* Accent vertical line */}
        <div className="absolute left-8 top-[25%] bottom-[25%] w-0.5" style={{ background: theme.accent }} />
        <p className="text-[10px] font-bold tracking-[0.2em] mb-2 pl-4" style={{ color: theme.accent }}>
          СПАСИБО ЗА ВНИМАНИЕ
        </p>
        <h2 className="text-4xl font-bold pl-4" style={{ fontFamily: 'Georgia, serif', color: '#FFFFFF' }}>
          {slide.title || 'Вопросы?'}
        </h2>
        {slide.content.length > 0 && (
          <div className="mt-4 pl-4 space-y-0.5">
            {slide.content.map((line, i) => (
              <p key={i} className="text-xs" style={{ color: theme.muted }}>{getContentItemText(line)}</p>
            ))}
          </div>
        )}
      </div>
      {/* Decorative blocks */}
      <div className="w-[25%] relative mr-6 my-6">
        <div className="absolute top-0 right-0 w-full h-[55%] rounded-sm" style={{ background: theme.accentLight }} />
        <div className="absolute bottom-0 right-0 w-[80%] h-[40%] rounded-sm" style={{ background: theme.accent }} />
      </div>
    </div>
  )
}

// =============================================================================
// Minimal renderer map
// =============================================================================

export const MINIMAL_RENDERERS: SlideRendererMap = {
  title: ({ slide, theme }) => <MinTitleSlide slide={slide} theme={theme} />,
  content: ({ slide, theme, index, total }) => <MinContentSlide slide={slide} theme={theme} index={index} total={total} />,
  twoColumn: ({ slide, theme, index, total }) => <MinTwoColumnSlide slide={slide} theme={theme} index={index} total={total} />,
  table: ({ slide, theme, index, total }) => <MinTableSlide slide={slide} theme={theme} index={index} total={total} />,
  example: ({ slide, theme, index, total }) => <MinExampleSlide slide={slide} theme={theme} index={index} total={total} />,
  formula: ({ slide, theme, index, total }) => <MinFormulaSlide slide={slide} theme={theme} index={index} total={total} />,
  diagram: ({ slide, theme, index, total }) => <MinContentSlide slide={slide} theme={theme} index={index} total={total} />,
  chart: ({ slide, theme, index, total }) => <MinContentSlide slide={slide} theme={theme} index={index} total={total} />,
  practice: ({ slide, theme, index, total }) => <MinPracticeSlide slide={slide} theme={theme} index={index} total={total} />,
  conclusion: ({ slide, theme }) => <MinConclusionSlide slide={slide} theme={theme} />,
}
