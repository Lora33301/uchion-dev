import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { generateWorksheet } from '../lib/api'
import { generatePresentation } from '../lib/presentation-api'
import { useSessionStore } from '../store/session'
import { useAuth } from '../lib/auth'
import { getGenerationsLeft, canGenerate, canGeneratePresentation, isSlideCountAllowed } from '../lib/limits'
import Header from '../components/Header'
import SubscriptionPlansModal from '../components/SubscriptionPlansModal'
import { fetchFolders } from '../lib/dashboard-api'
import type { PresentationStructure } from '../../shared/types'
import { downloadBase64File } from '../lib/download-utils'
import {
  SUBJECTS,
  FORMATS,
  PRESENTATION_COST,
  GenerateFormSchema,
  GeneratePresentationFormSchema,
  type Subject,
  type TaskTypeId,
  type GenerateFormValues,
  type GeneratePresentationFormValues,
} from '../constants/generation'
import WorksheetGenerateForm from '../components/generation/WorksheetGenerateForm'
import PresentationGenerateForm from '../components/generation/PresentationGenerateForm'
import PresentationPreview from '../components/generation/PresentationPreview'
import GenerationLoadingOverlay from '../components/generation/GenerationLoadingOverlay'
import type { GenerateMode } from '../components/generation/types'

// =============================================================================
// Helpers
// =============================================================================

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 0 && hour < 5) return 'Доброй ночи'
  if (hour >= 5 && hour < 12) return 'Доброе утро'
  if (hour >= 12 && hour < 18) return 'Добрый день'
  return 'Добрый вечер'
}

// =============================================================================
// Component
// =============================================================================

export default function GeneratePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const saveSession = useSessionStore(s => s.saveSession)
  const setCurrent = useSessionStore(s => s.setCurrent)
  const { user, refreshAuth } = useAuth()
  const [errorText, setErrorText] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const generationsLeft = getGenerationsLeft(user)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showBuyModal, setShowBuyModal] = useState(false)
  const greeting = getGreeting()

  // Mode: worksheet or presentation
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<GenerateMode>(
    searchParams.get('tab') === 'presentation' ? 'presentation' : 'worksheet'
  )

  // Sync mode with URL param when navigating from other pages
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'presentation') setMode('presentation')
  }, [searchParams])

  // Presentation result state
  const [generatedPresentation, setGeneratedPresentation] = useState<{
    id: string
    title: string
    pptxBase64: string
    pdfBase64: string
    slideCount: number
    structure: PresentationStructure
  } | null>(null)

  // Fetch folders only for authenticated users
  const { data: foldersData } = useQuery({
    queryKey: ['folders'],
    queryFn: fetchFolders,
    enabled: !!user,
  })

  const folders = foldersData?.folders || []

  // Worksheet form
  const form = useForm<GenerateFormValues>({
    resolver: zodResolver(GenerateFormSchema),
    defaultValues: {
      subject: 'math',
      grade: 3,
      topic: '',
      folderId: null,
      format: 'test_and_open',
      variantIndex: 0,
      difficulty: 'medium',
      taskTypes: ['single_choice', 'open_question'],
    }
  })

  // Presentation form
  const presentationForm = useForm<GeneratePresentationFormValues>({
    resolver: zodResolver(GeneratePresentationFormSchema),
    defaultValues: {
      subject: 'math',
      grade: 3,
      topic: '',
      themeType: 'preset',
      themePreset: 'professional',
      slideCount: 12,
    }
  })

  const watchSubject = form.watch('subject')
  const watchFormat = form.watch('format')
  const watchVariantIndex = form.watch('variantIndex')
  const watchPresentationSubject = presentationForm.watch('subject')
  const watchSlideCount = presentationForm.watch('slideCount')

  const presentationCost = PRESENTATION_COST[watchSlideCount ?? 12] ?? 2

  // Get available grades for selected subject (worksheet)
  const availableGrades = useMemo(() => {
    const subjectConfig = SUBJECTS.find(s => s.value === watchSubject)
    return subjectConfig?.grades || [1, 2, 3, 4]
  }, [watchSubject])

  // Get available grades for selected subject (presentation)
  const availablePresentationGrades = useMemo(() => {
    const subjectConfig = SUBJECTS.find(s => s.value === watchPresentationSubject)
    return subjectConfig?.grades || [1, 2, 3, 4]
  }, [watchPresentationSubject])

  // Derive currentFormat and currentVariant from watched values
  const derivedFormat = useMemo(() => {
    return FORMATS.find(f => f.id === watchFormat)
  }, [watchFormat])

  const derivedVariant = useMemo(() => {
    return derivedFormat?.variants[watchVariantIndex]
  }, [derivedFormat, watchVariantIndex])

  const generationCost = derivedVariant?.generations || 1

  // Reset grade if not available for new subject (worksheet)
  const handleSubjectChange = (newSubject: Subject) => {
    form.setValue('subject', newSubject)
    const newGrades = SUBJECTS.find(s => s.value === newSubject)?.grades || [1]
    const currentGrade = form.getValues('grade')
    if (!newGrades.includes(currentGrade)) {
      form.setValue('grade', newGrades[0])
    }
  }

  // Reset grade if not available for new subject (presentation)
  const handlePresentationSubjectChange = (newSubject: Subject) => {
    presentationForm.setValue('subject', newSubject)
    const newGrades = SUBJECTS.find(s => s.value === newSubject)?.grades || [1]
    const currentGrade = presentationForm.getValues('grade')
    if (!newGrades.includes(currentGrade)) {
      presentationForm.setValue('grade', newGrades[0])
    }
  }

  // Toggle task type selection (at least one must remain selected)
  const toggleTaskType = (typeId: TaskTypeId) => {
    const current = form.getValues('taskTypes')
    if (current.includes(typeId)) {
      if (current.length > 1) {
        form.setValue('taskTypes', current.filter(t => t !== typeId))
      }
    } else {
      form.setValue('taskTypes', [...current, typeId])
    }
  }

  const mutation = useMutation({
    mutationFn: (values: GenerateFormValues) => generateWorksheet(values as any, (p) => setProgress(p)),
    onSuccess: res => {
      if (res.status === 'error') {
        setErrorCode(res.code ?? null)
        setErrorText(res.message)
        return
      }
      const sessionId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now())
      const worksheet = res.data.worksheet

      // Save to localStorage for persistence
      try {
        localStorage.setItem('uchion_cached_worksheet', JSON.stringify(worksheet))
      } catch (e) {
        void e
      }

      // Refresh user data to get updated generationsLeft from server
      refreshAuth()

      saveSession(sessionId, {
        payload: { subject: form.getValues('subject'), grade: form.getValues('grade'), topic: form.getValues('topic'), difficulty: form.getValues('difficulty') },
        worksheet,
        pdfBase64: worksheet.pdfBase64
      })
      setCurrent(sessionId)

      // Invalidate worksheets queries to trigger refetch in Dashboard
      queryClient.invalidateQueries({ queryKey: ['worksheets'] })

      navigate('/worksheet/' + sessionId)
    },
    onError: () => {
      setErrorCode('SERVER_ERROR')
      setErrorText('Не удалось сгенерировать лист. Попробуйте ещё раз.')
    }
  })

  // Presentation mutation
  const presentationMutation = useMutation({
    mutationFn: (values: GeneratePresentationFormValues) => generatePresentation(values as any, (p) => setProgress(p)),
    onSuccess: res => {
      if (res.status === 'error') {
        setErrorCode(res.code ?? null)
        setErrorText(res.message)
        return
      }
      refreshAuth()
      setGeneratedPresentation(res.data)
    },
    onError: () => {
      setErrorCode('SERVER_ERROR')
      setErrorText('Не удалось сгенерировать презентацию. Попробуйте ещё раз.')
    }
  })

  // Presentation download handlers
  const handleDownloadPptx = () => {
    if (!generatedPresentation) return
    const filename = `${generatedPresentation.title.replace(/[^a-zа-яё0-9\s]/gi, '_')}.pptx`
    downloadBase64File(generatedPresentation.pptxBase64, filename, 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
  }


  const handleCreateNewPresentation = () => {
    setGeneratedPresentation(null)
    setErrorText(null)
    setErrorCode(null)
    setProgress(0)
    presentationForm.reset({
      subject: 'math',
      grade: 3,
      topic: '',
      themeType: 'preset',
      themePreset: 'professional',
      slideCount: 12,
    })
  }

  // After login redirect: restore saved form and auto-generate
  const autoGenerateTriggered = useRef(false)
  useEffect(() => {
    if (!user || autoGenerateTriggered.current) return
    const pending = sessionStorage.getItem('uchion_pending_generate')
    if (!pending) return

    autoGenerateTriggered.current = true
    sessionStorage.removeItem('uchion_pending_generate')

    try {
      const savedValues = JSON.parse(pending) as GenerateFormValues
      // Restore form values
      form.reset(savedValues)
      // Trigger generation after a short delay to let form settle
      setTimeout(() => {
        form.handleSubmit((values) => {
          setErrorText(null)
          setErrorCode(null)
          setProgress(0)
          localStorage.removeItem('uchion_cached_worksheet')
          mutation.mutate(values)
        })()
      }, 100)
    } catch {
      // Invalid saved data, ignore
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = (values: GenerateFormValues) => {
    // Require authentication -- save form and redirect to login
    if (!user) {
      sessionStorage.setItem('uchion_pending_generate', JSON.stringify(values))
      navigate('/login')
      return
    }

    // Check limits - open buy modal instead of showing error
    if (!canGenerate(user) || generationsLeft < generationCost) {
      setShowBuyModal(true)
      return
    }

    setErrorText(null)
    setErrorCode(null)
    setProgress(0)
    localStorage.removeItem('uchion_cached_worksheet')
    mutation.mutate(values)
  }

  const onPresentationSubmit = (values: GeneratePresentationFormValues) => {
    // Require authentication -- save form and redirect to login
    if (!user) {
      sessionStorage.setItem('uchion_pending_generate_presentation', JSON.stringify(values))
      navigate('/login')
      return
    }

    // Check plan allows presentations
    if (!canGeneratePresentation(user)) {
      setErrorText('Презентации недоступны на вашем тарифе.')
      setErrorCode('PLAN_LIMIT')
      setShowBuyModal(true)
      return
    }

    // Check slide count allowed
    if (!isSlideCountAllowed(user, values.slideCount || 12)) {
      setErrorText(`Объём ${values.slideCount || 12} слайдов недоступен на вашем тарифе.`)
      setErrorCode('PLAN_LIMIT')
      setShowBuyModal(true)
      return
    }

    // Check generation limits
    if (!canGenerate(user) || generationsLeft < presentationCost) {
      setShowBuyModal(true)
      return
    }

    setErrorText(null)
    setErrorCode(null)
    setProgress(0)
    setGeneratedPresentation(null)
    presentationMutation.mutate(values)
  }

  const isLoading = mutation.isPending || presentationMutation.isPending

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-purple-50 to-white font-sans text-slate-900 relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-[-20%] left-[50%] w-[1000px] h-[1000px] -translate-x-1/2 rounded-full bg-gradient-to-b from-purple-100/40 to-transparent blur-3xl pointer-events-none" />

      <Header />

      <main className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-4 py-12 text-center">
        {/* Greeting header */}
        <div className="w-full mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {greeting}{user?.name ? `, ${user.name}` : ''}!
          </h1>
          <p className="text-lg text-slate-500">Какой материал хотите сгенерировать?</p>
        </div>

        {/* Mode switcher + Generations counter */}
        <div className="w-full mb-6 flex items-center justify-between gap-2">
          <div className="inline-flex bg-purple-50/80 backdrop-blur-sm rounded-xl p-1 border border-purple-200/60 shadow-[0_0_8px_rgba(140,82,255,0.15)]">
            <button
              type="button"
              onClick={() => { setMode('worksheet'); setGeneratedPresentation(null); setErrorText(null); }}
              className={`px-3 py-1.5 sm:px-6 sm:py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === 'worksheet'
                  ? 'bg-[#8C52FF] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Рабочий лист
            </button>
            <button
              type="button"
              onClick={() => { setMode('presentation'); setErrorText(null); }}
              className={`px-3 py-1.5 sm:px-6 sm:py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === 'presentation'
                  ? 'bg-[#8C52FF] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Презентация
            </button>
          </div>

          {/* Generations counter with plus button */}
          {user && <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5 bg-purple-50/80 backdrop-blur-sm rounded-full px-4 py-2 border border-purple-200/60 shadow-[0_0_8px_rgba(140,82,255,0.15)]">
              <svg className="w-4 h-4 text-[#8C52FF]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
              </svg>
              <span className="text-sm font-semibold text-slate-700">
                <span className="hidden sm:inline">Генераций: </span>{generationsLeft}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowBuyModal(true)}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-50/80 backdrop-blur-sm text-[#8C52FF] hover:bg-purple-100 transition-all hover:scale-105 border border-purple-200/60 shadow-[0_0_8px_rgba(140,82,255,0.15)]"
              title="Пополнить генерации"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          </div>}
        </div>

        {/* Worksheet Form */}
        {mode === 'worksheet' && (
          <WorksheetGenerateForm
            form={form}
            availableGrades={availableGrades}
            currentFormat={derivedFormat}
            currentVariant={derivedVariant}
            generationCost={generationCost}
            showAdvanced={showAdvanced}
            isPending={mutation.isPending}
            isDisabled={mutation.isPending || (!!user && generationsLeft < generationCost)}
            errorText={errorText}
            errorCode={errorCode}
            onSubjectChange={handleSubjectChange}
            onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
            onToggleTaskType={toggleTaskType}
            onOpenBuyModal={() => setShowBuyModal(true)}
            onSubmit={onSubmit}
            user={user}
            folders={folders}
          />
        )}

        {/* Presentation tab */}
        {mode === 'presentation' && (
          <>
            {/* Success state - preview + download */}
            {generatedPresentation && (
              <PresentationPreview
                presentation={generatedPresentation}
                themePreset={presentationForm.getValues('themePreset')}
                onDownloadPptx={handleDownloadPptx}

                onCreateNew={handleCreateNewPresentation}
              />
            )}

            {/* Generation form - hidden when result is shown */}
            {!generatedPresentation && (
              <PresentationGenerateForm
                form={presentationForm}
                availableGrades={availablePresentationGrades}
                presentationCost={presentationCost}
                isPending={presentationMutation.isPending}
                isDisabled={presentationMutation.isPending || (!!user && generationsLeft < presentationCost)}
                errorText={errorText}
                errorCode={errorCode}
                onSubjectChange={handlePresentationSubjectChange}
                onOpenBuyModal={() => setShowBuyModal(true)}
                onSubmit={onPresentationSubmit}
              />
            )}
          </>
        )}

        <p className="mt-6 text-sm text-slate-400">
          Этот сервис помогает экономить время учителю. Проверяйте материалы перед печатью.
        </p>
      </main>

      {/* Loading Overlay */}
      {isLoading && (
        <GenerationLoadingOverlay mode={mode} progress={progress} />
      )}

      {/* Subscription Plans Modal */}
      <SubscriptionPlansModal
        isOpen={showBuyModal}
        onClose={() => setShowBuyModal(false)}
      />
    </div>
  )
}
