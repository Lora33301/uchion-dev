import type { FolderWithCount } from '../../../shared/types'
import { TrashIcon, FolderIcon } from '../ui/Icons'

interface FolderFilterProps {
  folders: FolderWithCount[]
  folderLimitDisplay: string
  selectedFolderId: string | null | 'all'
  onSelectFolder: (folderId: string | null | 'all') => void
  onCreateFolder: () => void
  onDeleteFolder: (folderId: string) => void
  isDeletePending: boolean
  rootItemCount: number
  getFolderItemCount: (folder: FolderWithCount) => number
  deleteConfirmMessage: (folderName: string) => string
}

export function FolderFilter({
  folders,
  folderLimitDisplay,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
  isDeletePending,
  rootItemCount,
  getFolderItemCount,
  deleteConfirmMessage,
}: FolderFilterProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-slate-500">Папки ({folderLimitDisplay})</h2>
        <button
          onClick={onCreateFolder}
          className="text-sm text-[#8C52FF] hover:text-purple-700 font-medium"
        >
          + Новая папка
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSelectFolder('all')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            selectedFolderId === 'all'
              ? 'bg-[#8C52FF] text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Все
        </button>
        <button
          onClick={() => onSelectFolder(null)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            selectedFolderId === null
              ? 'bg-[#8C52FF] text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Без папки ({rootItemCount})
        </button>
        {folders.map((folder) => (
          <div key={folder.id} className="relative group">
            <button
              onClick={() => onSelectFolder(folder.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
                selectedFolderId === folder.id
                  ? 'bg-[#8C52FF] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: folder.color }} />
              {folder.name} ({getFolderItemCount(folder)})
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (confirm(deleteConfirmMessage(folder.name))) {
                  onDeleteFolder(folder.id)
                }
              }}
              disabled={isDeletePending}
              className="absolute -top-1 -right-1 p-1 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 disabled:opacity-50"
              title="Удалить папку"
            >
              <TrashIcon />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
