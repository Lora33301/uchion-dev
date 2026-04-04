import PptxGenJS from 'pptxgenjs'
import type { PresentationSlide } from '../../../shared/types.js'
import { normalizeContent, getContentItemText } from './sanitize.js'
import { BaseSlideGenerator } from './base-slide-generator.js'

// =============================================================================
// Minimalism Theme — Warm dark+beige style
// =============================================================================

const COLORS = {
  primary: '1A1A1A',
  secondary: 'F5F3F0',
  accent: '8B7355',
  text: '2D2D2D',
  lightGray: 'E8E4DF',
  white: 'FFFFFF',
  muted: '6B6B6B',
}

export class MinimalismSlideGenerator extends BaseSlideGenerator {
  protected readonly HEADING_FONT = 'Georgia'
  protected readonly BODY_FONT = 'Arial'
  protected readonly contentHeadingColor = COLORS.primary
  protected readonly contentTextColor = COLORS.text
  protected readonly contentAccentColor = COLORS.accent
  protected readonly mutedColor = COLORS.muted

  protected override get contentSpacing() {
    return { ...super.contentSpacing, taskAfter: 8 }
  }

  private readonly WM_DARK = '555555'
  private readonly WM_LIGHT = 'C0BBB5'

  // --- Title Slide ---
  protected addTitleSlide(
    pres: PptxGenJS,
    slide: PresentationSlide,
    _slideNum: number,
    _total: number,
  ): void {
    const s = pres.addSlide()
    s.background = { fill: COLORS.primary }

    // Vertical accent line
    s.addShape(pres.ShapeType.rect, {
      x: 0.8, y: 0.8, w: 0.04, h: 4,
      fill: { color: COLORS.accent },
    })

    // Category label (from first content item or title prefix)
    const category = getContentItemText(slide.content[0] || '')
    if (category) {
      s.addText(category.toUpperCase(), {
        x: 1.1, y: 0.8, w: 5, h: 0.4,
        fontSize: 12, fontFace: this.BODY_FONT, color: COLORS.accent,
        bold: true, charSpacing: 6,
      })
    }

    // Main title
    s.addText(slide.title, {
      x: 1.1, y: 1.4, w: 5.2, h: 2,
      fontSize: 42, fontFace: this.HEADING_FONT, color: COLORS.white,
      bold: true, lineSpacing: 48,
    })

    // Subtitle (second content item)
    const subtitle = getContentItemText(slide.content[1] || '')
    if (subtitle) {
      s.addText(subtitle, {
        x: 1.1, y: 3.5, w: 5, h: 0.5,
        fontSize: 18, fontFace: this.BODY_FONT, color: COLORS.muted,
      })
    }

    // Footer info (third content item)
    const footer = getContentItemText(slide.content[2] || '')
    if (footer) {
      s.addText(footer, {
        x: 1.1, y: 4.8, w: 5, h: 0.4,
        fontSize: 11, fontFace: this.BODY_FONT, color: COLORS.muted,
      })
    }

    // Decorative blocks on the right
    s.addShape(pres.ShapeType.rect, {
      x: 6.5, y: 0.8, w: 3, h: 4,
      fill: { color: COLORS.lightGray },
    })
    s.addShape(pres.ShapeType.rect, {
      x: 7, y: 1.3, w: 2, h: 2.5,
      fill: { color: COLORS.white },
    })

    this.addWatermark(s, this.WM_DARK)
  }

  // --- Content Slide (bullets with section number) ---
  protected addContentSlide(
    pres: PptxGenJS,
    slide: PresentationSlide,
    slideNum: number,
    total: number,
    sectionNum?: string,
  ): void {
    const s = pres.addSlide()
    s.background = { fill: COLORS.secondary }

    // Section number
    if (sectionNum) {
      s.addText(sectionNum, {
        x: 0.7, y: 0.4, w: 1, h: 0.5,
        fontSize: 14, fontFace: this.BODY_FONT, color: COLORS.accent,
        bold: true,
      })
    }

    // Title
    s.addText(slide.title, {
      x: 0.7, y: sectionNum ? 0.9 : 0.5, w: 8.6, h: 0.7,
      fontSize: 28, fontFace: this.HEADING_FONT, color: COLORS.primary,
      bold: true,
    })

    // Separator
    s.addShape(pres.ShapeType.rect, {
      x: 0.7, y: sectionNum ? 1.65 : 1.25, w: 3, h: 0.03,
      fill: { color: COLORS.accent },
    })

    // Content items
    if (slide.content.length > 0) {
      const rows = this.contentElementsToRows(normalizeContent(slide.content))
      s.addText(rows, {
        x: 0.9, y: sectionNum ? 1.9 : 1.5, w: 8.4, h: 4.5,
        valign: 'top' as const, lineSpacingMultiple: 1.1,
      })
    }

    this.addWatermark(s, this.WM_LIGHT)
    this.addFooter(s, slideNum, total)
  }

  // --- Two Column Slide (dark left panel + content right) ---
  protected addTwoColumnSlide(
    pres: PptxGenJS,
    slide: PresentationSlide,
    slideNum: number,
    total: number,
    sectionNum?: string,
  ): void {
    const s = pres.addSlide()
    s.background = { fill: COLORS.secondary }

    // Dark left panel
    s.addShape(pres.ShapeType.rect, {
      x: 0, y: 0, w: 4.5, h: 7.5,
      fill: { color: COLORS.primary },
    })

    // Section number on dark panel
    if (sectionNum) {
      s.addText(sectionNum, {
        x: 0.5, y: 0.5, w: 1, h: 0.5,
        fontSize: 14, fontFace: this.BODY_FONT, color: COLORS.accent,
        bold: true,
      })
    }

    // Title on dark panel
    s.addText(slide.title, {
      x: 0.5, y: 1.2, w: 3.8, h: 2.2,
      fontSize: 28, fontFace: this.HEADING_FONT, color: COLORS.white,
      bold: true, lineSpacing: 34,
    })

    // Right panel content
    const leftItems = slide.leftColumn || []
    const rightItems = slide.rightColumn || []
    const allItems = [...leftItems, ...rightItems]

    if (allItems.length > 0) {
      // Render as definition cards with accent left border
      let cardY = 0.8
      for (const item of allItems.slice(0, 5)) {
        // Card background
        s.addShape(pres.ShapeType.rect, {
          x: 5, y: cardY, w: 4.5, h: 0.9,
          fill: { color: COLORS.white },
        })
        // Accent left border
        s.addShape(pres.ShapeType.rect, {
          x: 5, y: cardY, w: 0.05, h: 0.9,
          fill: { color: COLORS.accent },
        })
        // Card text
        s.addText(item, {
          x: 5.2, y: cardY + 0.15, w: 4.1, h: 0.6,
          fontSize: 14, fontFace: this.BODY_FONT, color: COLORS.text,
          valign: 'middle' as const,
        })
        cardY += 1.0
      }
    } else if (slide.content.length > 0) {
      // Fallback: bullet points on right
      const rows = slide.content.map((item) => ({
        text: getContentItemText(item),
        options: {
          fontSize: 14, fontFace: this.BODY_FONT, color: COLORS.text,
          bullet: { code: '2022' as const, color: COLORS.accent },
          paraSpaceAfter: 6,
        },
      }))
      s.addText(rows, {
        x: 5, y: 0.8, w: 4.5, h: 5.5,
        valign: 'top' as const, lineSpacingMultiple: 1.2,
      })
    }

    this.addWatermark(s, this.WM_LIGHT)
    this.addFooter(s, slideNum, total)
  }

  // --- Table Slide ---
  protected addTableSlide(
    pres: PptxGenJS,
    slide: PresentationSlide,
    slideNum: number,
    total: number,
    sectionNum?: string,
  ): void {
    const s = pres.addSlide()
    s.background = { fill: COLORS.secondary }

    if (sectionNum) {
      s.addText(sectionNum, {
        x: 0.7, y: 0.4, w: 1, h: 0.4,
        fontSize: 12, fontFace: this.BODY_FONT, color: COLORS.accent, bold: true,
      })
    }

    s.addText(slide.title, {
      x: 0.7, y: sectionNum ? 0.8 : 0.5, w: 8.6, h: 0.6,
      fontSize: 28, fontFace: this.HEADING_FONT, color: COLORS.primary, bold: true,
    })

    const td = slide.tableData
    if (td && td.headers.length > 0) {
      const headerRow: PptxGenJS.TableCell[] = td.headers.map(h => ({
        text: h,
        options: {
          bold: true, fontSize: 13, fontFace: this.BODY_FONT,
          color: COLORS.white, fill: { color: COLORS.primary },
          align: 'center' as const, valign: 'middle' as const,
        },
      }))

      const dataRows: PptxGenJS.TableCell[][] = td.rows.map((row, ri) =>
        row.map(cell => ({
          text: cell,
          options: {
            fontSize: 13, fontFace: this.BODY_FONT, color: COLORS.text,
            fill: { color: ri % 2 === 0 ? COLORS.lightGray : COLORS.white },
            align: 'center' as const, valign: 'middle' as const,
          },
        }))
      )

      s.addTable([headerRow, ...dataRows], {
        x: 0.7, y: sectionNum ? 1.6 : 1.3, w: 8.6,
        border: { type: 'solid', pt: 0.5, color: COLORS.lightGray },
        rowH: 0.5,
        autoPage: false,
      })
    } else {
      this.addContentSlide(pres, slide, slideNum, total, sectionNum)
      return
    }

    this.addWatermark(s, this.WM_LIGHT)
    this.addFooter(s, slideNum, total)
  }

  // --- Formula Slide ---
  protected addFormulaSlide(
    pres: PptxGenJS,
    slide: PresentationSlide,
    slideNum: number,
    total: number,
    sectionNum?: string,
  ): void {
    const s = pres.addSlide()
    s.background = { fill: COLORS.white }

    if (sectionNum) {
      s.addText(sectionNum, {
        x: 0.7, y: 0.5, w: 1, h: 0.5,
        fontSize: 12, fontFace: this.BODY_FONT, color: COLORS.accent, bold: true,
      })
    }

    s.addText(slide.title, {
      x: 0.7, y: sectionNum ? 1.0 : 0.5, w: 8.6, h: 0.7,
      fontSize: 32, fontFace: this.HEADING_FONT, color: COLORS.primary, bold: true,
    })

    // Formula box (beige background)
    const formula = getContentItemText(slide.content[0] || '')
    s.addShape(pres.ShapeType.rect, {
      x: 0.7, y: 1.9, w: 8.6, h: 2.2,
      fill: { color: COLORS.lightGray },
    })

    s.addText(formula, {
      x: 0.7, y: 2.1, w: 8.6, h: 1.2,
      fontSize: 44, fontFace: this.HEADING_FONT, color: COLORS.primary,
      bold: true, align: 'center',
    })

    // Description under formula
    const description = getContentItemText(slide.content[1] || '')
    if (description) {
      s.addText(description, {
        x: 0.7, y: 3.3, w: 8.6, h: 0.5,
        fontSize: 12, fontFace: this.BODY_FONT, color: COLORS.muted,
        align: 'center',
      })
    }

    // Legend items (remaining content as symbol-explanation pairs)
    const legendItems = slide.content.slice(2).map(getContentItemText)
    if (legendItems.length > 0) {
      const itemWidth = 8.6 / Math.max(legendItems.length, 1)
      let fx = 0.7

      for (const item of legendItems) {
        s.addShape(pres.ShapeType.rect, {
          x: fx, y: 4.3, w: itemWidth - 0.2, h: 1,
          fill: { color: COLORS.primary },
        })
        s.addText(item, {
          x: fx + 0.2, y: 4.4, w: itemWidth - 0.6, h: 0.8,
          fontSize: 11, fontFace: this.BODY_FONT, color: COLORS.white,
          valign: 'middle' as const,
        })
        fx += itemWidth
      }
    }

    this.addWatermark(s, this.WM_LIGHT)
    this.addFooter(s, slideNum, total)
  }

  // --- Example Slide (task with solution in beige box) ---
  protected addExampleSlide(
    pres: PptxGenJS,
    slide: PresentationSlide,
    slideNum: number,
    total: number,
    sectionNum?: string,
  ): void {
    const s = pres.addSlide()
    s.background = { fill: COLORS.secondary }

    if (sectionNum) {
      s.addText(sectionNum, {
        x: 0.7, y: 0.4, w: 1, h: 0.4,
        fontSize: 12, fontFace: this.BODY_FONT, color: COLORS.accent, bold: true,
      })
    }

    s.addText(slide.title, {
      x: 0.7, y: sectionNum ? 0.8 : 0.5, w: 8.6, h: 0.6,
      fontSize: 28, fontFace: this.HEADING_FONT, color: COLORS.primary, bold: true,
    })

    // White card with accent top border
    s.addShape(pres.ShapeType.rect, {
      x: 0.7, y: 1.6, w: 8.6, h: 4.8,
      fill: { color: COLORS.white },
    })
    s.addShape(pres.ShapeType.rect, {
      x: 0.7, y: 1.6, w: 8.6, h: 0.06,
      fill: { color: COLORS.accent },
    })

    if (slide.content.length > 0) {
      const rows = this.contentElementsToRows(normalizeContent(slide.content))
      s.addText(rows, {
        x: 1.0, y: 1.9, w: 8.0, h: 4.2,
        valign: 'top' as const, lineSpacingMultiple: 1.1,
      })
    }

    this.addWatermark(s, this.WM_LIGHT)
    this.addFooter(s, slideNum, total)
  }

  // --- Practice Slide (task only, no answer) ---
  protected addPracticeSlide(
    pres: PptxGenJS,
    slide: PresentationSlide,
    slideNum: number,
    total: number,
    sectionNum?: string,
  ): void {
    const s = pres.addSlide()
    s.background = { fill: COLORS.secondary }

    if (sectionNum) {
      s.addText(sectionNum, {
        x: 0.7, y: 0.4, w: 1, h: 0.4,
        fontSize: 12, fontFace: this.BODY_FONT, color: COLORS.accent, bold: true,
      })
    }

    s.addText(slide.title, {
      x: 0.7, y: sectionNum ? 0.8 : 0.5, w: 8.6, h: 0.6,
      fontSize: 28, fontFace: this.HEADING_FONT, color: COLORS.primary, bold: true,
    })

    // Accent line under title
    s.addShape(pres.ShapeType.rect, {
      x: 0.7, y: sectionNum ? 1.5 : 1.2, w: 8.6, h: 0.04,
      fill: { color: COLORS.accent },
    })

    // Task items
    if (slide.content.length > 0) {
      const rows = this.contentElementsToRows(normalizeContent(slide.content))
      s.addText(rows, {
        x: 0.9, y: sectionNum ? 1.8 : 1.5, w: 8.2, h: 4.8,
        valign: 'top' as const, lineSpacingMultiple: 1.1,
      })
    }

    this.addWatermark(s, this.WM_LIGHT)
    this.addFooter(s, slideNum, total)
  }

  // --- Diagram Slide ---
  protected addDiagramSlide(
    pres: PptxGenJS,
    slide: PresentationSlide,
    slideNum: number,
    total: number,
    sectionNum?: string,
  ): void {
    const s = pres.addSlide()
    s.background = { fill: COLORS.secondary }

    if (sectionNum) {
      s.addText(sectionNum, {
        x: 0.7, y: 0.4, w: 1, h: 0.4,
        fontSize: 12, fontFace: this.BODY_FONT, color: COLORS.accent, bold: true,
      })
    }

    s.addText(slide.title, {
      x: 0.7, y: sectionNum ? 0.8 : 0.5, w: 8.6, h: 0.6,
      fontSize: 28, fontFace: this.HEADING_FONT, color: COLORS.primary, bold: true,
    })

    // Render items as boxes in grid
    const items = slide.content.slice(0, 6).map(getContentItemText)
    const cols = items.length <= 3 ? items.length : Math.ceil(items.length / 2)
    const rowCount = items.length <= 3 ? 1 : 2
    const boxW = 3.0
    const boxH = 1.1
    const gap = 0.4
    const startX = (10 - cols * boxW - (cols - 1) * gap) / 2
    const startY = rowCount === 1 ? 3.0 : 2.0

    for (let i = 0; i < items.length; i++) {
      const row = Math.floor(i / cols)
      const col = i % cols
      const x = startX + col * (boxW + gap)
      const y = startY + row * (boxH + 0.8)

      s.addShape(pres.ShapeType.rect, {
        x, y, w: boxW, h: boxH,
        fill: { color: i === 0 ? COLORS.primary : COLORS.white },
      })
      // Accent left border for non-first items
      if (i > 0) {
        s.addShape(pres.ShapeType.rect, {
          x, y, w: 0.05, h: boxH,
          fill: { color: COLORS.accent },
        })
      }
      s.addText(items[i], {
        x: x + 0.15, y, w: boxW - 0.3, h: boxH,
        fontSize: 12, fontFace: this.BODY_FONT,
        color: i === 0 ? COLORS.white : COLORS.text,
        align: 'center', valign: 'middle' as const,
      })
    }

    this.addWatermark(s, this.WM_LIGHT)
    this.addFooter(s, slideNum, total)
  }

  // --- Chart Slide ---
  protected addChartSlide(
    pres: PptxGenJS,
    slide: PresentationSlide,
    slideNum: number,
    total: number,
    sectionNum?: string,
  ): void {
    const s = pres.addSlide()
    s.background = { fill: COLORS.secondary }

    if (sectionNum) {
      s.addText(sectionNum, {
        x: 0.7, y: 0.4, w: 1, h: 0.4,
        fontSize: 12, fontFace: this.BODY_FONT, color: COLORS.accent, bold: true,
      })
    }

    s.addText(slide.title, {
      x: 0.7, y: sectionNum ? 0.8 : 0.5, w: 8.6, h: 0.6,
      fontSize: 28, fontFace: this.HEADING_FONT, color: COLORS.primary, bold: true,
    })

    const cd = slide.chartData
    if (cd && cd.labels.length > 0 && cd.values.length > 0) {
      s.addChart('bar' as any, [{
        name: slide.title,
        labels: cd.labels,
        values: cd.values,
      }], {
        x: 0.7, y: 1.6, w: 8.6, h: 4.8,
        showValue: true,
        chartColors: [COLORS.accent],
        valGridLine: { color: COLORS.lightGray, size: 1 },
      })
    } else {
      // Fallback to content
      this.addContentSlide(pres, slide, slideNum, total, sectionNum)
      return
    }

    this.addWatermark(s, this.WM_LIGHT)
    this.addFooter(s, slideNum, total)
  }

  // --- Conclusion/End Slide ---
  protected addEndSlide(
    pres: PptxGenJS,
    slide: PresentationSlide,
  ): void {
    const s = pres.addSlide()
    s.background = { fill: COLORS.primary }

    // Accent vertical line
    s.addShape(pres.ShapeType.rect, {
      x: 0.8, y: 1.5, w: 0.04, h: 2.5,
      fill: { color: COLORS.accent },
    })

    // "СПАСИБО ЗА ВНИМАНИЕ" label
    s.addText('СПАСИБО ЗА ВНИМАНИЕ', {
      x: 1.1, y: 1.5, w: 5, h: 0.4,
      fontSize: 11, fontFace: this.BODY_FONT, color: COLORS.accent,
      bold: true, charSpacing: 4,
    })

    // Big title
    s.addText(slide.title || 'Вопросы?', {
      x: 1.1, y: 2.0, w: 5, h: 1,
      fontSize: 52, fontFace: this.HEADING_FONT, color: COLORS.white,
      bold: true,
    })

    // Contact info / summary
    if (slide.content.length > 0) {
      s.addText(slide.content.map(getContentItemText).join('\n'), {
        x: 1.1, y: 3.5, w: 4, h: 1,
        fontSize: 12, fontFace: this.BODY_FONT, color: COLORS.muted,
      })
    }

    // Decorative blocks
    s.addShape(pres.ShapeType.rect, {
      x: 7, y: 1, w: 2.5, h: 2.5,
      fill: { color: COLORS.lightGray },
    })
    s.addShape(pres.ShapeType.rect, {
      x: 7.5, y: 2.5, w: 2, h: 2,
      fill: { color: COLORS.accent },
    })

    this.addWatermark(s, this.WM_DARK)
  }
}

