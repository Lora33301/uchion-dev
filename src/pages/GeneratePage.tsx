import { useState, useEffect, useRef } from 'react'
import LandingSections from '../components/landing/LandingSections'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { generateWorksheet } from '../lib/api'
import { generatePresentation } from '../lib/presentation-api'
import { useSessionStore } from '../store/session'
import { useAuth } from '../lib/auth'
import { getGenerationsLeft, canGenerate, canGeneratePresentation, isSlideCountAllowed } from '../lib/limits'
import Header from '../components/Header'
import SubscriptionPlansModal from '../components/SubscriptionPlansModal'
import { fetchFolders } from '../lib/dashboard-api'
import type { PresentationStructure, GeneratePayload, GeneratePresentationPayload } from '../../shared/types'
import { downloadBase64File } from '../lib/download-utils'
import ComboBox from '../components/ui/ComboBox'
import {
  FORMATS,
  PRESENTATION_COST,
  EXAMPLE_PROMPTS,
  GenerateFormSchema,
  GeneratePresentationFormSchema,
  type TaskTypeId,
  type GenerateFormValues,
  type GeneratePresentationFormValues,
} from '../constants/generation'
import WorksheetGenerateForm from '../components/generation/WorksheetGenerateForm'
import PresentationGenerateForm from '../components/generation/PresentationGenerateForm'
import PresentationPreview from '../components/generation/PresentationPreview'
import GenerationLoadingOverlay from '../components/generation/GenerationLoadingOverlay'
import GenerationErrorMessage from '../components/generation/GenerationErrorMessage'
import type { GenerateMode } from '../components/generation/types'

// =============================================================================
// Helpers
// =============================================================================

function formValuesToPayload(v: GenerateFormValues): GeneratePayload {
  return {
    subject: v.subject,
    grade: v.grade,
    topic: v.topic,
    preferences: v.preferences || undefined,
    folderId: v.folderId,
    taskTypes: v.taskTypes,
    difficulty: v.difficulty,
    format: v.format,
    variantIndex: v.variantIndex,
  }
}

function presentationFormToPayload(v: GeneratePresentationFormValues): GeneratePresentationPayload {
  return {
    subject: v.subject,
    grade: v.grade,
    topic: v.topic,
    preferences: v.preferences || undefined,
    themeType: v.themeType,
    themePreset: v.themePreset,
    slideCount: v.slideCount,
  }
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 0 && hour < 5) return 'Доброй ночи'
  if (hour >= 5 && hour < 12) return 'Доброе утро'
  if (hour >= 12 && hour < 18) return 'Добрый день'
  return 'Добрый вечер'
}

// =============================================================================
// Inline sub-components
// =============================================================================

function GradeDropdown({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full text-left">
        <span className="block text-[9px] uppercase tracking-wider text-[#a5a0c0] font-medium mb-0.5">Класс</span>
        <span className="flex items-center gap-1">
          <span className="text-base font-medium text-[#1e293b]">{value}</span>
          <svg className={`w-3 h-3 text-[#a5a0c0] flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-20 bg-white rounded-xl shadow-xl ring-1 ring-black/5 z-50 py-1 max-h-60 overflow-y-auto">
          {Array.from({ length: 11 }, (_, i) => i + 1).map(g => (
            <button
              key={g}
              type="button"
              onClick={() => { onChange(g); setIsOpen(false) }}
              className={`w-full text-center py-2 text-sm transition-colors ${
                value === g ? 'bg-violet-50 text-[#8C52FF] font-semibold' : 'text-slate-700 hover:bg-violet-50'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const SparkleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 0L9.8 6.2L16 8L9.8 9.8L8 16L6.2 9.8L0 8L6.2 6.2L8 0Z" />
  </svg>
)

const LightningIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
  </svg>
)

const SlidersIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
  </svg>
)

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
  const [showLowGenWarning, setShowLowGenWarning] = useState(false)
  const greeting = getGreeting()

  const isGenerationsExhausted = !!user && !canGenerate(user)

  // Mode: worksheet or presentation
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<GenerateMode>(
    searchParams.get('tab') === 'presentation' ? 'presentation' : 'worksheet'
  )

  useEffect(() => {
    const tab = searchParams.get('tab')
    setMode(tab === 'presentation' ? 'presentation' : 'worksheet')
  }, [searchParams])

  // Low generations warning (show once per session when <= 2 gens remaining)
  useEffect(() => {
    if (user && generationsLeft > 0 && generationsLeft <= 2) {
      const key = `uchion_low_gen_warned_${user.id}`
      if (!sessionStorage.getItem(key)) {
        const timer = setTimeout(() => {
          setShowLowGenWarning(true)
          sessionStorage.setItem(key, '1')
        }, 1000)
        return () => clearTimeout(timer)
      }
    }
  }, [user, generationsLeft])

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
      subject: '',
      grade: 5,
      topic: '',
      preferences: '',
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
      subject: '',
      grade: 5,
      topic: '',
      preferences: '',
      themeType: 'preset',
      themePreset: 'professional',
      slideCount: 12,
    }
  })

  const watchFormat = form.watch('format')
  const watchVariantIndex = form.watch('variantIndex')
  const watchSlideCount = presentationForm.watch('slideCount')

  const presentationCost = PRESENTATION_COST[watchSlideCount ?? 12] ?? 2

  const derivedFormat = FORMATS.find(f => f.id === watchFormat)
  const derivedVariant = derivedFormat?.variants[watchVariantIndex]
  const generationCost = derivedVariant?.generations || 1

  // Shared field helper for example cards
  const setSharedFields = (subject: string, grade: number, topic: string) => {
    if (mode === 'worksheet') {
      form.setValue('subject', subject); form.clearErrors('subject')
      form.setValue('grade', grade)
      form.setValue('topic', topic); form.clearErrors('topic')
    } else {
      presentationForm.setValue('subject', subject); presentationForm.clearErrors('subject')
      presentationForm.setValue('grade', grade)
      presentationForm.setValue('topic', topic); presentationForm.clearErrors('topic')
    }
  }

  // Toggle task type selection (at least one must remain selected)
  const toggleTaskType = (typeId: TaskTypeId) => {
    const current = form.getValues('taskTypes')
    if (current.includes(typeId)) {
      if (current.length > 1) form.setValue('taskTypes', current.filter(t => t !== typeId))
    } else {
      form.setValue('taskTypes', [...current, typeId])
    }
  }

  // Worksheet mutation
  const mutation = useMutation({
    mutationFn: (values: GenerateFormValues) => generateWorksheet(formValuesToPayload(values), (p) => setProgress(p)),
    onSuccess: res => {
      if (res.status === 'error') {
        setErrorCode(res.code ?? null)
        setErrorText(res.message)
        return
      }
      const sessionId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now())
      const worksheet = res.data.worksheet

      try { localStorage.setItem('uchion_cached_worksheet', JSON.stringify(worksheet)) } catch { /* noop */ }
      refreshAuth()

      saveSession(sessionId, {
        payload: {
          subject: worksheet.subject,
          grade: parseInt(worksheet.grade) || 0,
          topic: worksheet.topic,
          difficulty: form.getValues('difficulty'),
        },
        worksheet,
        pdfBase64: worksheet.pdfBase64,
      })
      setCurrent(sessionId)
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
    mutationFn: (values: GeneratePresentationFormValues) => generatePresentation(presentationFormToPayload(values), (p) => setProgress(p)),
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
    downloadBase64File(
      generatedPresentation.pptxBase64,
      `${generatedPresentation.title.replace(/[^a-zа-яё0-9\s]/gi, '_')}.pptx`,
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    )
  }

  const handleCreateNewPresentation = () => {
    setGeneratedPresentation(null)
    setErrorText(null)
    setErrorCode(null)
    setProgress(0)
    presentationForm.reset({
      subject: '', grade: 5, topic: '', preferences: '',
      themeType: 'preset', themePreset: 'professional', slideCount: 12,
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
      if (!('subject' in savedValues)) return // ignore old format gracefully
      form.reset(savedValues)
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

  // Submit handlers
  const onSubmit = (values: GenerateFormValues) => {
    if (!user) {
      sessionStorage.setItem('uchion_pending_generate', JSON.stringify(values))
      navigate('/login')
      return
    }
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
    if (!user) {
      sessionStorage.setItem('uchion_pending_generate_presentation', JSON.stringify(values))
      navigate('/login')
      return
    }
    if (!canGeneratePresentation(user)) {
      setErrorText('Презентации недоступны на вашем тарифе.')
      setErrorCode('PLAN_LIMIT')
      setShowBuyModal(true)
      return
    }
    if (!isSlideCountAllowed(user, values.slideCount || 12)) {
      setErrorText(`Объём ${values.slideCount || 12} слайдов недоступен на вашем тарифе.`)
      setErrorCode('PLAN_LIMIT')
      setShowBuyModal(true)
      return
    }
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

  const handlePromptSubmit = () => {
    if (mode === 'worksheet') form.handleSubmit(onSubmit)()
    else presentationForm.handleSubmit(onPresentationSubmit)()
  }

  const isLoading = mutation.isPending || presentationMutation.isPending
  const currentCost = mode === 'worksheet' ? generationCost : presentationCost

  // Validation errors for shared fields
  const subjectError = mode === 'worksheet'
    ? form.formState.errors.subject?.message
    : presentationForm.formState.errors.subject?.message
  const topicError = mode === 'worksheet'
    ? form.formState.errors.topic?.message
    : presentationForm.formState.errors.topic?.message

  const topicRegister = mode === 'worksheet' ? form.register('topic') : presentationForm.register('topic')

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <Header />

      <main className="mx-auto flex max-w-3xl flex-col items-center px-4 py-12 text-center">
        {/* Greeting */}
        <div className="w-full mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {greeting}{user?.name ? `, ${user.name}` : ''}!
          </h1>
          <p className="text-lg text-slate-500">Какой материал хотите создать?</p>
        </div>

        {/* Mode selector + generations counter */}
        <div className="w-full flex items-center justify-between gap-3 flex-wrap mb-6">
          <div className="flex bg-[#f8f5ff] rounded-full p-0.5">
            <button
              type="button"
              onClick={() => {
                setMode('worksheet')
                setGeneratedPresentation(null)
                setErrorText(null)
                setErrorCode(null)
                setShowAdvanced(false)
              }}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                mode === 'worksheet'
                  ? 'bg-[#8C52FF] text-white shadow-sm'
                  : 'text-[#8C52FF] hover:text-[#7B3FEE]'
              }`}
            >
              Задания
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('presentation')
                setErrorText(null)
                setErrorCode(null)
                setShowAdvanced(false)
              }}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                mode === 'presentation'
                  ? 'bg-[#8C52FF] text-white shadow-sm'
                  : 'text-[#8C52FF] hover:text-[#7B3FEE]'
              }`}
            >
              Презентация
            </button>
          </div>

          {/* Generations counter */}
          {user && (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1.5 bg-[#f8f5ff] rounded-full px-3 py-2 border border-[#ede9fe]">
                <LightningIcon className="w-4 h-4 text-[#7c3aed]" />
                <span className="text-sm font-semibold text-[#7c3aed]">
                  <span className="hidden sm:inline">Генераций: </span>{generationsLeft}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowBuyModal(true)}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-[#f8f5ff] text-[#7c3aed] hover:bg-[#ede9fe] transition-all border border-[#ede9fe]"
                title="Пополнить генерации"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className={`w-full rounded-[14px] border-[1.5px] bg-white mb-4 ${
          subjectError || topicError ? 'border-red-300' : 'border-[#e8deff]'
        }`}>
          {/* Top row: Subject + Grade */}
          <div className="flex border-b border-[#e8deff]">
            <div key={`subject-${mode}`} className="flex-[2] min-w-0 px-4 py-3">
              <Controller
                control={mode === 'worksheet' ? form.control : presentationForm.control}
                name="subject"
                render={({ field }) => (
                  <ComboBox
                    value={field.value}
                    onChange={(val) => {
                      field.onChange(val)
                      if (mode === 'worksheet') form.clearErrors('subject')
                      else presentationForm.clearErrors('subject')
                    }}
                    error={!!subjectError}
                  />
                )}
              />
            </div>
            <div className="w-px bg-[#e8deff] my-2" />
            <div key={`grade-${mode}`} className="w-[90px] px-3 py-3">
              <Controller
                control={mode === 'worksheet' ? form.control : presentationForm.control}
                name="grade"
                render={({ field }) => (
                  <GradeDropdown value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
          </div>

          {/* Bottom row: Topic + Submit */}
          <div className="flex items-center gap-2 px-4 py-2">
            <input
              key={mode}
              type="text"
              placeholder="Тема: Сложение двузначных чисел"
              className="flex-1 min-w-0 py-2 text-base text-[#1e293b] placeholder:text-[#94a3b8] outline-none bg-transparent"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handlePromptSubmit() } }}
              {...topicRegister}
            />
            <button
              type="button"
              disabled={isLoading}
              onClick={isGenerationsExhausted ? () => setShowBuyModal(true) : handlePromptSubmit}
              className="flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[#8C52FF] hover:bg-[#7B3FEE] text-white text-sm font-semibold transition-all shadow-md shadow-purple-400/30 disabled:opacity-60 flex-shrink-0"
            >
              {isLoading ? (
                <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <SparkleIcon />
              )}
              <span className="hidden sm:inline">Создать</span>
              <span className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5 text-xs">
                <LightningIcon className="w-3 h-3" />
                {currentCost}
              </span>
            </button>
          </div>
        </div>

        {/* Validation errors */}
        {(subjectError || topicError) && (
          <div className="w-full text-left mb-2">
            {subjectError && <p className="text-sm text-red-500 ml-1">{subjectError}</p>}
            {topicError && <p className="text-sm text-red-500 ml-1">{topicError}</p>}
          </div>
        )}

        {/* API error */}
        {errorText && (
          <div className="w-full mb-4">
            <GenerationErrorMessage
              errorText={errorText}
              errorCode={errorCode}
              onOpenBuyModal={() => setShowBuyModal(true)}
            />
          </div>
        )}

        {/* Advanced toggle pill */}
        <div className="w-full flex justify-center mb-5">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-2 px-[18px] py-[7px] rounded-full text-sm font-medium transition-all border-[1.5px] ${
              showAdvanced
                ? 'border-[#8C52FF] bg-[#f8f5ff] text-[#8C52FF]'
                : 'border-[#8C52FF] text-[#8C52FF] hover:bg-[#f8f5ff]'
            }`}
          >
            <SlidersIcon />
            <span className="hidden sm:inline">
              {mode === 'worksheet' ? 'Параметры задания' : 'Параметры презентации'}
            </span>
            <span className="sm:hidden">Параметры</span>
            <svg
              className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Advanced settings panels */}
        {showAdvanced && mode === 'worksheet' && (
          <WorksheetGenerateForm
            form={form}
            currentVariant={derivedVariant}
            onToggleTaskType={toggleTaskType}
            user={user}
            folders={folders}
          />
        )}

        {showAdvanced && mode === 'presentation' && !generatedPresentation && (
          <PresentationGenerateForm form={presentationForm} />
        )}

        {/* Presentation result */}
        {mode === 'presentation' && generatedPresentation && (
          <PresentationPreview
            presentation={generatedPresentation}
            themePreset={presentationForm.getValues('themePreset')}
            onDownloadPptx={handleDownloadPptx}
            onCreateNew={handleCreateNewPresentation}
          />
        )}

        {/* Example cards */}
        {!generatedPresentation && (
          <div className="w-full mt-10">
            <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide mb-3 text-left">
              Примеры запросов
            </p>
            <div className="flex gap-3 flex-col sm:flex-row">
              {EXAMPLE_PROMPTS.map(ex => (
                <button
                  key={`${ex.subject}-${ex.grade}`}
                  type="button"
                  onClick={() => setSharedFields(ex.subject, ex.grade, ex.topic)}
                  className="flex-1 min-w-0 text-left border border-[#f1f0f9] rounded-[10px] px-3 py-2.5 hover:border-[#8C52FF]/50 hover:shadow-sm transition-all group"
                >
                  <div className="text-[10px] font-medium text-[#a5a0c0] mb-0.5 group-hover:text-[#8C52FF] transition-colors">
                    {ex.subject}, {ex.grade} класс
                  </div>
                  <div className="text-xs font-medium text-[#475569] truncate">{ex.topic}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="mt-8 text-sm text-slate-400">Проверяйте материалы перед печатью</p>
      </main>

      <LandingSections />

      {/* Loading Overlay */}
      {isLoading && <GenerationLoadingOverlay mode={mode} progress={progress} />}

      {/* Low generations warning modal */}
      {showLowGenWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowLowGenWarning(false)} />
          <div className="relative bg-white rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-purple-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-100 rounded-full mb-4">
                <svg className="w-7 h-7 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Генерации заканчиваются!</h3>
              <p className="text-sm text-slate-500 mb-6">
                У вас {generationsLeft === 1 ? 'осталась' : 'осталось'}{' '}
                <span className="font-bold text-amber-600">{generationsLeft}</span>{' '}
                {generationsLeft === 1 ? 'генерация' : 'генерации'}.
                Пополните баланс, чтобы продолжить создание материалов.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowLowGenWarning(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Позже
                </button>
                <button
                  type="button"
                  onClick={() => { setShowLowGenWarning(false); setShowBuyModal(true) }}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#8C52FF] to-[#A855F7] rounded-xl hover:shadow-lg transition-all"
                >
                  Посмотреть тарифы
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Plans Modal */}
      <SubscriptionPlansModal
        isOpen={showBuyModal}
        onClose={() => setShowBuyModal(false)}
      />
    </div>
  )
}
