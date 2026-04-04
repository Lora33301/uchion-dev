import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../lib/auth'
import { canRegenerateTask, getRegenRemaining } from '../lib/limits'
import { fetchWorksheet, formatSubjectName, updateWorksheet as updateWorksheetApi } from '../lib/dashboard-api'
import { regenerateTask } from '../lib/api'
import type { Worksheet } from '../../shared/types'
import { useWorksheetEditor } from '../hooks/useWorksheetEditor'
import { useScrollSpy } from '../hooks/useScrollSpy'
import { useWorksheetPdf } from '../hooks/useWorksheetPdf'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import EditableWorksheetContent from '../components/EditableWorksheetContent'
import UnsavedChangesDialog, { useBeforeUnload } from '../components/UnsavedChangesDialog'
import PdfTemplateModal from '../components/PdfTemplateModal'
import SubscriptionPlansModal from '../components/SubscriptionPlansModal'
import SidebarNav from '../components/worksheet/SidebarNav'
import WorksheetHeader from '../components/worksheet/WorksheetHeader'

import { PageSpinner } from '../components/ui/LoadingSpinner'

export default function SavedWorksheetPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, status } = useAuth()
  const worksheetRef = useRef<HTMLDivElement | null>(null)
  const [regeneratingIndex, setRegeneratingIndex] = useState<{ index: number; isTest: boolean } | null>(null)
  const [showPlansModal, setShowPlansModal] = useState(false)

  const canUseStyles = user?.limits?.pdfTemplateStyles ?? false

  useEffect(() => {
    if (status === 'unauthenticated') {
      navigate('/login')
    }
  }, [status, navigate])

  // Fetch worksheet from DB
  const { data: worksheetData, isLoading, isPending, error } = useQuery({
    queryKey: ['worksheet', id],
    queryFn: async () => {
      const result = await fetchWorksheet(id!)
      return result
    },
    enabled: !!id && status === 'authenticated',
    retry: 1,
  })

  // Extract worksheet content
  const initialWorksheet = worksheetData?.content as Worksheet | null

  // Worksheet editor hook
  const editor = useWorksheetEditor({
    initialWorksheet,
    worksheetId: id,
    onSaveSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worksheet', id] })
    },
  })

  // Browser beforeunload warning
  useBeforeUnload(editor.isDirty, editor.isEditMode)

  // Shared hooks
  const { activePage } = useScrollSpy()
  const pdf = useWorksheetPdf(editor)
  const unsaved = useUnsavedChanges({ editor })

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
      const difficulty = (worksheetData?.difficulty as string) || 'medium'

      const result = await regenerateTask({
        taskIndex: index,
        taskType,
        isTest,
        context: {
          subject: worksheetData?.subject || editor.worksheet.subject,
          grade: worksheetData?.grade || parseInt(editor.worksheet.grade.match(/\d+/)?.[0] || '1'),
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

        // Persist to DB
        if (id && updated) {
          try {
            await updateWorksheetApi(id, { content: JSON.stringify(updated) })
            queryClient.invalidateQueries({ queryKey: ['worksheet', id] })
          } catch { /* ignore */ }
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

  if (status === 'loading' || isLoading || (status === 'authenticated' && isPending)) {
    return <PageSpinner />
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-4 text-xl font-semibold">Ошибка загрузки</div>
        <p className="mb-2 text-gray-600">Не удалось загрузить рабочий лист.</p>
        <p className="mb-6 text-sm text-gray-400">{errorMessage}</p>
        <div className="flex gap-4">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex h-11 items-center justify-center rounded-md border border-[#8C52FF] px-6 text-[#8C52FF] hover:bg-purple-50"
          >
            Попробовать снова
          </button>
          <button
            onClick={() => navigate('/worksheets')}
            className="inline-flex h-11 items-center justify-center rounded-md bg-[#8C52FF] px-6 text-white hover:bg-purple-700"
          >
            К списку листов
          </button>
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
          onClick={() => navigate('/dashboard')}
          className="inline-flex h-11 items-center justify-center rounded-md bg-[#8C52FF] px-6 text-white hover:bg-purple-700"
        >
          В личный кабинет
        </button>
      </div>
    )
  }

  const subjectGradeLabel = `${formatSubjectName(worksheetData?.subject || '')}, ${worksheetData?.grade} класс`

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
        primaryLabel={subjectGradeLabel}
        secondaryLabel={editor.worksheet.topic}
        onBack={() => unsaved.handleNavigateWithCheck('/worksheets')}
        onCancel={unsaved.handleCancel}
        onNewGeneration={() => unsaved.handleNavigateWithCheck('/')}
        onPrint={handlePrint}
        onDownloadPdf={pdf.handleDownloadPdf}
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
