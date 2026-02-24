import { useState } from 'react'
import { rebuildPdf } from '../lib/api'
import { buildWorksheetPdf } from '../lib/pdf-client'
import type { UseWorksheetEditorReturn } from './useWorksheetEditor'
import type { PdfTemplateId } from '../components/PdfTemplateModal'

export interface UseWorksheetPdfReturn {
  showPdfModal: boolean
  setShowPdfModal: (open: boolean) => void
  pdfLoading: boolean
  handleDownloadPdf: () => void
  handlePdfTemplateSelect: (templateId: PdfTemplateId) => Promise<void>
}

/**
 * Encapsulates all PDF download logic shared between WorksheetPage and SavedWorksheetPage.
 * Handles caching (standard template reuse), server-side rebuild, and client-side fallback.
 */
export function useWorksheetPdf(editor: Pick<UseWorksheetEditorReturn, 'worksheet'>): UseWorksheetPdfReturn {
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const handleDownloadPdf = () => {
    if (!editor.worksheet) return
    setShowPdfModal(true)
  }

  const handlePdfTemplateSelect = async (templateId: PdfTemplateId) => {
    const currentWorksheet = editor.worksheet
    if (!currentWorksheet) return

    setPdfLoading(true)
    try {
      let base64: string | null = null

      // Use cached PDF only for standard template when available
      if (templateId === 'standard' && currentWorksheet.pdfBase64 && currentWorksheet.pdfBase64.length > 0) {
        base64 = currentWorksheet.pdfBase64
      } else {
        base64 = await rebuildPdf(currentWorksheet, templateId)
      }

      // Fallback to client-side only for standard template
      if (!base64 && templateId === 'standard') {
        const blob = await buildWorksheetPdf(currentWorksheet)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${(currentWorksheet.topic || 'worksheet').replace(/\s+/g, '-')}.pdf`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
        setShowPdfModal(false)
        return
      }

      if (!base64) {
        alert('Не удалось создать PDF. Попробуйте еще раз.')
        return
      }

      const binaryString = atob(base64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: 'application/pdf' })

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(currentWorksheet.topic || 'worksheet').replace(/\s+/g, '-')}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setShowPdfModal(false)
    } catch (err) {
      void err
      alert('Не удалось создать PDF. Попробуйте еще раз.')
    } finally {
      setPdfLoading(false)
    }
  }

  return {
    showPdfModal,
    setShowPdfModal,
    pdfLoading,
    handleDownloadPdf,
    handlePdfTemplateSelect,
  }
}
