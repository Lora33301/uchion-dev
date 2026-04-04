import { Link, useNavigate } from 'react-router-dom'
import { formatSubjectName } from '../lib/dashboard-api'
import {
  fetchPresentations,
  deletePresentation,
  updatePresentation,
} from '../lib/presentation-api'
import type { PresentationListItem } from '../../shared/types'
import Header from '../components/Header'
import {
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

function PresentationIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
    </svg>
  )
}

export default function PresentationsListPage() {
  const navigate = useNavigate()
  const lp = useListPage<PresentationListItem>({
    queryKey: ['presentations', 'list'],
    invalidateKey: ['presentations'],
    fetchFn: fetchPresentations,
    deleteFn: deletePresentation,
    updateFn: updatePresentation,
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
          <h1 className="text-3xl font-bold text-slate-900">Презентации</h1>
          <p className="text-slate-500 mt-1">
            Всего: {lp.totalItems}
            {lp.user.limits?.maxPresentations != null && lp.user.limits.maxPresentations !== -1 && (
              <span className="text-slate-400"> / {lp.user.limits.maxPresentations}</span>
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
          rootItemCount={lp.foldersData?.rootPresentationCount || 0}
          getFolderItemCount={(f) => f.presentationCount || 0}
          deleteConfirmMessage={(name) => `Удалить папку "${name}"? Все презентации из этой папки будут перемещены в корень.`}
        />

        {/* Presentations Grid */}
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
              <PresentationIcon className="w-12 h-12 text-[#8C52FF]" />
            </div>
            <p className="text-slate-500 text-xl mb-2">Презентаций пока нет</p>
            <p className="text-sm text-slate-400 mb-6">Создайте свою первую презентацию</p>
            <Link
              to="/presentations/generate"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#8C52FF] hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Создать презентацию
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lp.paginatedItems.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden group"
                >
                  <div
                    className="p-5 cursor-pointer"
                    onClick={() => navigate(`/presentations/${p.id}`)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl shrink-0">
                        <PresentationIcon className="w-6 h-6 text-[#8C52FF]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 truncate text-lg mb-1 group-hover:text-[#8C52FF] transition-colors">
                          {p.title}
                        </h3>
                        <p className="text-sm text-slate-500 truncate mb-1">
                          {formatSubjectName(p.subject)}, {p.grade} кл.
                        </p>
                        <p className="text-xs text-slate-400">
                          {p.slideCount} слайдов
                          <span className="mx-1.5 text-slate-300">|</span>
                          {new Date(p.createdAt).toLocaleDateString('ru-RU', {
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
                      onClick={() => lp.setRenameModal({ id: p.id, title: p.title })}
                      className="p-2 text-slate-400 hover:text-[#8C52FF] hover:bg-purple-50 rounded-lg transition-all"
                      title="Переименовать"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      onClick={() => lp.setMoveModal({ id: p.id, currentFolderId: p.folderId || null })}
                      className="p-2 text-slate-400 hover:text-[#8C52FF] hover:bg-purple-50 rounded-lg transition-all"
                      title="Переместить в папку"
                    >
                      <FolderMoveIcon />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Удалить эту презентацию?')) {
                          lp.deleteMutation.mutate(p.id)
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
        placeholder="Название презентации"
      />

      <MoveToFolderModal
        isOpen={!!lp.moveModal}
        onClose={() => lp.setMoveModal(null)}
        folders={lp.folders}
        currentFolderId={lp.moveModal?.currentFolderId}
        onMove={lp.handleMove}
        isLoading={lp.moveMutation.isPending}
        getFolderItemCount={(f) => f.presentationCount || 0}
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
