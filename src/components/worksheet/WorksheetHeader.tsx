import React from 'react'
import { Link } from 'react-router-dom'
import EditModeToolbar from '../EditModeToolbar'
import type { UseWorksheetEditorReturn } from '../../hooks/useWorksheetEditor'

interface WorksheetHeaderProps {
  editor: Pick<
    UseWorksheetEditorReturn,
    'isEditMode' | 'isDirty' | 'isSaving' | 'error' | 'enterEditMode' | 'saveChanges'
  >
  /** Primary label shown in the header (topic or subject+grade) */
  primaryLabel: string
  /** Secondary label shown below the primary label */
  secondaryLabel?: string
  /**
   * When provided, renders a back-navigation chevron button.
   * Also switches the header to a three-column layout with a centered info block.
   */
  onBack?: () => void
  /** Cancel button handler for the edit mode toolbar */
  onCancel: () => void
  /** New-generation button handler */
  onNewGeneration: () => void
  /** Print button handler */
  onPrint: () => void
  /** Download PDF button handler */
  onDownloadPdf: () => void
  /**
   * Controls the visual style of the print button.
   * - 'icon-only': plain rounded icon button with no label (WorksheetPage style)
   * - 'icon-with-label': icon + "Печать" label in group layout (SavedWorksheetPage style)
   * Defaults to 'icon-with-label'.
   */
  printButtonStyle?: 'icon-only' | 'icon-with-label'
}

const PrintIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
  </svg>
)

/**
 * Shared sticky header used by both WorksheetPage and SavedWorksheetPage.
 *
 * The two layouts differ only in:
 * - Whether a back-chevron button appears (controlled by onBack)
 * - Where the info text sits (inline vs. centered)
 * - The print button visual style (controlled by printButtonStyle)
 */
export default function WorksheetHeader({
  editor,
  primaryLabel,
  secondaryLabel,
  onBack,
  onCancel,
  onNewGeneration,
  onPrint,
  onDownloadPdf,
  printButtonStyle = 'icon-with-label',
}: WorksheetHeaderProps) {
  return (
    <header className="border-b bg-white shadow-sm sticky top-0 z-50 print:hidden">
      <div className="mx-auto max-w-7xl px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Logo + optional back button + optional inline title */}
          <div className={`flex items-center ${onBack ? 'gap-3' : 'gap-6'}`}>
            <Link to="/" className="flex-shrink-0 hover:opacity-80 transition-opacity">
              <img src="/logo.png" alt="УчиОн" className="h-14" />
            </Link>

            {onBack && (
              <button
                onClick={onBack}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-indigo-100 bg-white shadow-sm transition-all hover:bg-indigo-50 active:scale-95"
                title="К списку листов"
              >
                <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>
            )}

            {/* Inline info block — only when no back button (WorksheetPage layout) */}
            {!onBack && (
              <div className="hidden sm:block">
                <div className="text-sm font-medium text-gray-900">
                  {primaryLabel}
                  {editor.isEditMode && <span className="ml-2 text-indigo-500">(редактирование)</span>}
                </div>
                {secondaryLabel && (
                  <div className="text-xs text-gray-500">{secondaryLabel}</div>
                )}
              </div>
            )}
          </div>

          {/* Center info block — only when back button present (SavedWorksheetPage layout) */}
          {onBack && (
            <div className="hidden sm:block text-center flex-1 px-4">
              <div className="text-sm font-medium text-gray-900">
                {primaryLabel}
                {editor.isEditMode && <span className="ml-2 text-indigo-500">(редактирование)</span>}
              </div>
              {secondaryLabel && (
                <div className="text-xs text-gray-500 truncate max-w-md mx-auto">{secondaryLabel}</div>
              )}
            </div>
          )}

          {/* Right: edit toolbar + action buttons */}
          <div className="flex items-center gap-4">
            <EditModeToolbar
              isEditMode={editor.isEditMode}
              isDirty={editor.isDirty}
              isSaving={editor.isSaving}
              error={editor.error}
              onEdit={editor.enterEditMode}
              onSave={editor.saveChanges}
              onCancel={onCancel}
            />

            {!editor.isEditMode && (
              <>
                <button
                  onClick={onNewGeneration}
                  className="group flex flex-col items-center gap-0.5 pt-4"
                  title="Создать новый материал"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-indigo-100 bg-white shadow-sm transition-all group-hover:bg-indigo-50 group-active:scale-95">
                    <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-medium text-gray-500 group-hover:text-indigo-600">Новая генерация</span>
                </button>

                {printButtonStyle === 'icon-only' ? (
                  <button
                    onClick={onPrint}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-700 shadow hover:bg-gray-50 hover:text-indigo-600 transition-all"
                    title="Распечатать"
                  >
                    <PrintIcon />
                  </button>
                ) : (
                  <button
                    onClick={onPrint}
                    className="group flex flex-col items-center gap-0.5 pt-4"
                    title="Распечатать"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-indigo-100 bg-white shadow-sm transition-all group-hover:bg-indigo-50 group-active:scale-95">
                      <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-medium text-gray-500 group-hover:text-indigo-600">Печать</span>
                  </button>
                )}

                <button
                  onClick={onDownloadPdf}
                  className="group flex flex-col items-center gap-0.5 pt-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-indigo-100 bg-white shadow-sm transition-all group-hover:bg-indigo-50 group-active:scale-95">
                    <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-medium text-gray-500 group-hover:text-indigo-600">Скачать PDF</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
