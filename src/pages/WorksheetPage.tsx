import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSessionStore } from '../store/session'
import { DummyProvider, regenerateTask } from '../lib/api'
import { updateWorksheet as updateWorksheetApi } from '../lib/dashboard-api'
import type { Worksheet } from '../../shared/types'
import { useWorksheetEditor } from '../hooks/useWorksheetEditor'
import { useAuth } from '../lib/auth'
import { canRegenerateTask, getRegenRemaining } from '../lib/limits'
import { useScrollSpy } from '../hooks/useScrollSpy'
import { useWorksheetPdf } from '../hooks/useWorksheetPdf'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import EditableWorksheetContent from '../components/EditableWorksheetContent'
import UnsavedChangesDialog, { useBeforeUnload } from '../components/UnsavedChangesDialog'
import PdfTemplateModal from '../components/PdfTemplateModal'
import SubscriptionPlansModal from '../components/SubscriptionPlansModal'
import SidebarNav from '../components/worksheet/SidebarNav'
import WorksheetHeader from '../components/worksheet/WorksheetHeader'

export default function WorksheetPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const worksheetRef = useRef<HTMLDivElement | null>(null)

  const { user } = useAuth()
  const sessionStore = useSessionStore()
  const [initialWorksheet, setInitialWorksheet] = useState<Worksheet | null>(
    sessionId ? sessionStore.getSession(sessionId)?.worksheet ?? null : null
  )
  const [loading, setLoading] = useState(!initialWorksheet)
  const [regeneratingIndex, setRegeneratingIndex] = useState<{ index: number; isTest: boolean } | null>(null)
  const [showPlansModal, setShowPlansModal] = useState(false)

  const canUseStyles = user?.limits?.pdfTemplateStyles ?? false

  // Worksheet editor hook
  const editor = useWorksheetEditor({ initialWorksheet, sessionId })

  // Browser beforeunload warning
  useBeforeUnload(editor.isDirty, editor.isEditMode)

  // Shared hooks
  const { activePage } = useScrollSpy()
  const pdf = useWorksheetPdf(editor)

  // Clear localStorage when discarding or navigating away
  const clearLocalStorage = () => {
    localStorage.removeItem('uchion_cached_worksheet')
  }

  const unsaved = useUnsavedChanges({ editor, onAfterDiscard: clearLocalStorage })

  // New generation with dirty-state check — also clears localStorage before navigating
  const handleNewGeneration = () => {
    if (editor.isDirty && editor.isEditMode) {
      unsaved.handleNavigateWithCheck('/')
    } else {
      clearLocalStorage()
      navigate('/')
    }
  }

  // Fetch worksheet if not in store (e.g. on refresh or direct link)
  useEffect(() => {
    if (!sessionId) return
    if (initialWorksheet) {
      setLoading(false)
      return
    }

    const loadWorksheet = async () => {
      setLoading(true)
      try {
        // 1. Try localStorage first
        const cached = localStorage.getItem('uchion_cached_worksheet')
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as Worksheet
            setInitialWorksheet(parsed)
            setLoading(false)
            return
          } catch (e) {
            void e
            localStorage.removeItem('uchion_cached_worksheet')
          }
        }

        // 2. Fallback to DummyProvider (or real API fetch if implemented)
        const data = await DummyProvider.getWorksheetById(sessionId)
        if (data) {
          setInitialWorksheet(data)
        }
      } catch (e) {
        void e
      } finally {
        setLoading(false)
      }
    }

    loadWorksheet()
  }, [sessionId, initialWorksheet])

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  // Handle regenerate task
  const handleRegenerateTask = async (index: number, taskType: string, isTest: boolean) => {
    if (!editor.worksheet || regeneratingIndex) return

    setRegeneratingIndex({ index, isTest })

    try {
      const gradeNum = parseInt(editor.worksheet.grade.match(/\d+/)?.[0] || '1')
      const session = sessionId ? sessionStore.getSession(sessionId) : null
      const difficulty = (session?.payload as Record<string, unknown>)?.difficulty as string || 'medium'

      const result = await regenerateTask({
        taskIndex: index,
        taskType,
        isTest,
        context: {
          subject: editor.worksheet.subject,
          grade: gradeNum,
          topic: editor.worksheet.topic,
          difficulty,
        },
      })

      if (result.status === 'ok' && result.data) {
        const current = editor.worksheet!
        let updated: Worksheet | null = null

        if (isTest && result.data.testQuestion) {
          const newTest = [...current.test]
          newTest[index] = result.data.testQuestion
          const newTestAnswers = [...current.answers.test]
          newTestAnswers[index] = result.data.answer
          updated = { ...current, pdfBase64: '', test: newTest, answers: { ...current.answers, test: newTestAnswers } }
          editor.replaceTestQuestion(index, result.data.testQuestion, result.data.answer)
        } else if (!isTest && result.data.assignment) {
          const newAssignments = [...current.assignments]
          newAssignments[index] = result.data.assignment
          const newAssignmentAnswers = [...current.answers.assignments]
          newAssignmentAnswers[index] = result.data.answer
          updated = { ...current, pdfBase64: '', assignments: newAssignments, answers: { ...current.answers, assignments: newAssignmentAnswers } }
          editor.replaceAssignment(index, result.data.assignment, result.data.answer)
        }

        // Persist to localStorage + session store + DB
        if (updated) {
          try {
            localStorage.setItem('uchion_cached_worksheet', JSON.stringify(updated))
          } catch { /* ignore */ }

          if (sessionId) {
            const sessionData = sessionStore.getSession(sessionId)
            if (sessionData) {
              sessionStore.saveSession(sessionId, { ...sessionData, worksheet: updated })
            }
          }

          // Save to DB if worksheet has a valid UUID (authenticated user)
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          if (updated.id && uuidRegex.test(updated.id)) {
            try {
              await updateWorksheetApi(updated.id, { content: JSON.stringify(updated) })
            } catch { /* ignore - localStorage is primary store here */ }
          }
        }
      } else {
        alert(result.message || 'Не удалось перегенерировать задание.')
      }
    } catch {
      alert('Не удалось перегенерировать задание. Попробуйте ещё раз.')
    } finally {
      setRegeneratingIndex(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto"></div>
          <p className="text-gray-600">Загрузка рабочего листа...</p>
        </div>
      </div>
    )
  }

  if (!editor.worksheet) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-4 text-xl font-semibold">Лист не найден</div>
        <p className="mb-6 text-gray-600">Возможно, ссылка устарела или содержит ошибку.</p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex h-11 items-center justify-center rounded-md bg-blue-600 px-6 text-white hover:bg-blue-700"
        >
          На главную
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <UnsavedChangesDialog
        isOpen={unsaved.showUnsavedDialog}
        isSaving={editor.isSaving}
        onSave={unsaved.handleDialogSave}
        onDiscard={unsaved.handleDialogDiscard}
        onCancel={unsaved.handleDialogCancel}
      />

      <PdfTemplateModal
        isOpen={pdf.showPdfModal}
        onClose={() => pdf.setShowPdfModal(false)}
        onSelect={pdf.handlePdfTemplateSelect}
        loading={pdf.pdfLoading}
        canUseStyles={canUseStyles}
        onUpgrade={() => { pdf.setShowPdfModal(false); setShowPlansModal(true) }}
      />

      <SubscriptionPlansModal
        isOpen={showPlansModal}
        onClose={() => setShowPlansModal(false)}
      />

      <WorksheetHeader
        editor={editor}
        primaryLabel={editor.worksheet.topic}
        secondaryLabel={`${editor.worksheet.subject}, ${editor.worksheet.grade}`}
        onCancel={unsaved.handleCancel}
        onNewGeneration={handleNewGeneration}
        onPrint={handlePrint}
        onDownloadPdf={pdf.handleDownloadPdf}
        printButtonStyle="icon-only"
      />

      <SidebarNav
        activePage={activePage}
        hasAssignments={editor.worksheet.assignments.length > 0}
        hasTest={editor.worksheet.test.length > 0}
      />

      <main className="py-12 print:py-0">
        <div ref={worksheetRef}>
          <EditableWorksheetContent
            worksheet={editor.worksheet}
            isEditMode={editor.isEditMode}
            onUpdateAssignment={editor.updateAssignment}
            onUpdateTestQuestion={editor.updateTestQuestion}
            onUpdateTestOption={editor.updateTestOption}
            onUpdateAssignmentAnswer={editor.updateAssignmentAnswer}
            onUpdateTestAnswer={editor.updateTestAnswer}
            onUpdateMatchingInstruction={editor.updateMatchingInstruction}
            onUpdateMatchingLeftItem={editor.updateMatchingLeftItem}
            onUpdateMatchingRightItem={editor.updateMatchingRightItem}
            onRegenerateTask={canRegenerateTask(user) ? handleRegenerateTask : undefined}
            regeneratingIndex={regeneratingIndex}
            regenDisabled={canRegenerateTask(user) && getRegenRemaining(user) === 0}
            regenRemainingLabel={(() => {
              const remaining = getRegenRemaining(user)
              if (remaining === null) return null
              return `Перегенерация: ${remaining} из ${user?.limits?.dailyRegenLimit ?? 0}`
            })()}
          />
        </div>
      </main>
    </div>
  )
}
