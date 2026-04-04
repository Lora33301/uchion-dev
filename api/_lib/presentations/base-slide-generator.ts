import PptxGenJS from 'pptxgenjs'
import type { PresentationStructure, PresentationSlide, ContentElement } from '../../../shared/types.js'

export type TextRow = { text: string; options: Record<string, unknown> }

// =============================================================================
// Base class for themed PPTX slide generators
// =============================================================================
// Shared logic: generate() loop, getSectionNumber(), contentElementsToRows(),
// addWatermark(), addFooter(). Each theme subclass provides its own COLORS,
// FONTS, font sizes, and implements the 10 abstract slide-type methods.

export abstract class BaseSlideGenerator {
  // --- Abstract theme properties ---
  protected abstract readonly HEADING_FONT: string
  protected abstract readonly BODY_FONT: string

  // Colors used in contentElementsToRows
  protected abstract readonly contentHeadingColor: string
  protected abstract readonly contentTextColor: string
  protected abstract readonly contentAccentColor: string

  // Color for footer text
  protected abstract readonly mutedColor: string

  // --- Overridable font sizes (defaults match minimalism/kids) ---
  protected get contentFontSizes() {
    return {
      heading: 20, definition: 15, text: 14, highlight: 16,
      task: 14, formula: 18, bullet: 15,
    }
  }

  protected get contentSpacing() {
    return {
      headingBefore: 6, headingAfter: 6,
      definitionAfter: 6, textAfter: 6, highlightAfter: 6,
      taskAfter: 6, formulaBefore: 4, formulaAfter: 8,
      bulletAfter: 6,
    }
  }

  // --- Abstract slide-type methods (10 types) ---
  protected abstract addTitleSlide(pres: PptxGenJS, slide: PresentationSlide, slideNum: number, total: number): void
  protected abstract addContentSlide(pres: PptxGenJS, slide: PresentationSlide, slideNum: number, total: number, sectionNum?: string): void
  protected abstract addTwoColumnSlide(pres: PptxGenJS, slide: PresentationSlide, slideNum: number, total: number, sectionNum?: string): void
  protected abstract addTableSlide(pres: PptxGenJS, slide: PresentationSlide, slideNum: number, total: number, sectionNum?: string): void
  protected abstract addExampleSlide(pres: PptxGenJS, slide: PresentationSlide, slideNum: number, total: number, sectionNum?: string): void
  protected abstract addFormulaSlide(pres: PptxGenJS, slide: PresentationSlide, slideNum: number, total: number, sectionNum?: string): void
  protected abstract addDiagramSlide(pres: PptxGenJS, slide: PresentationSlide, slideNum: number, total: number, sectionNum?: string): void
  protected abstract addChartSlide(pres: PptxGenJS, slide: PresentationSlide, slideNum: number, total: number, sectionNum?: string): void
  protected abstract addPracticeSlide(pres: PptxGenJS, slide: PresentationSlide, slideNum: number, total: number, sectionNum?: string): void
  protected abstract addEndSlide(pres: PptxGenJS, slide: PresentationSlide): void

  // --- Shared: watermark (overridable) ---
  protected addWatermark(slide: PptxGenJS.Slide, color: string): void {
    slide.addText('УчиОн', {
      x: 8.2, y: 0.15, w: 1.8, h: 0.4,
      fontSize: 12, fontFace: this.BODY_FONT, color, align: 'right',
    })
  }

  // --- Shared: footer (overridable) ---
  protected addFooter(slide: PptxGenJS.Slide, slideNumber: number, totalSlides: number): void {
    slide.addText(`${slideNumber} / ${totalSlides}`, {
      x: 8.8, y: 6.8, w: 1.5, h: 0.3,
      fontSize: 9, fontFace: this.BODY_FONT, color: this.mutedColor, align: 'right',
    })
  }

  // --- Shared: contentElementsToRows ---
  protected contentElementsToRows(elements: ContentElement[]): TextRow[] {
    const fs = this.contentFontSizes
    const sp = this.contentSpacing

    return elements.map(el => {
      switch (el.el) {
        case 'heading':
          return {
            text: el.text,
            options: {
              fontSize: fs.heading, fontFace: this.HEADING_FONT, color: this.contentHeadingColor,
              bold: true, align: 'center' as const, breakLine: true,
              paraSpaceBefore: sp.headingBefore, paraSpaceAfter: sp.headingAfter,
            },
          }
        case 'definition':
          return {
            text: `  ${el.text}`,
            options: {
              fontSize: fs.definition, fontFace: this.BODY_FONT, color: this.contentTextColor,
              italic: true, paraSpaceAfter: sp.definitionAfter, breakLine: true,
              bullet: { code: '258E', color: this.contentAccentColor },
            },
          }
        case 'text':
          return {
            text: el.text,
            options: {
              fontSize: fs.text, fontFace: this.BODY_FONT, color: this.contentTextColor,
              paraSpaceAfter: sp.textAfter, breakLine: true,
            },
          }
        case 'highlight':
          return {
            text: el.text,
            options: {
              fontSize: fs.highlight, fontFace: this.BODY_FONT, color: this.contentAccentColor,
              bold: true, paraSpaceAfter: sp.highlightAfter, breakLine: true,
            },
          }
        case 'task':
          return {
            text: `${el.number ?? ''}. ${el.text}`,
            options: {
              fontSize: fs.task, fontFace: this.BODY_FONT, color: this.contentTextColor,
              paraSpaceAfter: sp.taskAfter, breakLine: true,
            },
          }
        case 'formula':
          return {
            text: el.text,
            options: {
              fontSize: fs.formula, fontFace: this.HEADING_FONT, color: this.contentAccentColor,
              bold: true, align: 'center' as const, breakLine: true,
              paraSpaceBefore: sp.formulaBefore, paraSpaceAfter: sp.formulaAfter,
            },
          }
        case 'bullet':
        default:
          return {
            text: el.text,
            options: {
              fontSize: fs.bullet, fontFace: this.BODY_FONT, color: this.contentTextColor,
              bullet: { code: '2022' as const, color: this.contentAccentColor },
              paraSpaceAfter: sp.bulletAfter, breakLine: true,
            },
          }
      }
    })
  }

  // --- Shared: getSectionNumber ---
  protected getSectionNumber(slides: PresentationSlide[], currentIndex: number): string | undefined {
    let sectionCount = 0
    for (let i = 0; i < slides.length; i++) {
      const type = slides[i].type
      if (type !== 'title' && type !== 'conclusion') {
        sectionCount++
        if (i === currentIndex) {
          return String(sectionCount).padStart(2, '0')
        }
      }
    }
    return undefined
  }

  // --- Shared: main generate loop ---
  async generate(structure: PresentationStructure): Promise<string> {
    const pres = new PptxGenJS()
    pres.layout = 'LAYOUT_WIDE'
    pres.title = structure.title
    pres.author = 'УчиОн'

    const total = structure.slides.length

    for (let i = 0; i < structure.slides.length; i++) {
      const slide = structure.slides[i]
      const slideNum = i + 1
      const sectionNum = this.getSectionNumber(structure.slides, i)

      switch (slide.type) {
        case 'title':
          this.addTitleSlide(pres, slide, slideNum, total)
          break
        case 'content':
          this.addContentSlide(pres, slide, slideNum, total, sectionNum)
          break
        case 'twoColumn':
          this.addTwoColumnSlide(pres, slide, slideNum, total, sectionNum)
          break
        case 'table':
          this.addTableSlide(pres, slide, slideNum, total, sectionNum)
          break
        case 'example':
          this.addExampleSlide(pres, slide, slideNum, total, sectionNum)
          break
        case 'formula':
          this.addFormulaSlide(pres, slide, slideNum, total, sectionNum)
          break
        case 'diagram':
          this.addDiagramSlide(pres, slide, slideNum, total, sectionNum)
          break
        case 'chart':
          this.addChartSlide(pres, slide, slideNum, total, sectionNum)
          break
        case 'practice':
          this.addPracticeSlide(pres, slide, slideNum, total, sectionNum)
          break
        case 'conclusion':
          this.addEndSlide(pres, slide)
          break
        default:
          this.addContentSlide(pres, slide, slideNum, total, sectionNum)
          break
      }
    }

    const base64 = await pres.write({ outputType: 'base64' }) as string
    return base64
  }
}
