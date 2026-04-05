import { useState, useRef, useEffect } from 'react'
import { COMBO_SUBJECTS } from '../../constants/generation'

interface ComboBoxProps {
  value: string
  onChange: (value: string) => void
  error?: boolean
}

export default function ComboBox({ value, onChange, error }: ComboBoxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus()
  }, [isOpen])

  const filtered = COMBO_SUBJECTS.filter(s =>
    s.toLowerCase().includes(search.toLowerCase())
  )

  const hasExactMatch = COMBO_SUBJECTS.some(s =>
    s.toLowerCase() === search.toLowerCase()
  )

  const handleSelect = (subject: string) => {
    onChange(subject)
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left"
      >
        <span className="block text-[9px] uppercase tracking-wider text-[#a5a0c0] font-medium mb-0.5">
          Предмет
        </span>
        <span className="flex items-center gap-1">
          <span className={`block truncate text-base ${value ? 'font-medium text-[#1e293b]' : 'text-[#94a3b8]'}`}>
            {value || 'Выберите предмет'}
          </span>
          <svg
            className={`w-3 h-3 text-[#a5a0c0] flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className={`absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl ring-1 ring-black/5 z-50 overflow-hidden ${error ? 'ring-red-300' : ''}`}>
          <div className="p-2 border-b border-slate-100">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && search) {
                  e.preventDefault()
                  if (filtered.length === 1) handleSelect(filtered[0])
                  else if (!hasExactMatch) handleSelect(search)
                }
              }}
              placeholder="Поиск предмета..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 outline-none focus:border-[#8C52FF] focus:ring-2 focus:ring-[#8C52FF]/20"
            />
          </div>
          <div className="max-h-60 overflow-auto py-1">
            {filtered.map(subject => (
              <button
                key={subject}
                type="button"
                onClick={() => handleSelect(subject)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  value === subject
                    ? 'bg-violet-50 text-[#8C52FF] font-semibold'
                    : 'text-slate-900 hover:bg-violet-50 hover:text-violet-700'
                }`}
              >
                {search ? (
                  highlightMatch(subject, search)
                ) : (
                  subject
                )}
              </button>
            ))}
            {search && !hasExactMatch && (
              <button
                type="button"
                onClick={() => handleSelect(search)}
                className="w-full text-left px-4 py-2.5 text-sm text-[#8C52FF] hover:bg-violet-50 transition-colors border-t border-slate-100"
              >
                + Использовать &laquo;{search}&raquo;
              </button>
            )}
            {!search && (
              <button
                type="button"
                onClick={() => inputRef.current?.focus()}
                className="w-full text-left px-4 py-2.5 text-sm text-[#8C52FF] hover:bg-violet-50 transition-colors border-t border-slate-100"
              >
                + Свой предмет...
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function highlightMatch(text: string, query: string) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-semibold text-[#8C52FF]">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  )
}
