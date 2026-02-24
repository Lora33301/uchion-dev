import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { UseWorksheetEditorReturn } from './useWorksheetEditor'

export interface UseUnsavedChangesOptions {
  editor: Pick<UseWorksheetEditorReturn, 'isDirty' | 'isEditMode' | 'saveChanges' | 'exitEditMode' | 'discardChanges'>
  /**
   * Optional callback invoked after the user discards changes or saves and navigates away.
   * WorksheetPage uses this to clear localStorage; SavedWorksheetPage omits it.
   */
  onAfterDiscard?: () => void
}

export interface UseUnsavedChangesReturn {
  showUnsavedDialog: boolean
  /** True when an async save triggered from the dialog is in progress */
  handleCancel: () => void
  handleNavigateWithCheck: (to: string) => void
  handleDialogSave: () => Promise<void>
  handleDialogDiscard: () => void
  handleDialogCancel: () => void
}

/**
 * Manages the unsaved-changes confirmation dialog for worksheet pages.
 *
 * Encapsulates:
 * - showUnsavedDialog state
 * - pendingNavigation state
 * - handleCancel (toolbar cancel button — triggers dialog when dirty)
 * - handleNavigateWithCheck (navigation that respects dirty state)
 * - handleDialogSave / handleDialogDiscard / handleDialogCancel
 */
export function useUnsavedChanges({
  editor,
  onAfterDiscard,
}: UseUnsavedChangesOptions): UseUnsavedChangesReturn {
  const navigate = useNavigate()
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)

  // Toolbar "Cancel" button — opens dialog if dirty, exits edit mode otherwise
  const handleCancel = () => {
    if (editor.isDirty) {
      setPendingNavigation(null)
      setShowUnsavedDialog(true)
    } else {
      editor.exitEditMode()
    }
  }

  // Navigation that checks for unsaved changes first
  const handleNavigateWithCheck = (to: string) => {
    if (editor.isDirty && editor.isEditMode) {
      setPendingNavigation(to)
      setShowUnsavedDialog(true)
    } else {
      navigate(to)
    }
  }

  const handleDialogSave = async () => {
    const success = await editor.saveChanges()
    if (success) {
      setShowUnsavedDialog(false)
      if (pendingNavigation) {
        onAfterDiscard?.()
        navigate(pendingNavigation)
      }
    }
  }

  const handleDialogDiscard = () => {
    editor.discardChanges()
    setShowUnsavedDialog(false)
    if (pendingNavigation) {
      onAfterDiscard?.()
      navigate(pendingNavigation)
    }
  }

  const handleDialogCancel = () => {
    setShowUnsavedDialog(false)
    setPendingNavigation(null)
  }

  return {
    showUnsavedDialog,
    handleCancel,
    handleNavigateWithCheck,
    handleDialogSave,
    handleDialogDiscard,
    handleDialogCancel,
  }
}
