import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import {
  fetchWorksheets,
  deleteWorksheet,
  updateWorksheet,
  fetchFolders,
  formatSubjectName,
} from '../lib/dashboard-api'
import type { WorksheetListItem, FolderWithCount } from '../../shared/types'

import { DocumentIcon, TrashIcon, PencilIcon, FolderIcon, FolderMoveIcon, XMarkIcon } from './ui/Icons'

function ArrowRightIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  )
}

// Rename Modal Component
function RenameModal({
  isOpen,
  onClose,
  currentTitle,
  onSave,
  isLoading,
}: {
  isOpen: boolean
  onClose: () => void
  currentTitle: string
  onSave: (title: string) => void
  isLoading: boolean
}) {
  const [title, setTitle] = useState(currentTitle)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Переименовать</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <XMarkIcon />
          </button>
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C52FF] mb-4"
          placeholder="Название листа"
          autoFocus
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={() => onSave(title)}
            disabled={isLoading || !title.trim()}
            className="flex-1 px-4 py-2.5 bg-[#8C52FF] hover:bg-purple-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Move to Folder Modal
function MoveToFolderModal({
  isOpen,
  onClose,
  folders,
  currentFolderId,
  onMove,
  isLoading,
}: {
  isOpen: boolean
  onClose: () => void
  folders: FolderWithCount[]
  currentFolderId: string | null | undefined
  onMove: (folderId: string | null) => void
  isLoading: boolean
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Переместить в папку</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <XMarkIcon />
          </button>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          <button
            onClick={() => onMove(null)}
            disabled={isLoading || currentFolderId === null || currentFolderId === undefined}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              currentFolderId === null || currentFolderId === undefined
                ? 'bg-purple-50 text-[#8C52FF] cursor-default'
                : 'hover:bg-slate-50'
            }`}
          >
            <DocumentIcon className="w-5 h-5 text-slate-400" />
            <span className="font-medium">Без папки</span>
          </button>
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => onMove(folder.id)}
              disabled={isLoading || currentFolderId === folder.id}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                currentFolderId === folder.id
                  ? 'bg-purple-50 text-[#8C52FF] cursor-default'
                  : 'hover:bg-slate-50'
              }`}
            >
              <FolderIcon className="w-5 h-5" color={folder.color} />
              <span className="font-medium">{folder.name}</span>
              <span className="ml-auto text-sm text-slate-400">{folder.worksheetCount}</span>
            </button>
          ))}
        </div>
        {folders.length === 0 && (
          <p className="text-center text-slate-400 py-4">Папок пока нет</p>
        )}
        <div className="mt-4 pt-4 border-t">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}

export default function WorksheetManager() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { status } = useAuth()
  const [renameModal, setRenameModal] = useState<{ id: string; title: string } | null>(null)
  const [moveModal, setMoveModal] = useState<{ id: string; currentFolderId: string | null } | null>(null)

  // Fetch folders for move modal
  const { data: foldersData } = useQuery({
    queryKey: ['folders'],
    queryFn: fetchFolders,
    enabled: status === 'authenticated',
  })

  // Fetch only 3 recent worksheets for dashboard
  const { data: worksheets, isLoading: isLoadingWorksheets } = useQuery({
    queryKey: ['worksheets', 'recent'],
    queryFn: () => fetchWorksheets({ limit: 3 }),
    enabled: status === 'authenticated',
  })

  // Get total count
  const { data: allWorksheets } = useQuery({
    queryKey: ['worksheets', 'all'],
    queryFn: () => fetchWorksheets({ limit: 1000 }),
    enabled: status === 'authenticated',
  })

  const folders = foldersData?.folders || []
  const totalCount = allWorksheets?.length || 0

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: deleteWorksheet,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['worksheets'] })
      queryClient.setQueriesData<WorksheetListItem[]>({ queryKey: ['worksheets'] }, (old) =>
        old?.filter((ws) => ws.id !== id)
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['worksheets'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title?: string; folderId?: string | null } }) =>
      updateWorksheet(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worksheets'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      setRenameModal(null)
      setMoveModal(null)
    },
  })

  const handleRename = (title: string) => {
    if (renameModal && title.trim()) {
      updateMutation.mutate({ id: renameModal.id, data: { title: title.trim() } })
    }
  }

  const handleMove = (folderId: string | null) => {
    if (moveModal) {
      updateMutation.mutate({ id: moveModal.id, data: { folderId } })
    }
  }

  const getDisplayTitle = (ws: WorksheetListItem) => {
    if (ws.title) return ws.title
    return `${formatSubjectName(ws.subject)}, ${ws.grade} класс`
  }

  return (
    <div>
      {/* Header with arrow to full list */}
      <div className="flex items-center gap-3 mb-4">
        <span className="section-badge">{totalCount}</span>
        <Link
          to="/worksheets"
          className="flex items-center gap-2 group"
        >
          <h2 className="text-lg font-bold text-slate-900 group-hover:text-[#8C52FF] transition-colors">Рабочие листы</h2>
          <ArrowRightIcon className="w-5 h-5 text-slate-400 group-hover:text-[#8C52FF] transition-colors" />
        </Link>
      </div>

      {/* Worksheets List - only 5 recent */}
      <div className="glass-container p-4 md:p-6">
        {isLoadingWorksheets ? (
          <div className="flex justify-center py-10">
            <div className="relative">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-purple-200"></div>
              <div className="absolute inset-0 animate-spin rounded-full h-10 w-10 border-t-2 border-[#8C52FF]"></div>
            </div>
          </div>
        ) : !worksheets || worksheets.length === 0 ? (
          <div className="text-center py-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-2xl mb-4">
              <DocumentIcon className="w-8 h-8 text-[#8C52FF]" />
            </div>
            <p className="text-slate-500">Рабочих листов пока нет</p>
            <p className="text-sm text-slate-400 mt-1">Нажмите «Создать» в меню сверху</p>
          </div>
        ) : (
          <div className="space-y-3">
            {worksheets.map((ws) => (
              <div
                key={ws.id}
                className="worksheet-card flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => navigate(`/worksheets/${ws.id}`)}
              >
                <div className="p-2 bg-slate-100 rounded-lg">
                  <DocumentIcon className="w-5 h-5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">
                    {getDisplayTitle(ws)}
                  </p>
                  <p className="text-sm text-slate-500 truncate">{ws.topic}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(ws.createdAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {/* Rename */}
                  <button
                    onClick={() => setRenameModal({ id: ws.id, title: ws.title || getDisplayTitle(ws) })}
                    className="p-2 text-slate-300 hover:text-[#8C52FF] hover:bg-purple-50 rounded-lg transition-all"
                    title="Переименовать"
                  >
                    <PencilIcon />
                  </button>
                  {/* Move to folder */}
                  <button
                    onClick={() => setMoveModal({ id: ws.id, currentFolderId: ws.folderId || null })}
                    className="p-2 text-slate-300 hover:text-[#8C52FF] hover:bg-purple-50 rounded-lg transition-all"
                    title="Переместить в папку"
                  >
                    <FolderMoveIcon />
                  </button>
                  {/* Delete */}
                  <button
                    onClick={() => {
                      if (confirm('Удалить этот рабочий лист?')) {
                        deleteMutation.mutate(ws.id)
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                    title="Удалить"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <RenameModal
        isOpen={!!renameModal}
        onClose={() => setRenameModal(null)}
        currentTitle={renameModal?.title || ''}
        onSave={handleRename}
        isLoading={updateMutation.isPending}
      />

      <MoveToFolderModal
        isOpen={!!moveModal}
        onClose={() => setMoveModal(null)}
        folders={folders}
        currentFolderId={moveModal?.currentFolderId}
        onMove={handleMove}
        isLoading={updateMutation.isPending}
      />
    </div>
  )
}
