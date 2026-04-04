import PptxGenJS from 'pptxgenjs'
import type { PresentationSlide } from '../../../shared/types.js'
import { normalizeContent, getContentItemText } from './sanitize.js'
import { BaseSlideGenerator } from './base-slide-generator.js'

// =============================================================================
// School Theme -- Classic warm style with gold accents
// =============================================================================

const COLORS = {
  cream: 'F5F0EA',
  slate: '8B9DAE',
  sage: 'B8C4B8',
  gold: 'C9A96E',
  dustyRose: 'C4909A',
  navy: '5C6878',
  khaki: 'D4C5A9',
  text: '2D3436',
  white: 'FFFFFF',
  muted: '6B7B8D',
  lightGold: 'F0E8D8',
  lightSage: 'E5EBE5',
}

const CARD_ACCENTS = [COLORS.gold, COLORS.dustyRose, COLORS.navy, COLORS.sage]

const WM_COLORS: Record<string, string> = {
  cream: 'C8C3BD', slate: 'A0AEC0', sage: 'CDD5CD',
}

export class SchoolSlideGenerator extends BaseSlideGenerator {
  protected readonly HEADING_FONT = 'Georgia'
  protected readonly BODY_FONT = 'Arial'
  protected readonly contentHeadingColor = COLORS.text
  protected readonly contentTextColor = COLORS.text
  protected readonly contentAccentColor = COLORS.gold
  protected readonly mutedColor = COLORS.muted

  protected override get contentFontSizes() {
    return {
      heading: 18, definition: 14, text: 13, highlight: 15,
      task: 13, formula: 17, bullet: 13,
    }
  }

  protected override get contentSpacing() {
    return { ...super.contentSpacing, formulaAfter: 6 }
  }

  // School footer has different position
  protected override addFooter(slide: PptxGenJS.Slide, slideNumber: number, totalSlides: number): void {
    slide.addText(`${slideNumber} / ${totalSlides}`, {
      x: 8.5, y: 6.9, w: 1.5, h: 0.3,
      fontSize: 9, fontFace: this.BODY_FONT, color: COLORS.muted, align: 'right',
    })
  }

  // --- Decorative helpers ---

  private addSchoolDecorations(pres: PptxGenJS, slide: PptxGenJS.Slide, variant: 'cream' | 'slate' | 'sage'): void {
    const opacity = variant === 'slate' ? 0.08 : 0.1

    // Pencil-like rectangle
    slide.addShape(pres.ShapeType.roundRect, {
      x: -0.2, y: 0.5, w: 0.15, h: 1.2,
      fill: { color: COLORS.gold, transparency: (1 - opacity) * 100 },
      rectRadius: 0.05, rotate: 25,
    })

    // Ruler-like strip top-right
    slide.addShape(pres.ShapeType.roundRect, {
      x: 8.8, y: -0.1, w: 1.5, h: 0.12,
      fill: { color: COLORS.khaki, transparency: (1 - opacity * 1.2) * 100 },
      rectRadius: 0.03, rotate: -15,
    })

    // Small circle (eraser)
    slide.addShape(pres.ShapeType.ellipse, {
      x: 9.3, y: 6.5, w: 0.5, h: 0.5,
      fill: { color: COLORS.dustyRose, transparency: (1 - opacity) * 100 },
    })

    // Small rectangle (book)
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.1, y: 6.2, w: 0.6, h: 0.45,
      fill: { color: COLORS.navy, transparency: (1 - opacity * 0.8) * 100 },
      rectRadius: 0.05, rotate: 10,
    })

    // Triangle-like shape (compass)
    slide.addShape(pres.ShapeType.roundRect, {
      x: 5.0, y: -0.15, w: 0.1, h: 0.6,
      fill: { color: COLORS.sage, transparency: (1 - opacity) * 100 },
      rectRadius: 0.03, rotate: 45,
    })
  }

  private addGoldFrame(
    pres: PptxGenJS,
    slide: PptxGenJS.Slide,
    x: number, y: number, w: number, h: number,
  ): void {
    // Outer frame
    slide.addShape(pres.ShapeType.roundRect, {
      x, y, w, h,
      fill: { color: COLORS.white },
      rectRadius: 0.15,
      line: { color: COLORS.gold, width: 2 },
      shadow: { type: 'outer', blur: 6, offset: 2, color: '000000', opacity: 0.06 },
    })
    // Inner frame (inset by 0.12)
    slide.addShape(pres.ShapeType.roundRect, {
      x: x + 0.12, y: y + 0.12, w: w - 0.24, h: h - 0.24,
      fill: { type: 'none' as any },
      rectRadius: 0.1,
      line: { color: COLORS.gold, width: 0.75, dashType: 'solid' },
    })
  }

  // --- Title Slide ---
  protected addTitleSlide(
    pres: PptxGenJS,
    slide: PresentationSlide,
    _slideNum: number,
    _total: number,
  ): void {
    const s = pres.addSlide()
    s.background = { fill: COLORS.cream }
    this.addSchoolDecorations(pres, s, 'cream')

    // Gold double-border frame card
    this.addGoldFrame(pres, s, 0.8, 0.9, 8.4, 5.0)

    // Category label
    const category = getContentItemText(slide.content[0] || '')
    if (category) {
      s.addText(category.toUpperCase(), {
        x: 1.3, y: 1.5, w: 7.4, h: 0.4,
        fontSize: 11, fontFace: this.BODY_FONT, color: COLORS.gold,
        bold: true, charSpacing: 3,
      })
    }

    // Main title
    s.addText(slide.title, {
      x: 1.3, y: 2.1, w: 7.4, h: 1.8,
      fontSize: 34, fontFace: this.HEADING_FONT, color: COLORS.text,
      bold: true, lineSpacing: 40,
    })

    // Subtitle
    const subtitle = getContentItemText(slide.content[1] || '')
    if (subtitle) {
      s.addText(subtitle, {
        x: 1.3, y: 3.9, w: 7.4, h: 0.6,
        fontSize: 15, fontFace: this.BODY_FONT, color: COLORS.muted,
      })
    }

    // Footer
    const footer = getContentItemText(slide.content[2] || '')
    if (footer) {
      s.addText(footer, {
        x: 1.3, y: 4.9, w: 7.4, h: 0.4,
        fontSize: 10, fontFace: this.BODY_FONT, color: COLORS.muted,
      })
    }

    // Small decorative gold dot
    s.addShape(pres.ShapeType.ellipse, {
      x: 8.0, y: 5.0, w: 0.25, h: 0.25,
      fill: { color: COLORS.gold },
    })

    this.addWatermark(s, WM_COLORS.cream)
  }

  // --- Content Slide ---
  protected addContentSlide(
    pres: PptxGenJS,
    slide: PresentationSlide,
    slideNum: number,
    total: number,
    sectionNum?: string,
  ): void {
    const s = pres.addSlide()
    s.background = { fill: COLORS.slate }
    this.addSchoolDecorations(pres, s, 'slate')

    // Title bar area
    if (sectionNum) {
      s.addText(sectionNum, {
        x: 0.7, y: 0.3, w: 1, h: 0.4,
        fontSize: 11, fontFace: this.BODY_FONT, color: COLORS.white, bold: true,
      })
    }

    s.addText(slide.title, {
      x: 0.7, y: sectionNum ? 0.7 : 0.4, w: 8.6, h: 0.6,
      fontSize: 24, fontFace: this.HEADING_FONT, color: COLORS.white,
      bold: true,
    })

    // Gold underline
    s.addShape(pres.ShapeType.rect, {
      x: 0.7, y: sectionNum ? 1.4 : 1.1, w: 2.5, h: 0.04,
      fill: { color: COLORS.gold },
    })

    // White content card
    const cardY = sectionNum ? 1.65 : 1.35
    s.addShape(pres.ShapeType.roundRect, {
      x: 0.5, y: cardY, w: 9, h: 6.9 - cardY - 0.5,
      fill: { color: COLORS.white },
      rectRadius: 0.12,
      shadow: { type: 'outer', blur: 4, offset: 1, color: '000000', opacity: 0.06 },
    })

    // Content
    if (slide.content.length > 0) {
      const rows = this.contentElementsToRows(normalizeContent(slide.content))
      s.addText(rows, {
        x: 0.9, y: cardY + 0.3, w: 8.2, h: 6.9 - cardY - 1.0,
        valign: 'top' as const, lineSpacingMultiple: 1.1,
      })
    }

    this.addWatermark(s, WM_COLORS.slate)
    this.addFooter(s, slideNum, total)
  }

  // --- Two Column Slide ---
  protected addTwoColumnSlide(
    pres: PptxGenJS,
    slide: PresentationSlide,
    slideNum: number,
    total: number,
    sectionNum?: string,
  ): void {
    const s = pres.addSlide()
    s.background = { fill: COLORS.slate }
    this.addSchoolDecorations(pres, s, 'slate')

    // Left panel (darker shade)
    s.addShape(pres.ShapeType.roundRect, {
      x: 0.3, y: 0.3, w: 4.2, h: 6.9,
      fill: { color: COLORS.navy },
      rectRadius: 0.15,
    })

    // Gold accent stripe on left panel
    s.addShape(pres.ShapeType.rect, {
      x: 0.3, y: 0.3, w: 0.06, h: 6.9,
      fill: { color: COLORS.gold },
    })

    // Section number
    if (sectionNum) {
      s.addText(sectionNum, {
        x: 0.7, y: 0.6, w: 1, h: 0.4,
        fontSize: 11, fontFace: this.BODY_FONT, color: COLORS.gold,
        bold: true,
      })
    }

    // Title on left panel
    s.addText(slide.title, {
      x: 0.7, y: 1.3, w: 3.5, h: 2.2,
      fontSize: 24, fontFace: this.HEADING_FONT, color: COLORS.white,
      bold: true, lineSpacing: 30,
    })

    // Right side: content cards on white
    const leftItems = slide.leftColumn || []
    const rightItems = slide.rightColumn || []
    const allItems = [...leftItems, ...rightItems]

    if (allItems.length > 0) {
      let cardY = 0.5
      allItems.slice(0, 5).forEach((item, i) => {
        const accentColor = CARD_ACCENTS[i % CARD_ACCENTS.length]
        // White card
        s.addShape(pres.ShapeType.roundRect, {
          x: 4.8, y: cardY, w: 5, h: 0.95,
          fill: { color: COLORS.white },
          rectRadius: 0.08,
          shadow: { type: 'outer', blur: 3, offset: 1, color: '000000', opacity: 0.04 },
        })
        // Colored left accent
        s.addShape(pres.ShapeType.roundRect, {
          x: 4.8, y: cardY, w: 0.06, h: 0.95,
          fill: { color: accentColor },
          rectRadius: 0.03,
        })
        s.addText(item, {
          x: 5.05, y: cardY + 0.12, w: 4.55, h: 0.7,
          fontSize: 13, fontFace: this.BODY_FONT, color: COLORS.text,
          valign: 'middle' as const,
        })
        cardY += 1.1
      })
    } else if (slide.content.length > 0) {
      const rows = slide.content.map((item) => ({
        text: getContentItemText(item),
        options: {
          fontSize: 13, fontFace: this.BODY_FONT, color: COLORS.white,
          bullet: { code: '2022' as const, color: COLORS.gold },
          paraSpaceAfter: 6,
        },
      }))
      s.addText(rows, {
        x: 4.8, y: 0.5, w: 5, h: 6,
        valign: 'top' as const, lineSpacingMultiple: 1.2,
      })
    }

    this.addWatermark(s, WM_COLORS.slate)
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
    s.background = { fill: COLORS.slate }
    this.addSchoolDecorations(pres, s, 'slate')

    if (sectionNum) {
      s.addText(sectionNum, {
        x: 0.7, y: 0.3, w: 1, h: 0.4,
        fontSize: 11, fontFace: this.BODY_FONT, color: COLORS.white, bold: true,
      })
    }

    s.addText(slide.title, {
      x: 0.7, y: sectionNum ? 0.7 : 0.4, w: 8.6, h: 0.6,
      fontSize: 24, fontFace: this.HEADING_FONT, color: COLORS.white, bold: true,
    })

    const td = slide.tableData
    if (td && td.headers.length > 0) {
      const headerRow: PptxGenJS.TableCell[] = td.headers.map(h => ({
        text: h,
        options: {
          bold: true, fontSize: 13, fontFace: this.BODY_FONT,
          color: COLORS.white, fill: { color: COLORS.navy },
          align: 'center' as const, valign: 'middle' as const,
        },
      }))

      const dataRows: PptxGenJS.TableCell[][] = td.rows.map((row, ri) =>
        row.map(cell => ({
          text: cell,
          options: {
            fontSize: 12, fontFace: this.BODY_FONT, color: COLORS.text,
            fill: { color: ri % 2 === 0 ? COLORS.lightGold : COLORS.white },
            align: 'center' as const, valign: 'middle' as const,
          },
        }))
      )

      s.addTable([headerRow, ...dataRows], {
        x: 0.7, y: sectionNum ? 1.5 : 1.2, w: 8.6,
        border: { type: 'solid', pt: 0.5, color: COLORS.khaki },
        rowH: 0.55,
        autoPage: false,
      })
    } else {
      // Fallback to content slide
      this.addContentSlide(pres, slide, slideNum, total, sectionNum)
      return
    }

    this.addWatermark(s, WM_COLORS.slate)
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
    s.background = { fill: COLORS.sage }
    this.addSchoolDecorations(pres, s, 'sage')

    if (sectionNum) {
      s.addText(sectionNum, {
        x: 0.7, y: 0.3, w: 1, h: 0.4,
        fontSize: 11, fontFace: this.BODY_FONT, color: COLORS.text, bold: true,
      })
    }

    s.addText(slide.title, {
      x: 0.7, y: sectionNum ? 0.7 : 0.4, w: 8.6, h: 0.6,
      fontSize: 24, fontFace: this.HEADING_FONT, color: COLORS.text, bold: true,
    })

    // Big formula card with gold border
    const formula = getContentItemText(slide.content[0] || '')
    s.addShape(pres.ShapeType.roundRect, {
      x: 0.7, y: 1.7, w: 8.6, h: 2.0,
      fill: { color: COLORS.white },
      rectRadius: 0.12,
      line: { color: COLORS.gold, width: 1.5 },
      shadow: { type: 'outer', blur: 4, offset: 1, color: '000000', opacity: 0.05 },
    })

    // Gold top accent bar on card
    s.addShape(pres.ShapeType.roundRect, {
      x: 0.7, y: 1.7, w: 8.6, h: 0.06,
      fill: { color: COLORS.gold },
      rectRadius: 0.03,
    })

    s.addText(formula, {
      x: 0.7, y: 1.9, w: 8.6, h: 1.2,
      fontSize: 36, fontFace: this.HEADING_FONT, color: COLORS.gold,
      bold: true, align: 'center',
    })

    // Description
    const description = getContentItemText(slide.content[1] || '')
    if (description) {
      s.addText(description, {
        x: 0.7, y: 3.1, w: 8.6, h: 0.5,
        fontSize: 12, fontFace: this.BODY_FONT, color: COLORS.muted,
        align: 'center',
      })
    }

    // Legend items
    const legendItems = slide.content.slice(2).map(getContentItemText)
    if (legendItems.length > 0) {
      const itemW = 8.6 / Math.max(legendItems.length, 1)
      let fx = 0.7
      legendItems.forEach((item, i) => {
        const color = CARD_ACCENTS[i % CARD_ACCENTS.length]
        s.addShape(pres.ShapeType.roundRect, {
          x: fx + 0.1, y: 4.1, w: itemW - 0.2, h: 0.85,
          fill: { color },
          rectRadius: 0.08,
        })
        s.addText(item, {
          x: fx + 0.25, y: 4.2, w: itemW - 0.5, h: 0.65,
          fontSize: 11, fontFace: this.BODY_FONT, color: COLORS.white,
          valign: 'middle' as const,
        })
        fx += itemW
      })
    }

    this.addWatermark(s, WM_COLORS.sage)
    this.addFooter(s, slideNum, total)
  }

  // --- Example Slide ---
  protected addExampleSlide(
    pres: PptxGenJS,
    slide: PresentationSlide,
    slideNum: number,
    total: number,
    sectionNum?: string,
  ): void {
    const s = pres.addSlide()
    s.background = { fill: COLORS.sage }
    this.addSchoolDecorations(pres, s, 'sage')

    if (sectionNum) {
      s.addText(sectionNum, {
        x: 0.7, y: 0.3, w: 1, h: 0.4,
        fontSize: 11, fontFace: this.BODY_FONT, color: COLORS.text, bold: true,
      })
    }

    s.addText(slide.title, {
      x: 0.7, y: sectionNum ? 0.7 : 0.4, w: 8.6, h: 0.6,
      fontSize: 24, fontFace: this.HEADING_FONT, color: COLORS.text, bold: true,
    })

    // White card with gold top accent
    s.addShape(pres.ShapeType.roundRect, {
      x: 0.5, y: 1.5, w: 9, h: 5.1,
      fill: { color: COLORS.white },
      rectRadius: 0.12,
      shadow: { type: 'outer', blur: 4, offset: 1, color: '000000', opacity: 0.05 },
    })
    s.addShape(pres.ShapeType.roundRect, {
      x: 0.5, y: 1.5, w: 9, h: 0.06,
      fill: { color: COLORS.gold },
      rectRadius: 0.03,
    })

    if (slide.content.length > 0) {
      const rows = this.contentElementsToRows(normalizeContent(slide.content))
      s.addText(rows, {
        x: 0.9, y: 1.8, w: 8.2, h: 4.5,
        valign: 'top' as const, lineSpacingMultiple: 1.1,
      })
    }

    this.addWatermark(s, WM_COLORS.sage)
    this.addFooter(s, slideNum, total)
  }

  // --- Practice Slide ---
  protected addPracticeSlide(
    pres: PptxGenJS,
    slide: PresentationSlide,
    slideNum: number,
    total: number,
    sectionNum?: string,
  ): void {
    const s = pres.addSlide()
    s.background = { fill: COLORS.sage }
    this.addSchoolDecorations(pres, s, 'sage')

    if (sectionNum) {
      s.addText(sectionNum, {
        x: 0.7, y: 0.3, w: 1, h: 0.4,
        fontSize: 11, fontFace: this.BODY_FONT, color: COLORS.text, bold: true,
      })
    }

    s.addText(slide.title, {
      x: 0.7, y: sectionNum ? 0.7 : 0.4, w: 8.6, h: 0.6,
      fontSize: 24, fontFace: this.HEADING_FONT, color: COLORS.text, bold: true,
    })

    // Gold underline
    s.addShape(pres.ShapeType.rect, {
      x: 0.7, y: sectionNum ? 1.4 : 1.1, w: 8.6, h: 0.04,
      fill: { color: COLORS.gold },
    })

    // White card with dusty rose left accent
    const cardY = sectionNum ? 1.6 : 1.3
    s.addShape(pres.ShapeType.roundRect, {
      x: 0.5, y: cardY, w: 9, h: 6.7 - cardY - 0.5,
      fill: { color: COLORS.white },
      rectRadius: 0.12,
      shadow: { type: 'outer', blur: 4, offset: 1, color: '000000', opacity: 0.05 },
    })

    // Dusty rose left accent strip
    s.addShape(pres.ShapeType.roundRect, {
      x: 0.5, y: cardY, w: 0.07, h: 6.7 - cardY - 0.5,
      fill: { color: COLORS.dustyRose },
      rectRadius: 0.03,
    })

    if (slide.content.length > 0) {
      const rows = this.contentElementsToRows(normalizeContent(slide.content))
      s.addText(rows, {
        x: 0.9, y: cardY + 0.3, w: 8.2, h: 6.7 - cardY - 1.1,
        valign: 'top' as const, lineSpacingMultiple: 1.1,
      })
    }

    this.addWatermark(s, WM_COLORS.sage)
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
    s.background = { fill: COLORS.sage }
    this.addSchoolDecorations(pres, s, 'sage')

    if (sectionNum) {
      s.addText(sectionNum, {
        x: 0.7, y: 0.3, w: 1, h: 0.4,
        fontSize: 11, fontFace: this.BODY_FONT, color: COLORS.text, bold: true,
      })
    }

    s.addText(slide.title, {
      x: 0.7, y: sectionNum ? 0.7 : 0.4, w: 8.6, h: 0.6,
      fontSize: 24, fontFace: this.HEADING_FONT, color: COLORS.text, bold: true,
    })

    // Diagram items as colored rounded boxes
    const items = slide.content.slice(0, 6).map(getContentItemText)
    const cols = items.length <= 3 ? items.length : Math.ceil(items.length / 2)
    const rowCount = items.length <= 3 ? 1 : 2
    const boxW = 2.8
    const boxH = 1.0
    const gap = 0.4
    const startX = (10 - cols * boxW - (cols - 1) * gap) / 2
    const startY = rowCount === 1 ? 3.0 : 2.0

    for (let i = 0; i < items.length; i++) {
      const row = Math.floor(i / cols)
      const col = i % cols
      const x = startX + col * (boxW + gap)
      const y = startY + row * (boxH + 0.8)
      const bgColor = CARD_ACCENTS[i % CARD_ACCENTS.length]

      s.addShape(pres.ShapeType.roundRect, {
        x, y, w: boxW, h: boxH,
        fill: { color: bgColor },
        rectRadius: 0.1,
      })
      s.addText(items[i], {
        x: x + 0.15, y, w: boxW - 0.3, h: boxH,
        fontSize: 13, fontFace: this.BODY_FONT, color: COLORS.white,
        align: 'center', valign: 'middle' as const,
        bold: true,
      })
    }

    this.addWatermark(s, WM_COLORS.sage)
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
    s.background = { fill: COLORS.slate }
    this.addSchoolDecorations(pres, s, 'slate')

    if (sectionNum) {
      s.addText(sectionNum, {
        x: 0.7, y: 0.3, w: 1, h: 0.4,
        fontSize: 11, fontFace: this.BODY_FONT, color: COLORS.white, bold: true,
      })
    }

    s.addText(slide.title, {
      x: 0.7, y: sectionNum ? 0.7 : 0.4, w: 8.6, h: 0.6,
      fontSize: 24, fontFace: this.HEADING_FONT, color: COLORS.white, bold: true,
    })

    const cd = slide.chartData
    if (cd && cd.labels.length > 0 && cd.values.length > 0) {
      s.addChart('bar' as any, [{
        name: slide.title,
        labels: cd.labels,
        values: cd.values,
      }], {
        x: 0.7, y: 1.5, w: 8.6, h: 5.0,
        showValue: true,
        chartColors: [COLORS.gold, COLORS.dustyRose, COLORS.navy, COLORS.sage],
        valGridLine: { color: 'C5C5C5', size: 1 },
      })
    } else {
      this.addContentSlide(pres, slide, slideNum, total, sectionNum)
      return
    }

    this.addWatermark(s, WM_COLORS.slate)
    this.addFooter(s, slideNum, total)
  }

  // --- End Slide ---
  protected addEndSlide(
    pres: PptxGenJS,
    slide: PresentationSlide,
  ): void {
    const s = pres.addSlide()
    s.background = { fill: COLORS.cream }
    this.addSchoolDecorations(pres, s, 'cream')

    // Gold double-border frame
    this.addGoldFrame(pres, s, 1.0, 0.8, 8.0, 5.8)

    // Thank-you label
    s.addText('СПАСИБО ЗА ВНИМАНИЕ!', {
      x: 1.5, y: 1.5, w: 7, h: 0.5,
      fontSize: 12, fontFace: this.BODY_FONT, color: COLORS.gold,
      bold: true, charSpacing: 4, align: 'center',
    })

    // Big title
    s.addText(slide.title || 'Вопросы?', {
      x: 1.5, y: 2.3, w: 7, h: 1.4,
      fontSize: 40, fontFace: this.HEADING_FONT, color: COLORS.text,
      bold: true, align: 'center',
    })

    // Contact info
    if (slide.content.length > 0) {
      s.addText(slide.content.map(getContentItemText).join('\n'), {
        x: 2, y: 4.0, w: 6, h: 1.2,
        fontSize: 12, fontFace: this.BODY_FONT, color: COLORS.muted,
        align: 'center',
      })
    }

    // Small gold accent dot
    s.addShape(pres.ShapeType.ellipse, {
      x: 4.75, y: 5.6, w: 0.5, h: 0.5,
      fill: { color: COLORS.gold },
    })

    this.addWatermark(s, WM_COLORS.cream)
  }
}

