import React from 'react'
import type { PresentationSlide } from '../../../../shared/types'
import type { ThemeColors, SlideRendererMap } from '../shared/types'
import { getContentItemText, normalizeContent, RichContentCompact } from '../shared/content'

// =============================================================================
// School slide renderers
// =============================================================================

export const SCHOOL_COLORS = {
  cream: '#F5F0EA',
  slate: '#8B9DAE',
  sage: '#B8C4B8',
  gold: '#C9A96E',
  dustyRose: '#C4909A',
  navy: '#5C6878',
  khaki: '#D4C5A9',
  lightGold: '#F0E8D8',
  lightSage: '#E5EBE5',
}

const SCHOOL_CARD_ACCENTS = [SCHOOL_COLORS.gold, SCHOOL_COLORS.dustyRose, SCHOOL_COLORS.navy, SCHOOL_COLORS.sage]

function getSectionNum(slideIndex: number, totalSlides: number): string | null {
  if (slideIndex === 0 || slideIndex === totalSlides - 1) return null
  return String(slideIndex).padStart(2, '0')
}

function SchoolDecorations() {
  return (
    <>
      {/* Pencil-like shape */}
      <div className="absolute -left-1 top-8 w-1.5 h-10 rounded-sm opacity-10 rotate-[25deg]" style={{ background: SCHOOL_COLORS.gold }} />
      {/* Ruler-like strip */}
      <div className="absolute -top-1 right-4 w-12 h-1 rounded-sm opacity-12 -rotate-[15deg]" style={{ background: SCHOOL_COLORS.khaki }} />
      {/* Eraser circle */}
      <div className="absolute bottom-2 right-2 w-4 h-4 rounded-full opacity-10" style={{ background: SCHOOL_COLORS.dustyRose }} />
      {/* Book rectangle */}
      <div className="absolute bottom-3 left-2 w-5 h-3.5 rounded-sm opacity-8 rotate-[10deg]" style={{ background: SCHOOL_COLORS.navy }} />
    </>
  )
}

function SchoolBulletList({ items, theme }: { items: (string | import('../../../../shared/types').ContentElement)[]; theme: ThemeColors }) {
  return (
    <ul className="space-y-2.5 flex-1 overflow-hidden">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
          <span className="mt-1 flex-shrink-0 w-2 h-2 rounded-full" style={{ background: SCHOOL_COLORS.gold }} />
          <span style={{ color: theme.text }}>{getContentItemText(item)}</span>
        </li>
      ))}
    </ul>
  )
}

function SchoolTitleSlide({ slide, theme }: { slide: PresentationSlide; theme: ThemeColors }) {
  const category = getContentItemText(slide.content[0] || '')
  const subtitle = getContentItemText(slide.content[1] || '')
  const footer = getContentItemText(slide.content[2] || '')
  return (
    <div className="relative flex flex-col items-center justify-center h-full px-10" style={{ background: SCHOOL_COLORS.cream }}>
      <SchoolDecorations />
      {/* White card with gold double-border */}
      <div className="relative w-full max-w-[85%] bg-white rounded-xl px-8 py-6"
        style={{ border: `2px solid ${SCHOOL_COLORS.gold}`, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        {/* Inner border */}
        <div className="absolute inset-[5px] rounded-lg pointer-events-none" style={{ border: `0.75px solid ${SCHOOL_COLORS.gold}` }} />
        {category && (
          <p className="text-xs font-bold tracking-[0.15em] mb-2" style={{ color: SCHOOL_COLORS.gold }}>
            {category.toUpperCase()}
          </p>
        )}
        <h2 className="text-3xl font-bold leading-tight" style={{ color: theme.title, fontFamily: 'Georgia, serif' }}>
          {slide.title}
        </h2>
        {subtitle && (
          <p className="text-sm mt-3" style={{ color: theme.muted }}>{subtitle}</p>
        )}
        {footer && (
          <p className="text-xs mt-4" style={{ color: theme.muted }}>{footer}</p>
        )}
        {/* Gold dot decoration */}
        <div className="absolute bottom-3 right-4 w-2 h-2 rounded-full" style={{ background: SCHOOL_COLORS.gold }} />
      </div>
    </div>
  )
}

function SchoolContentSlide({ slide, theme, index, total }: { slide: PresentationSlide; theme: ThemeColors; index: number; total: number }) {
  const sectionNum = getSectionNum(index, total)
  return (
    <div className="relative flex flex-col h-full px-10 pt-6" style={{ background: SCHOOL_COLORS.slate }}>
      <SchoolDecorations />
      {sectionNum && (
        <span className="text-xs font-bold mb-1 text-white/80">{sectionNum}</span>
      )}
      <h3 className="text-xl font-bold leading-tight text-white" style={{ fontFamily: 'Georgia, serif' }}>
        {slide.title}
      </h3>
      <div className="w-20 h-0.5 mt-2 mb-3" style={{ background: SCHOOL_COLORS.gold }} />
      {/* White content card */}
      <div className="bg-white rounded-lg shadow-sm p-5 flex-1 overflow-hidden">
        <ul className="space-y-2.5">
          <RichContentCompact items={normalizeContent(slide.content)} theme={{ ...theme, accent: SCHOOL_COLORS.gold }} />
        </ul>
      </div>
    </div>
  )
}

function SchoolTwoColumnSlide({ slide, theme, index, total }: { slide: PresentationSlide; theme: ThemeColors; index: number; total: number }) {
  const sectionNum = getSectionNum(index, total)
  const left = slide.leftColumn || []
  const right = slide.rightColumn || []
  const allItems = [...left, ...right]

  return (
    <div className="relative flex h-full" style={{ background: SCHOOL_COLORS.slate }}>
      <SchoolDecorations />
      {/* Navy left panel with gold stripe */}
      <div className="w-[40%] flex flex-col justify-between p-6 relative" style={{ background: SCHOOL_COLORS.navy }}>
        <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: SCHOOL_COLORS.gold }} />
        {sectionNum && (
          <span className="text-xs font-bold" style={{ color: SCHOOL_COLORS.gold }}>{sectionNum}</span>
        )}
        <h3 className="text-xl font-bold leading-snug mt-2 text-white" style={{ fontFamily: 'Georgia, serif' }}>
          {slide.title}
        </h3>
        <span className="text-[10px] mt-auto text-white/50">
          {getContentItemText(slide.content[0] || '')}
        </span>
      </div>
      {/* Right side cards */}
      <div className="flex-1 p-4 space-y-2 overflow-hidden">
        {allItems.length > 0 ? allItems.map((item, i) => (
          <div key={i} className="bg-white rounded-lg px-3 py-2 shadow-sm text-sm"
            style={{ borderLeft: `3px solid ${SCHOOL_CARD_ACCENTS[i % SCHOOL_CARD_ACCENTS.length]}`, color: theme.text }}>
            {item}
          </div>
        )) : slide.content.slice(1).map((item, i) => (
          <div key={i} className="bg-white rounded-lg px-3 py-2 shadow-sm text-sm"
            style={{ borderLeft: `3px solid ${SCHOOL_CARD_ACCENTS[i % SCHOOL_CARD_ACCENTS.length]}`, color: theme.text }}>
            {getContentItemText(item)}
          </div>
        ))}
      </div>
    </div>
  )
}

function SchoolFormulaSlide({ slide, theme, index, total }: { slide: PresentationSlide; theme: ThemeColors; index: number; total: number }) {
  const sectionNum = getSectionNum(index, total)
  const formula = getContentItemText(slide.content[0] || '')
  const description = getContentItemText(slide.content[1] || '')
  const legendItems = slide.content.slice(2).map(getContentItemText)

  return (
    <div className="relative flex flex-col h-full px-10 pt-6" style={{ background: SCHOOL_COLORS.sage }}>
      <SchoolDecorations />
      {sectionNum && (
        <span className="text-xs font-bold mb-1" style={{ color: theme.text }}>{sectionNum}</span>
      )}
      <h3 className="text-xl font-bold" style={{ color: theme.title, fontFamily: 'Georgia, serif' }}>
        {slide.title}
      </h3>
      {/* Formula card with gold border */}
      <div className="mt-4 bg-white rounded-lg px-6 py-5 flex flex-col items-center"
        style={{ border: `1.5px solid ${SCHOOL_COLORS.gold}`, borderTop: `3px solid ${SCHOOL_COLORS.gold}` }}>
        <p className="text-2xl font-bold text-center" style={{ color: SCHOOL_COLORS.gold, fontFamily: 'Georgia, serif' }}>
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
              style={{ background: SCHOOL_CARD_ACCENTS[i % SCHOOL_CARD_ACCENTS.length] }}>
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SchoolExampleSlide({ slide, theme, index, total }: { slide: PresentationSlide; theme: ThemeColors; index: number; total: number }) {
  const sectionNum = getSectionNum(index, total)
  return (
    <div className="relative flex flex-col h-full px-10 pt-6" style={{ background: SCHOOL_COLORS.sage }}>
      <SchoolDecorations />
      {sectionNum && (
        <span className="text-xs font-bold mb-1" style={{ color: theme.text }}>{sectionNum}</span>
      )}
      <h3 className="text-xl font-bold" style={{ color: theme.title, fontFamily: 'Georgia, serif' }}>
        {slide.title}
      </h3>
      <div className="mt-4 flex-1 bg-white rounded-lg shadow-sm overflow-hidden" style={{ borderTop: `3px solid ${SCHOOL_COLORS.gold}` }}>
        <div className="p-5 space-y-2">
          <RichContentCompact items={normalizeContent(slide.content)} theme={{ ...theme, accent: SCHOOL_COLORS.gold }} />
        </div>
      </div>
    </div>
  )
}

function SchoolPracticeSlide({ slide, theme, index, total }: { slide: PresentationSlide; theme: ThemeColors; index: number; total: number }) {
  const sectionNum = getSectionNum(index, total)
  return (
    <div className="relative flex flex-col h-full px-10 pt-6" style={{ background: SCHOOL_COLORS.sage }}>
      <SchoolDecorations />
      {sectionNum && (
        <span className="text-xs font-bold mb-1" style={{ color: theme.text }}>{sectionNum}</span>
      )}
      <h3 className="text-xl font-bold" style={{ color: theme.title, fontFamily: 'Georgia, serif' }}>
        {slide.title}
      </h3>
      <div className="w-full h-0.5 mt-2 mb-3" style={{ background: SCHOOL_COLORS.gold }} />
      <div className="bg-white rounded-lg shadow-sm p-5 flex-1 overflow-hidden" style={{ borderLeft: `3px solid ${SCHOOL_COLORS.dustyRose}` }}>
        <div className="space-y-3">
          <RichContentCompact items={normalizeContent(slide.content)} theme={{ ...theme, accent: SCHOOL_COLORS.gold }} />
        </div>
      </div>
    </div>
  )
}

function SchoolTableSlide({ slide, theme, index, total }: { slide: PresentationSlide; theme: ThemeColors; index: number; total: number }) {
  const sectionNum = getSectionNum(index, total)
  const td = slide.tableData
  return (
    <div className="relative flex flex-col h-full px-10 pt-6" style={{ background: SCHOOL_COLORS.slate }}>
      <SchoolDecorations />
      {sectionNum && (
        <span className="text-xs font-bold mb-1 text-white/80">{sectionNum}</span>
      )}
      <h3 className="text-xl font-bold mb-4 text-white" style={{ fontFamily: 'Georgia, serif' }}>
        {slide.title}
      </h3>
      {td && td.headers.length > 0 ? (
        <div className="overflow-hidden rounded-lg text-xs shadow-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {td.headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 text-white font-semibold text-center" style={{ background: SCHOOL_COLORS.navy }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {td.rows.map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 === 0 ? SCHOOL_COLORS.lightGold : '#FFFFFF' }}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-1.5 text-center" style={{ color: theme.text, borderBottom: `1px solid ${SCHOOL_COLORS.lightGold}` }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <SchoolBulletList items={slide.content} theme={theme} />
      )}
    </div>
  )
}

function SchoolConclusionSlide({ slide, theme }: { slide: PresentationSlide; theme: ThemeColors }) {
  return (
    <div className="relative flex flex-col items-center justify-center h-full" style={{ background: SCHOOL_COLORS.cream }}>
      <SchoolDecorations />
      {/* White card with gold double-border */}
      <div className="relative bg-white rounded-xl px-10 py-8 text-center max-w-[80%]"
        style={{ border: `2px solid ${SCHOOL_COLORS.gold}`, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div className="absolute inset-[5px] rounded-lg pointer-events-none" style={{ border: `0.75px solid ${SCHOOL_COLORS.gold}` }} />
        <p className="text-xs font-bold tracking-[0.2em] mb-2" style={{ color: SCHOOL_COLORS.gold }}>
          СПАСИБО ЗА ВНИМАНИЕ!
        </p>
        <h2 className="text-3xl font-bold" style={{ color: theme.title, fontFamily: 'Georgia, serif' }}>
          {slide.title || 'Вопросы?'}
        </h2>
        {slide.content.length > 0 && (
          <div className="mt-4 space-y-0.5">
            {slide.content.map((line, i) => (
              <p key={i} className="text-xs" style={{ color: theme.muted }}>{getContentItemText(line)}</p>
            ))}
          </div>
        )}
        {/* Gold dot */}
        <div className="flex justify-center mt-5">
          <div className="w-3 h-3 rounded-full" style={{ background: SCHOOL_COLORS.gold }} />
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// School renderer map
// =============================================================================

export const SCHOOL_RENDERERS: SlideRendererMap = {
  title: ({ slide, theme }) => <SchoolTitleSlide slide={slide} theme={theme} />,
  content: ({ slide, theme, index, total }) => <SchoolContentSlide slide={slide} theme={theme} index={index} total={total} />,
  twoColumn: ({ slide, theme, index, total }) => <SchoolTwoColumnSlide slide={slide} theme={theme} index={index} total={total} />,
  table: ({ slide, theme, index, total }) => <SchoolTableSlide slide={slide} theme={theme} index={index} total={total} />,
  example: ({ slide, theme, index, total }) => <SchoolExampleSlide slide={slide} theme={theme} index={index} total={total} />,
  formula: ({ slide, theme, index, total }) => <SchoolFormulaSlide slide={slide} theme={theme} index={index} total={total} />,
  diagram: ({ slide, theme, index, total }) => <SchoolContentSlide slide={slide} theme={theme} index={index} total={total} />,
  chart: ({ slide, theme, index, total }) => <SchoolContentSlide slide={slide} theme={theme} index={index} total={total} />,
  practice: ({ slide, theme, index, total }) => <SchoolPracticeSlide slide={slide} theme={theme} index={index} total={total} />,
  conclusion: ({ slide, theme }) => <SchoolConclusionSlide slide={slide} theme={theme} />,
}
