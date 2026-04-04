import React from 'react'
import { SearchIcon } from '../ui/Icons'

interface AdminSearchBarProps {
  searchInput: string
  onSearchInputChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  onClear: () => void
  showClear: boolean
  placeholder?: string
}

export function AdminSearchBar({
  searchInput,
  onSearchInputChange,
  onSubmit,
  onClear,
  showClear,
  placeholder = 'Поиск по email пользователя...',
}: AdminSearchBarProps) {
  return (
    <div className="glass-container p-4">
      <form onSubmit={onSubmit} className="flex gap-3">
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => onSearchInputChange(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C52FF]/20 focus:border-[#8C52FF]"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 bg-[#8C52FF] text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
        >
          Найти
        </button>
        {showClear && (
          <button
            type="button"
            onClick={onClear}
            className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition-colors"
          >
            Сбросить
          </button>
        )}
      </form>
    </div>
  )
}
