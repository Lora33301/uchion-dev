import { Link, useNavigate } from 'react-router-dom'
import {
  fetchWorksheets,
  deleteWorksheet,
  updateWorksheet,
  formatSubjectName,
} from '../lib/dashboard-api'
import type { WorksheetListItem } from '../../shared/types'
import Header from '../components/Header'
import {
  DocumentIcon,
  TrashIcon,
  PencilIcon,
  ChevronLeftIcon,
  FolderMoveIcon,
} from '../components/ui/Icons'
import { PageSpinner } from '../components/ui/LoadingSpinner'
import { useListPage } from '../hooks/useListPage'
import { RenameModal } from '../components/list-page/RenameModal'
import { MoveToFolderModal } from '../components/list-page/MoveToFolderModal'
import { CreateFolderModal } from '../components/list-page/CreateFolderModal'
import { FolderFilter } from '../components/list-page/FolderFilter'
import { ListPagePagination } from '../components/list-page/ListPagePagination'

function getDisplayTitle(ws: WorksheetListItem) {
  if (ws.title) return ws.title
  return `${formatSubjectName(ws.subject)}, ${ws.grade} класс`
}

export default function WorksheetsListPage() {
  const navigate = useNavigate()
  const lp = useListPage<WorksheetListItem>({
    queryKey: ['worksheets'],
    invalidateKey: ['worksheets'],
    fetchFn: fetchWorksheets,
    deleteFn: deleteWorksheet,
    updateFn: updateWorksheet,
  })

  if (lp.status === 'loading') return <PageSpinner />
  if (!lp.user) return null

  const folderLimit = lp.user.limits?.folders ?? (lp.user.subscription?.plan === 'free' ? 2 : 10)

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-purple-50/30 to-white">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-10">
        {/* Back button and title */}
        <div className="mb-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-[#8C52FF] transition-colors mb-4"
          >
            <ChevronLeftIcon />
            <span className="font-medium">Назад в кабинет</span>
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Рабочие листы</h1>
          <p className="text-slate-500 mt-1">
            Всего: {lp.totalItems}
            {lp.user.limits?.maxWorksheets != null && lp.user.limits.maxWorksheets !== -1 && (
              <span className="text-slate-400"> / {lp.user.limits.maxWorksheets}</span>
            )}
          </p>
        </div>

        <FolderFilter
          folders={lp.folders}
          folderLimitDisplay={`${lp.folders.length}/${folderLimit}`}
          selectedFolderId={lp.selectedFolderId}
          onSelectFolder={lp.setSelectedFolderId}
          onCreateFolder={() => lp.setCreateFolderModal(true)}
          onDeleteFolder={(id) => lp.deleteFolderMutation.mutate(id)}
          isDeletePending={lp.deleteFolderMutation.isPending}
          rootItemCount={lp.foldersData?.rootWorksheetCount || 0}
          getFolderItemCount={(f) => f.worksheetCount}
          deleteConfirmMessage={(name) => `Удалить папку "${name}"? Все листы из этой папки будут перемещены в корень.`}
        />

        {/* Worksheets Grid */}
        {lp.isLoading ? (
          <div className="flex justify-center py-20">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-purple-200"></div>
              <div className="absolute inset-0 animate-spin rounded-full h-12 w-12 border-t-2 border-[#8C52FF]"></div>
            </div>
          </div>
        ) : lp.totalItems === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-purple-100 rounded-3xl mb-6">
              <DocumentIcon className="w-12 h-12 text-[#8C52FF]" />
            </div>
            <p className="text-slate-500 text-xl mb-2">Рабочих листов пока нет</p>
            <p className="text-sm text-slate-400 mb-6">Создайте свой первый рабочий лист</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#8C52FF] hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Создать лист
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lp.paginatedItems.map((ws) => (
                <div
                  key={ws.id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden group"
                >
                  <div
                    className="p-5 cursor-pointer"
                    onClick={() => navigate(`/worksheets/${ws.id}`)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl shrink-0">
                        <DocumentIcon className="w-6 h-6 text-[#8C52FF]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 truncate text-lg mb-1 group-hover:text-[#8C52FF] transition-colors">
                          {getDisplayTitle(ws)}
                        </h3>
                        <p className="text-sm text-slate-500 truncate mb-2">{ws.topic}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(ws.createdAt).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 pb-4 flex items-center gap-2 border-t border-slate-50 pt-3">
                    <button
                      onClick={() => lp.setRenameModal({ id: ws.id, title: ws.title || getDisplayTitle(ws) })}
                      className="p-2 text-slate-400 hover:text-[#8C52FF] hover:bg-purple-50 rounded-lg transition-all"
                      title="Переименовать"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      onClick={() => lp.setMoveModal({ id: ws.id, currentFolderId: ws.folderId || null })}
                      className="p-2 text-slate-400 hover:text-[#8C52FF] hover:bg-purple-50 rounded-lg transition-all"
                      title="Переместить в папку"
                    >
                      <FolderMoveIcon />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Удалить этот рабочий лист?')) {
                          lp.deleteMutation.mutate(ws.id)
                        }
                      }}
                      disabled={lp.deleteMutation.isPending}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50 ml-auto"
                      title="Удалить"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <ListPagePagination
              currentPage={lp.currentPage}
              totalPages={lp.totalPages}
              onPageChange={lp.setCurrentPage}
            />
          </>
        )}
      </main>

      <RenameModal
        isOpen={!!lp.renameModal}
        onClose={() => lp.setRenameModal(null)}
        currentTitle={lp.renameModal?.title || ''}
        onSave={lp.handleRename}
        isLoading={lp.updateMutation.isPending}
        placeholder="Название листа"
      />

      <MoveToFolderModal
        isOpen={!!lp.moveModal}
        onClose={() => lp.setMoveModal(null)}
        folders={lp.folders}
        currentFolderId={lp.moveModal?.currentFolderId}
        onMove={lp.handleMove}
        isLoading={lp.moveMutation.isPending}
        getFolderItemCount={(f) => f.worksheetCount}
      />

      <CreateFolderModal
        isOpen={lp.createFolderModal}
        onClose={() => lp.setCreateFolderModal(false)}
        onSave={lp.handleCreateFolder}
        isLoading={lp.isCreateFolderPending}
        currentCount={lp.folders.length}
        plan={lp.user.subscription?.plan || 'free'}
        folderLimit={lp.user.limits?.folders}
      />
    </div>
  )
}
