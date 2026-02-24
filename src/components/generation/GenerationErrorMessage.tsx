interface GenerationErrorMessageProps {
  errorText: string
  errorCode: string | null
  onOpenBuyModal: () => void
}

export default function GenerationErrorMessage({ errorText, errorCode, onOpenBuyModal }: GenerationErrorMessageProps) {
  const isLimitError = errorCode === 'LIMIT_EXCEEDED' || errorCode === 'DAILY_LIMIT_EXCEEDED'

  return (
    <div className={`rounded-xl border p-5 text-sm ${
      isLimitError
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-red-200 bg-red-50 text-red-700'
    }`}>
      {isLimitError ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <div>
            <p className="font-semibold text-base mb-1">
              {errorCode === 'DAILY_LIMIT_EXCEEDED'
                ? 'Вы достигли суточного лимита'
                : 'Лимит генераций исчерпан'}
            </p>
            <p className="text-amber-600">
              {errorCode === 'DAILY_LIMIT_EXCEEDED'
                ? 'Обновление в 00:00 по МСК'
                : 'Приобретите дополнительные генерации для продолжения работы'}
            </p>
          </div>
          {errorCode === 'LIMIT_EXCEEDED' && (
            <button
              type="button"
              onClick={onOpenBuyModal}
              className="mt-1 px-5 py-2 rounded-lg bg-[#8C52FF] text-white text-sm font-medium hover:bg-[#7B3FEE] transition-colors"
            >
              Оформить подписку
            </button>
          )}
        </div>
      ) : (
        errorText
      )}
    </div>
  )
}
