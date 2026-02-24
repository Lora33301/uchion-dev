import React from 'react'
import type { PresentationSlide } from '../../../../shared/types'
import type { ThemeColors, SlideRendererMap } from '../shared/types'
import { getContentItemText, normalizeContent, RichContentCompact } from '../shared/content'

// =============================================================================
// Kids slide renderers
// =============================================================================

export const KIDS_CARD_COLORS = ['#4ECDC4', '#FF6B8A', '#A78BFA', '#FBBF24']

function getSectionNum(slideIndex: number, totalSlides: number): string | null {
  if (slideIndex === 0 || slideIndex === totalSlides - 1) return null
  return String(slideIndex).padStart(2, '0')
}

function KidsDecoCircles() {
  return (
    <>
      <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full opacity-15" style={{ background: '#4ECDC4' }} />
      <div className="absolute top-2 right-4 w-7 h-7 rounded-full opacity-15" style={{ background: '#FF6B8A' }} />
      <div className="absolute bottom-4 right-2 w-9 h-9 rounded-full opacity-12" style={{ background: '#A78BFA' }} />
      <div className="absolute bottom-2 left-4 w-5 h-5 rounded-full opacity-20" style={{ background: '#FBBF24' }} />
      <div className="absolute top-0 left-1/2 w-4 h-4 rounded-full opacity-10" style={{ background: '#FF6B8A' }} />
    </>
  )
}

function KidsBulletList({ items, theme }: { items: (string | import('../../../../shared/types').ContentElement)[]; theme: ThemeColors }) {
  return (
    <ul className="space-y-2.5 flex-1 overflow-hidden">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
          <span className="mt-1 flex-shrink-0 w-2 h-2 rounded-full" style={{ background: '#4ECDC4' }} />
          <span style={{ color: theme.text }}>{getContentItemText(item)}</span>
        </li>
      ))}
    </ul>
  )
}

function KidsTitleSlide({ slide, theme }: { slide: PresentationSlide; theme: ThemeColors }) {
  const category = getContentItemText(slide.content[0] || '')
  const subtitle = getContentItemText(slide.content[1] || '')
  const footer = getContentItemText(slide.content[2] || '')
  return (
    <div className="relative flex flex-col items-center justify-center h-full px-10" style={{ background: theme.bg }}>
      <KidsDecoCircles />
      {/* White card */}
      <div className="relative w-full max-w-[85%] bg-white rounded-2xl shadow-md px-8 py-6" style={{ borderTop: '4px solid #4ECDC4' }}>
        {category && (
          <p className="text-xs font-bold tracking-[0.15em] mb-2" style={{ color: '#4ECDC4' }}>
            {category.toUpperCase()}
          </p>
        )}
        <h2 className="text-3xl font-bold leading-tight" style={{ color: theme.title }}>
          {slide.title}
        </h2>
        {subtitle && (
          <p className="text-base mt-3" style={{ color: theme.muted }}>{subtitle}</p>
        )}
        {footer && (
          <p className="text-xs mt-4" style={{ color: theme.muted }}>{footer}</p>
        )}
        {/* Decorative squares */}
        <div className="absolute bottom-3 right-3 flex gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ background: '#FF6B8A' }} />
          <div className="w-2.5 h-2.5 rounded-sm mt-0.5" style={{ background: '#FBBF24' }} />
          <div className="w-2 h-2 rounded-sm mt-1" style={{ background: '#A78BFA' }} />
        </div>
      </div>
    </div>
  )
}

function KidsContentSlide({ slide, theme, index, total }: { slide: PresentationSlide; theme: ThemeColors; index: number; total: number }) {
  const sectionNum = getSectionNum(index, total)
  return (
    <div className="relative flex flex-col h-full px-10 pt-7" style={{ background: theme.bg }}>
      <KidsDecoCircles />
      {sectionNum && (
        <span className="text-xs font-bold mb-1" style={{ color: '#4ECDC4' }}>{sectionNum}</span>
      )}
      <h3 className="text-xl font-bold leading-tight" style={{ color: theme.title }}>
        {slide.title}
      </h3>
      <div className="w-16 h-0.5 mt-2 mb-3" style={{ background: '#4ECDC4' }} />
      {/* White card */}
      <div className="bg-white rounded-xl shadow-sm p-5 flex-1 overflow-hidden">
        <ul className="space-y-2.5">
          <RichContentCompact items={normalizeContent(slide.content)} theme={theme} />
        </ul>
      </div>
    </div>
  )
}

function KidsTwoColumnSlide({ slide, theme, index, total }: { slide: PresentationSlide; theme: ThemeColors; index: number; total: number }) {
  const sectionNum = getSectionNum(index, total)
  const left = slide.leftColumn || []
  const right = slide.rightColumn || []
  const allItems = [...left, ...right]

  return (
    <div className="relative flex h-full" style={{ background: theme.bg }}>
      <KidsDecoCircles />
      {/* Teal left panel */}
      <div className="w-[40%] flex flex-col justify-between p-6 rounded-r-2xl m-1" style={{ background: '#4ECDC4' }}>
        {sectionNum && (
          <span className="text-xs font-bold text-white/80">{sectionNum}</span>
        )}
        <h3 className="text-xl font-bold leading-snug mt-2 text-white">
          {slide.title}
        </h3>
        <span className="text-[10px] mt-auto text-white/60">
          {getContentItemText(slide.content[0] || '')}
        </span>
      </div>
      {/* Right side cards */}
      <div className="flex-1 p-4 space-y-2 overflow-hidden">
        {allItems.length > 0 ? allItems.map((item, i) => (
          <div key={i} className="bg-white rounded-lg px-3 py-2 shadow-sm text-sm"
            style={{ borderLeft: `3px solid ${KIDS_CARD_COLORS[i % KIDS_CARD_COLORS.length]}`, color: theme.text }}>
            {item}
          </div>
        )) : slide.content.slice(1).map((item, i) => (
          <div key={i} className="bg-white rounded-lg px-3 py-2 shadow-sm text-sm"
            style={{ borderLeft: `3px solid ${KIDS_CARD_COLORS[i % KIDS_CARD_COLORS.length]}`, color: theme.text }}>
            {getContentItemText(item)}
          </div>
        ))}
      </div>
    </div>
  )
}

function KidsFormulaSlide({ slide, theme, index, total }: { slide: PresentationSlide; theme: ThemeColors; index: number; total: number }) {
  const sectionNum = getSectionNum(index, total)
  const formula = getContentItemText(slide.content[0] || '')
  const description = getContentItemText(slide.content[1] || '')
  const legendItems = slide.content.slice(2).map(getContentItemText)

  return (
    <div className="relative flex flex-col h-full px-10 pt-7" style={{ background: theme.bg }}>
      <KidsDecoCircles />
      {sectionNum && (
        <span className="text-xs font-bold mb-1" style={{ color: '#4ECDC4' }}>{sectionNum}</span>
      )}
      <h3 className="text-xl font-bold" style={{ color: theme.title }}>
        {slide.title}
      </h3>
      {/* Formula card */}
      <div className="mt-4 bg-white rounded-xl shadow-sm px-6 py-5 flex flex-col items-center" style={{ borderTop: '3px solid #4ECDC4' }}>
        <p className="text-2xl font-bold text-center" style={{ color: '#4ECDC4' }}>
          {formula}
        </p>
        {description && (
          <p className="text-xs mt-2 text-center" style={{ color: theme.muted }}>{description}</p>
        )}
      </div>
      {/* Legend cards */}
      {legendItems.length > 0 && (
        <div className="flex gap-2 mt-3">
          {legendItems.map((item, i) => (
            <div key={i} className="flex-1 rounded-lg px-3 py-2 text-white text-xs"
              style={{ background: KIDS_CARD_COLORS[i % KIDS_CARD_COLORS.length] }}>
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function KidsExampleSlide({ slide, theme, index, total }: { slide: PresentationSlide; theme: ThemeColors; index: number; total: number }) {
  const sectionNum = getSectionNum(index, total)
  return (
    <div className="relative flex flex-col h-full px-10 pt-7" style={{ background: theme.bg }}>
      <KidsDecoCircles />
      {sectionNum && (
        <span className="text-xs font-bold mb-1" style={{ color: '#4ECDC4' }}>{sectionNum}</span>
      )}
      <h3 className="text-xl font-bold" style={{ color: theme.title }}>
        {slide.title}
      </h3>
      <div className="mt-4 flex-1 bg-white rounded-xl shadow-sm overflow-hidden" style={{ borderTop: '3px solid #FF6B8A' }}>
        <div className="p-5 space-y-2">
          <RichContentCompact items={normalizeContent(slide.content)} theme={theme} />
        </div>
      </div>
    </div>
  )
}

function KidsPracticeSlide({ slide, theme, index, total }: { slide: PresentationSlide; theme: ThemeColors; index: number; total: number }) {
  const sectionNum = getSectionNum(index, total)
  return (
    <div className="relative flex flex-col h-full px-10 pt-7" style={{ background: theme.bg }}>
      <KidsDecoCircles />
      {sectionNum && (
        <span className="text-xs font-bold mb-1" style={{ color: '#4ECDC4' }}>{sectionNum}</span>
      )}
      <h3 className="text-xl font-bold" style={{ color: theme.title }}>
        {slide.title}
      </h3>
      <div className="w-full h-0.5 mt-2 mb-3" style={{ background: '#4ECDC4' }} />
      <div className="bg-white rounded-xl shadow-sm p-5 flex-1 overflow-hidden" style={{ borderLeft: '3px solid #A78BFA' }}>
        <div className="space-y-3">
          <RichContentCompact items={normalizeContent(slide.content)} theme={theme} />
        </div>
      </div>
    </div>
  )
}

function KidsTableSlide({ slide, theme, index, total }: { slide: PresentationSlide; theme: ThemeColors; index: number; total: number }) {
  const sectionNum = getSectionNum(index, total)
  const td = slide.tableData
  return (
    <div className="relative flex flex-col h-full px-10 pt-7" style={{ background: theme.bg }}>
      <KidsDecoCircles />
      {sectionNum && (
        <span className="text-xs font-bold mb-1" style={{ color: '#4ECDC4' }}>{sectionNum}</span>
      )}
      <h3 className="text-xl font-bold mb-4" style={{ color: theme.title }}>
        {slide.title}
      </h3>
      {td && td.headers.length > 0 ? (
        <div className="overflow-hidden rounded-xl text-xs shadow-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {td.headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 text-white font-semibold text-center" style={{ background: '#4ECDC4' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {td.rows.map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 === 0 ? '#E0F7F5' : '#FFFFFF' }}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-1.5 text-center" style={{ color: theme.text, borderBottom: '1px solid #E0F7F5' }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <KidsBulletList items={slide.content} theme={theme} />
      )}
    </div>
  )
}

function KidsConclusionSlide({ slide, theme }: { slide: PresentationSlide; theme: ThemeColors }) {
  return (
    <div className="relative flex flex-col items-center justify-center h-full" style={{ background: theme.bg }}>
      <KidsDecoCircles />
      {/* White card */}
      <div className="bg-white rounded-2xl shadow-md px-10 py-8 text-center max-w-[80%]" style={{ borderTop: '4px solid #4ECDC4' }}>
        <p className="text-xs font-bold tracking-[0.2em] mb-2" style={{ color: '#4ECDC4' }}>
          МОЛОДЦЫ!
        </p>
        <h2 className="text-3xl font-bold" style={{ color: theme.title }}>
          {slide.title || 'Вопросы?'}
        </h2>
        {slide.content.length > 0 && (
          <div className="mt-4 space-y-0.5">
            {slide.content.map((line, i) => (
              <p key={i} className="text-xs" style={{ color: theme.muted }}>{getContentItemText(line)}</p>
            ))}
          </div>
        )}
        {/* Decorative dots */}
        <div className="flex gap-2 justify-center mt-5">
          {KIDS_CARD_COLORS.map((color, i) => (
            <div key={i} className="w-3 h-3 rounded-full" style={{ background: color }} />
          ))}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Kids renderer map
// =============================================================================

export const KIDS_RENDERERS: SlideRendererMap = {
  title: ({ slide, theme }) => <KidsTitleSlide slide={slide} theme={theme} />,
  content: ({ slide, theme, index, total }) => <KidsContentSlide slide={slide} theme={theme} index={index} total={total} />,
  twoColumn: ({ slide, theme, index, total }) => <KidsTwoColumnSlide slide={slide} theme={theme} index={index} total={total} />,
  table: ({ slide, theme, index, total }) => <KidsTableSlide slide={slide} theme={theme} index={index} total={total} />,
  example: ({ slide, theme, index, total }) => <KidsExampleSlide slide={slide} theme={theme} index={index} total={total} />,
  formula: ({ slide, theme, index, total }) => <KidsFormulaSlide slide={slide} theme={theme} index={index} total={total} />,
  diagram: ({ slide, theme, index, total }) => <KidsContentSlide slide={slide} theme={theme} index={index} total={total} />,
  chart: ({ slide, theme, index, total }) => <KidsContentSlide slide={slide} theme={theme} index={index} total={total} />,
  practice: ({ slide, theme, index, total }) => <KidsPracticeSlide slide={slide} theme={theme} index={index} total={total} />,
  conclusion: ({ slide, theme }) => <KidsConclusionSlide slide={slide} theme={theme} />,
}
