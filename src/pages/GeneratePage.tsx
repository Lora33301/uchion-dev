import { useState, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
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
import type { PresentationStructure, GeneratePayload, GeneratePresentationPayload } from '../../shared/types'
import { downloadBase64File } from '../lib/download-utils'
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
import type { GenerateMode } from '../components/generation/types'

// =============================================================================
// Helpers
// =============================================================================

function formValuesToPayload(v: GenerateFormValues): GeneratePayload {
  return {
    prompt: v.prompt,
    folderId: v.folderId,
    taskTypes: v.taskTypes,
    difficulty: v.difficulty,
    format: v.format,
    variantIndex: v.variantIndex,
  }
}

function presentationFormToPayload(v: GeneratePresentationFormValues): GeneratePresentationPayload {
  return { prompt: v.prompt, themeType: v.themeType, themePreset: v.themePreset, slideCount: v.slideCount }
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 0 && hour < 5) return 'Доброй ночи'
  if (hour >= 5 && hour < 12) return 'Доброе утро'
  if (hour >= 12 && hour < 18) return 'Добрый день'
  return 'Добрый вечер'
}

// =============================================================================
// Small sub-components
// =============================================================================

interface ModeChipProps {
  active: boolean
  disabled?: boolean
  icon: ReactNode
  label: string
  onClick?: () => void
}

function ModeChip({ active, disabled, icon, label, onClick }: ModeChipProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={disabled ? 'Скоро будет доступно' : undefined}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border
        ${active
          ? 'bg-[#8C52FF] text-white border-[#8C52FF] shadow-md shadow-purple-400/25'
          : disabled
          ? 'bg-white text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
          : 'bg-white text-slate-600 border-slate-200 hover:border-[#8C52FF]/50 hover:text-slate-800'
        }
      `}
    >
      {icon}
      {label}
    </button>
  )
}

// =============================================================================
// Icons (inline SVG)
// =============================================================================

const ClipboardIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
)

const ScreenIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
)

const BookIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
)

const ImageIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const SettingsIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const SparklesIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
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

  // Whether user is logged in but has 0 generations
  const isGenerationsExhausted = !!user && !canGenerate(user)

  // Mode: worksheet or presentation
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<GenerateMode>(
    searchParams.get('tab') === 'presentation' ? 'presentation' : 'worksheet'
  )

  // Sync mode with URL param when navigating from other pages
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

  // Worksheet form — prompt-based
  const form = useForm<GenerateFormValues>({
    resolver: zodResolver(GenerateFormSchema),
    defaultValues: {
      prompt: '',
      folderId: null,
      format: 'test_and_open',
      variantIndex: 0,
      difficulty: 'medium',
      taskTypes: ['single_choice', 'open_question'],
    }
  })

  // Presentation form — prompt-based
  const presentationForm = useForm<GeneratePresentationFormValues>({
    resolver: zodResolver(GeneratePresentationFormSchema),
    defaultValues: {
      prompt: '',
      themeType: 'preset',
      themePreset: 'professional',
      slideCount: 12,
    }
  })

  // Helpers to interact with the active form's prompt field
  const activePromptRegister = mode === 'worksheet' ? form.register('prompt') : presentationForm.register('prompt')
  const setActivePrompt = (value: string) => {
    if (mode === 'worksheet') {
      form.setValue('prompt', value)
      form.clearErrors('prompt')
    } else {
      presentationForm.setValue('prompt', value)
      presentationForm.clearErrors('prompt')
    }
  }

  const watchFormat = form.watch('format')
  const watchVariantIndex = form.watch('variantIndex')
  const watchSlideCount = presentationForm.watch('slideCount')

  const presentationCost = PRESENTATION_COST[watchSlideCount ?? 12] ?? 2

  // Derive currentFormat and currentVariant from watched values
  const derivedFormat = FORMATS.find(f => f.id === watchFormat)
  const derivedVariant = derivedFormat?.variants[watchVariantIndex]
  const generationCost = derivedVariant?.generations || 1

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
    mutationFn: (values: GenerateFormValues) => generateWorksheet(formValuesToPayload(values), (p) => setProgress(p)),
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
        payload: {
          subject: worksheet.subject,
          grade: parseInt(worksheet.grade) || 0,
          topic: worksheet.topic,
          difficulty: form.getValues('difficulty'),
        },
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
    const filename = `${generatedPresentation.title.replace(/[^a-zа-яё0-9\s]/gi, '_')}.pptx`
    downloadBase64File(generatedPresentation.pptxBase64, filename, 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
  }

  const handleCreateNewPresentation = () => {
    setGeneratedPresentation(null)
    setErrorText(null)
    setErrorCode(null)
    setProgress(0)
    presentationForm.reset({
      prompt: '',
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

  // Handle unified prompt submit
  const handlePromptSubmit = () => {
    if (mode === 'worksheet') {
      form.handleSubmit(onSubmit)()
    } else {
      presentationForm.handleSubmit(onPresentationSubmit)()
    }
  }

  const isLoading = mutation.isPending || presentationMutation.isPending

  // Prompt field error (from active form)
  const promptError = mode === 'worksheet'
    ? form.formState.errors.prompt?.message
    : presentationForm.formState.errors.prompt?.message

  // Current cost badge value
  const currentCost = mode === 'worksheet' ? generationCost : presentationCost

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-purple-50 to-white font-sans text-slate-900 relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-[-20%] left-[50%] w-[1000px] h-[1000px] -translate-x-1/2 rounded-full bg-gradient-to-b from-purple-100/40 to-transparent blur-3xl pointer-events-none" />

      <Header />

      <main className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-4 py-12 text-center">
        {/* Greeting header */}
        <div className="w-full mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {greeting}{user?.name ? `, ${user.name}` : ''}!
          </h1>
          <p className="text-lg text-slate-500">Опишите, что хотите создать</p>
        </div>

        {/* Unified prompt input */}
        <div className="w-full mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder={
                mode === 'worksheet'
                  ? 'Задания по математике, 5 класс, тема дроби...'
                  : 'Презентация по геометрии, 8 класс, теорема Пифагора...'
              }
              className={`h-14 w-full rounded-full border bg-white px-6 pr-36 text-base text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-sm
                ${promptError
                  ? 'border-red-400 focus:border-red-400 focus:ring-4 focus:ring-red-400/10'
                  : 'border-slate-200 focus:border-[#8C52FF] focus:ring-4 focus:ring-[#8C52FF]/10'
                }
              `}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handlePromptSubmit() } }}
              {...activePromptRegister}
            />
            <button
              type="button"
              disabled={isLoading}
              onClick={isGenerationsExhausted ? () => setShowBuyModal(true) : handlePromptSubmit}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 px-5 py-2 rounded-full bg-[#8C52FF] hover:bg-[#7B3FEE] text-white text-sm font-semibold transition-all shadow-md shadow-purple-400/30 disabled:opacity-60"
            >
              {isLoading ? (
                <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <SparklesIcon />
              )}
              <span className="hidden sm:inline">Создать</span>
              <span className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5 text-xs">
                <SparklesIcon />
                {currentCost}
              </span>
            </button>
          </div>
          {promptError && (
            <p className="text-sm text-red-500 text-left mt-1.5 ml-4">{promptError}</p>
          )}
        </div>

        {/* Material type chips + generations counter row */}
        <div className="w-full flex items-center justify-between gap-2 flex-wrap mb-6">
          <div className="flex flex-wrap gap-2">
            <ModeChip
              active={mode === 'worksheet'}
              icon={<ClipboardIcon />}
              label="Задания"
              onClick={() => {
                setMode('worksheet')
                setGeneratedPresentation(null)
                setErrorText(null)
                setErrorCode(null)
                setShowAdvanced(false)
              }}
            />
            <ModeChip
              active={mode === 'presentation'}
              icon={<ScreenIcon />}
              label="Презентация"
              onClick={() => {
                setMode('presentation')
                setErrorText(null)
                setErrorCode(null)
                setShowAdvanced(false)
              }}
            />
            <ModeChip
              active={false}
              disabled
              icon={<BookIcon />}
              label="План урока"
            />
            <ModeChip
              active={false}
              disabled
              icon={<ImageIcon />}
              label="Картинка"
            />
          </div>

          {/* Generations counter */}
          {user && (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1.5 bg-purple-50/80 backdrop-blur-sm rounded-full px-3 py-2 border border-purple-200/60 shadow-[0_0_8px_rgba(140,82,255,0.15)]">
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
            </div>
          )}
        </div>

        {/* Collapsible params toggle */}
        <div className="w-full mb-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
          >
            <SettingsIcon />
            {mode === 'worksheet' ? 'Параметры задания' : 'Параметры презентации'}
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

        {/* Worksheet params */}
        {mode === 'worksheet' && (
          <WorksheetGenerateForm
            form={form}
            currentFormat={derivedFormat}
            currentVariant={derivedVariant}
            generationCost={generationCost}
            showAdvanced={showAdvanced}
            errorText={errorText}
            errorCode={errorCode}
            onToggleTaskType={toggleTaskType}
            onOpenBuyModal={() => setShowBuyModal(true)}
            user={user}
            folders={folders}
          />
        )}

        {/* Presentation params + result */}
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

            {/* Params - hidden when result is shown */}
            {!generatedPresentation && (
              <PresentationGenerateForm
                form={presentationForm}
                errorText={errorText}
                errorCode={errorCode}
                onOpenBuyModal={() => setShowBuyModal(true)}
              />
            )}
          </>
        )}

        {/* Example cards */}
        {!generatedPresentation && (
          <div className="w-full mt-10">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3 text-left">Примеры запросов</p>
            <div className="flex gap-3 flex-wrap sm:flex-nowrap">
              {EXAMPLE_PROMPTS.map(ex => (
                <button
                  key={ex.prompt}
                  type="button"
                  onClick={() => setActivePrompt(ex.prompt)}
                  className="flex-1 min-w-0 text-left bg-white border border-slate-200 rounded-2xl px-5 py-4 hover:border-[#8C52FF]/50 hover:shadow-sm transition-all group"
                >
                  <div className="text-xs font-semibold text-slate-500 mb-1 group-hover:text-[#8C52FF] transition-colors">
                    {ex.subject}, {ex.grade}
                  </div>
                  <div className="text-sm font-medium text-slate-800 truncate">{ex.topic}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="mt-8 text-sm text-slate-400">
          Проверяйте материалы перед печатью
        </p>
      </main>

      {/* Loading Overlay */}
      {isLoading && (
        <GenerationLoadingOverlay mode={mode} progress={progress} />
      )}

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
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Генерации заканчиваются!
              </h3>
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
