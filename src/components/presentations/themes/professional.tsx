import React from 'react'
import type { PresentationSlide } from '../../../../shared/types'
import type { ThemeColors, SlideRendererMap } from '../shared/types'
import { getContentItemText, normalizeContent, RichContent } from '../shared/content'
import { SlideHeader } from '../shared/components'

// =============================================================================
// Professional (default) slide renderers
// =============================================================================

function BulletList({ items, theme }: { items: (string | import('../../../../shared/types').ContentElement)[]; theme: ThemeColors }) {
  return (
    <ul className="mt-5 space-y-3 flex-1 overflow-hidden">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-lg leading-relaxed">
          <span className="mt-1.5 flex-shrink-0 w-2.5 h-2.5 rounded-full" style={{ background: theme.accent }} />
          <span style={{ color: theme.text }}>{getContentItemText(item)}</span>
        </li>
      ))}
    </ul>
  )
}

function TitleSlide({ slide, theme }: { slide: PresentationSlide; theme: ThemeColors }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-12" style={{ background: theme.bg }}>
      <div className="absolute top-0 left-0 right-0 h-2" style={{ background: theme.accent }} />
      {/* Decorative vertical accent */}
      <div className="absolute left-8 top-[20%] bottom-[20%] w-0.5" style={{ background: theme.accent }} />
      <h2 className="text-4xl sm:text-5xl font-bold text-center leading-tight mb-4" style={{ color: theme.title, fontFamily: 'Georgia, serif' }}>
        {slide.title}
      </h2>
      {slide.content.length > 0 && (
        <p className="text-lg text-center opacity-80 max-w-lg" style={{ color: theme.text }}>
          {slide.content.map(getContentItemText).join(' ')}
        </p>
      )}
    </div>
  )
}

function ContentSlide({ slide, theme }: { slide: PresentationSlide; theme: ThemeColors }) {
  return (
    <div className="flex flex-col h-full px-10 pt-8" style={{ background: theme.bg }}>
      <SlideHeader title={slide.title} theme={theme} />
      <div className="mt-5 bg-gray-50 rounded-xl p-5 flex-1 overflow-hidden">
        <div className="space-y-3">
          <RichContent items={normalizeContent(slide.content)} theme={theme} />
        </div>
      </div>
    </div>
  )
}

function TwoColumnSlide({ slide, theme }: { slide: PresentationSlide; theme: ThemeColors }) {
  const left = slide.leftColumn || []
  const right = slide.rightColumn || []
  return (
    <div className="flex flex-col h-full px-10 pt-8" style={{ background: theme.bg }}>
      <SlideHeader title={slide.title} theme={theme} />
      <div className="flex gap-6 mt-5 flex-1 overflow-hidden">
        <div className="flex-1 space-y-3 bg-gray-50 rounded-xl p-4">
          {left.map((item, i) => (
            <div key={i} className="flex items-start gap-2.5 text-[17px] leading-relaxed">
              <span className="mt-1.5 flex-shrink-0 w-2.5 h-2.5 rounded-full" style={{ background: theme.accent }} />
              <span style={{ color: theme.text }}>{item}</span>
            </div>
          ))}
        </div>
        <div className="w-px self-stretch" style={{ background: theme.accent, opacity: 0.3 }} />
        <div className="flex-1 space-y-3 bg-gray-50 rounded-xl p-4">
          {right.map((item, i) => (
            <div key={i} className="flex items-start gap-2.5 text-[17px] leading-relaxed">
              <span className="mt-1.5 flex-shrink-0 w-2.5 h-2.5 rounded-full" style={{ background: theme.accent }} />
              <span style={{ color: theme.text }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TableSlide({ slide, theme }: { slide: PresentationSlide; theme: ThemeColors }) {
  const td = slide.tableData
  return (
    <div className="flex flex-col h-full px-10 pt-8" style={{ background: theme.bg }}>
      <SlideHeader title={slide.title} theme={theme} />
      {td && td.headers.length > 0 ? (
        <div className="mt-5 overflow-hidden rounded-lg text-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {td.headers.map((h, i) => (
                  <th key={i} className="px-4 py-2.5 text-white font-semibold text-center" style={{ background: theme.accent }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {td.rows.map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 === 0 ? '#F8F8F8' : '#FFFFFF' }}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-2 text-center border-b border-gray-200" style={{ color: theme.text }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <BulletList items={slide.content} theme={theme} />
      )}
    </div>
  )
}

function ExampleSlide({ slide, theme }: { slide: PresentationSlide; theme: ThemeColors }) {
  return (
    <div className="flex flex-col h-full px-10 pt-8" style={{ background: theme.bg }}>
      <SlideHeader title={slide.title} theme={theme} />
      <div className="mt-5 rounded-xl p-6 flex-1 overflow-hidden" style={{ background: theme.accentLight, borderTop: `3px solid ${theme.accent}` }}>
        <RichContent items={normalizeContent(slide.content)} theme={theme} />
      </div>
    </div>
  )
}

function FormulaSlide({ slide, theme }: { slide: PresentationSlide; theme: ThemeColors }) {
  const formula = getContentItemText(slide.content[0] || '')
  const explanation = slide.content.slice(1).map(getContentItemText)
  return (
    <div className="flex flex-col h-full px-10 pt-8" style={{ background: theme.bg }}>
      <SlideHeader title={slide.title} theme={theme} />
      <div className="flex-1 flex flex-col items-center justify-center gap-5">
        <p className="text-3xl font-bold text-center" style={{ color: theme.accent }}>{formula}</p>
        {explanation.length > 0 && (
          <div className="space-y-2 text-center">
            {explanation.map((line, i) => (
              <p key={i} className="text-base" style={{ color: theme.text }}>{line}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DiagramSlide({ slide, theme }: { slide: PresentationSlide; theme: ThemeColors }) {
  const items = slide.content.slice(0, 6).map(getContentItemText)
  return (
    <div className="flex flex-col h-full px-10 pt-8" style={{ background: theme.bg }}>
      <SlideHeader title={slide.title} theme={theme} />
      <div className="flex-1 flex flex-wrap items-center justify-center gap-4 mt-4">
        {items.map((item, i) => (
          <div
            key={i}
            className="px-5 py-3 rounded-lg text-sm text-center font-medium border"
            style={{
              background: i === 0 ? theme.accent : '#F0F0F0',
              color: i === 0 ? '#FFFFFF' : theme.text,
              borderColor: theme.accent,
              minWidth: '120px',
              maxWidth: '200px',
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

function ChartSlide({ slide, theme }: { slide: PresentationSlide; theme: ThemeColors }) {
  const cd = slide.chartData
  const hasChart = cd && cd.labels.length > 0 && cd.values.length > 0
  const maxVal = hasChart ? Math.max(...cd!.values, 1) : 1

  return (
    <div className="flex flex-col h-full px-10 pt-8" style={{ background: theme.bg }}>
      <SlideHeader title={slide.title} theme={theme} />
      {hasChart ? (
        <div className="mt-5 flex-1 space-y-3 overflow-hidden">
          {cd!.labels.map((label, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span className="w-28 truncate text-right flex-shrink-0" style={{ color: theme.text }}>{label}</span>
              <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                <div
                  className="h-full rounded transition-all"
                  style={{ width: `${(cd!.values[i] / maxVal) * 100}%`, background: theme.accent }}
                />
              </div>
              <span className="w-10 text-right font-semibold flex-shrink-0" style={{ color: theme.accent }}>
                {cd!.values[i]}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <BulletList items={slide.content} theme={theme} />
      )}
    </div>
  )
}

function PracticeSlide({ slide, theme }: { slide: PresentationSlide; theme: ThemeColors }) {
  return (
    <div className="flex flex-col h-full px-10 pt-8" style={{ background: theme.bg }}>
      <SlideHeader title={slide.title} theme={theme} />
      <div className="w-full h-px mt-2" style={{ background: theme.accent }} />
      <div className="mt-5 bg-gray-50 rounded-xl p-5 flex-1 overflow-hidden" style={{ borderLeft: `3px solid ${theme.accent}` }}>
        <div className="space-y-3">
          <RichContent items={normalizeContent(slide.content)} theme={theme} />
        </div>
      </div>
    </div>
  )
}

function ConclusionSlide({ slide, theme }: { slide: PresentationSlide; theme: ThemeColors }) {
  const elements = normalizeContent(slide.content)
  return (
    <div className="flex flex-col h-full px-10 pt-10" style={{ background: theme.bg }}>
      <div className="absolute top-0 left-0 right-0 h-3" style={{ background: theme.accent }} />
      <h3 className="text-3xl font-bold text-center mb-6" style={{ color: theme.title, fontFamily: 'Georgia, serif' }}>{slide.title}</h3>
      <div className="space-y-3 flex-1 overflow-hidden">
        {elements.map((el, i) => (
          el.el === 'bullet' ? (
            <div key={i} className="flex items-start gap-3 text-lg leading-relaxed">
              <span className="flex-shrink-0 mt-0.5 text-lg" style={{ color: theme.accent }}>&#10003;</span>
              <span style={{ color: theme.text }}>{el.text}</span>
            </div>
          ) : (
            <React.Fragment key={i}><RichContent items={[el]} theme={theme} /></React.Fragment>
          )
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// Professional renderer map
// =============================================================================

export const PROFESSIONAL_RENDERERS: SlideRendererMap = {
  title: ({ slide, theme }) => <TitleSlide slide={slide} theme={theme} />,
  content: ({ slide, theme }) => <ContentSlide slide={slide} theme={theme} />,
  twoColumn: ({ slide, theme }) => <TwoColumnSlide slide={slide} theme={theme} />,
  table: ({ slide, theme }) => <TableSlide slide={slide} theme={theme} />,
  example: ({ slide, theme }) => <ExampleSlide slide={slide} theme={theme} />,
  formula: ({ slide, theme }) => <FormulaSlide slide={slide} theme={theme} />,
  diagram: ({ slide, theme }) => <DiagramSlide slide={slide} theme={theme} />,
  chart: ({ slide, theme }) => <ChartSlide slide={slide} theme={theme} />,
  practice: ({ slide, theme }) => <PracticeSlide slide={slide} theme={theme} />,
  conclusion: ({ slide, theme }) => <ConclusionSlide slide={slide} theme={theme} />,
}
