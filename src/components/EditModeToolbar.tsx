import React from 'react'
import { PencilIcon, CheckIcon, XMarkIcon } from './ui/Icons'
import { Spinner } from './ui/LoadingSpinner'

interface EditModeToolbarProps {
  isEditMode: boolean
  isDirty: boolean
  isSaving: boolean
  error: string | null
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
}

export default function EditModeToolbar({
  isEditMode,
  isDirty,
  isSaving,
  error,
  onEdit,
  onSave,
  onCancel,
}: EditModeToolbarProps) {
  if (!isEditMode) {
    // View mode - show Edit button
    return (
      <button
        onClick={onEdit}
        className="group flex flex-col items-center gap-0.5 pt-4"
        title="Редактировать"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-indigo-100 bg-white shadow-sm transition-all group-hover:bg-indigo-50 group-active:scale-95">
          <PencilIcon className="h-5 w-5 text-indigo-600" />
        </div>
        <span className="text-[10px] font-medium text-gray-500 group-hover:text-indigo-600">Редактировать</span>
      </button>
    )
  }

  // Edit mode - show Save and Cancel buttons
  return (
    <div className="flex items-center gap-3">
      {/* Error message */}
      {error && (
        <span className="text-xs text-red-500 max-w-[150px] truncate" title={error}>
          {error}
        </span>
      )}

      {/* Dirty indicator */}
      {isDirty && !error && (
        <span className="text-xs text-amber-600 font-medium">
          Есть изменения
        </span>
      )}

      {/* Cancel button */}
      <button
        onClick={onCancel}
        disabled={isSaving}
        className="group flex flex-col items-center gap-0.5 pt-4"
        title="Отменить"
      >
        <div className={`flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition-all ${isSaving ? 'opacity-50 cursor-not-allowed' : 'group-hover:bg-gray-50 group-active:scale-95'}`}>
          <XMarkIcon className="h-5 w-5 text-gray-600" />
        </div>
        <span className="text-[10px] font-medium text-gray-500 group-hover:text-gray-700">Отменить</span>
      </button>

      {/* Save button */}
      <button
        onClick={onSave}
        disabled={isSaving || !isDirty}
        className="group flex flex-col items-center gap-0.5 pt-4"
        title={isDirty ? "Сохранить" : "Нет изменений"}
      >
        <div className={`flex h-10 w-10 items-center justify-center rounded-full border shadow-sm transition-all ${
          isSaving || !isDirty
            ? 'border-gray-200 bg-gray-100 cursor-not-allowed'
            : 'border-green-200 bg-green-500 group-hover:bg-green-600 group-active:scale-95'
        }`}>
          {isSaving ? (
            <Spinner className="h-5 w-5" />
          ) : (
            <CheckIcon className={`h-5 w-5 ${isDirty ? 'text-white' : 'text-gray-400'}`} />
          )}
        </div>
        <span className={`text-[10px] font-medium ${isDirty ? 'text-green-600' : 'text-gray-400'}`}>
          {isSaving ? 'Сохранение...' : 'Сохранить'}
        </span>
      </button>
    </div>
  )
}
