import { useState, useEffect } from 'react'
import { XMarkIcon } from '../ui/Icons'

interface CreateFolderModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, color: string) => void
  isLoading: boolean
  currentCount: number
  plan: string
  folderLimit?: number
}

const FOLDER_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#22c55e', '#14b8a6', '#3b82f6']

export function CreateFolderModal({
  isOpen,
  onClose,
  onSave,
  isLoading,
  currentCount,
  plan,
  folderLimit,
}: CreateFolderModalProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#6366f1')

  const effectiveLimit = folderLimit ?? (plan === 'free' ? 2 : 10)
  const isLimitReached = currentCount >= effectiveLimit

  useEffect(() => {
    if (isOpen) {
      setName('')
      setColor('#6366f1')
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Новая папка</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <XMarkIcon />
          </button>
        </div>

        <div className={`mb-4 p-3 rounded-xl ${isLimitReached ? 'bg-red-50' : currentCount >= effectiveLimit - 1 ? 'bg-yellow-50' : 'bg-slate-50'}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              Использовано папок: {currentCount} / {effectiveLimit}
            </span>
            {plan === 'free' && (
              <span className="text-xs text-slate-500">Бесплатный тариф</span>
            )}
          </div>
          {isLimitReached && (
            <p className="text-xs text-red-600 mt-1">
              Достигнут лимит папок. {plan === 'free' ? 'Перейдите на платный тариф для увеличения лимита.' : 'Удалите ненужные папки.'}
            </p>
          )}
        </div>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C52FF] mb-4"
          placeholder="Название папки"
          autoFocus
        />
        <div className="mb-4">
          <p className="text-sm text-slate-500 mb-2">Цвет</p>
          <div className="flex gap-2 flex-wrap">
            {FOLDER_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-[#8C52FF]' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={() => onSave(name.trim(), color)}
            disabled={isLoading || !name.trim() || isLimitReached}
            className="flex-1 px-4 py-2.5 bg-[#8C52FF] hover:bg-purple-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Создание...' : isLimitReached ? 'Лимит достигнут' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  )
}
