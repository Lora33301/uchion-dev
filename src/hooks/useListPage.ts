import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../lib/auth'
import { fetchFolders, createFolder, deleteFolder } from '../lib/dashboard-api'

const ITEMS_PER_PAGE = 9

interface UseListPageConfig<T extends { id: string }> {
  /** Base query key for items, e.g. ['worksheets'] or ['presentations', 'list'] */
  queryKey: string[]
  /** Query key prefix for invalidation/optimistic updates, e.g. ['worksheets'] or ['presentations'] */
  invalidateKey: string[]
  fetchFn: (options?: { folderId?: string | null; limit?: number }) => Promise<T[]>
  deleteFn: (id: string) => Promise<void>
  updateFn: (id: string, data: { title?: string; folderId?: string | null }) => Promise<void>
}

export function useListPage<T extends { id: string }>(config: UseListPageConfig<T>) {
  const { queryKey, invalidateKey, fetchFn, deleteFn, updateFn } = config
  const navigate = useNavigate()
  const { user, status } = useAuth()
  const queryClient = useQueryClient()

  const [renameModal, setRenameModal] = useState<{ id: string; title: string } | null>(null)
  const [moveModal, setMoveModal] = useState<{ id: string; currentFolderId: string | null } | null>(null)
  const [createFolderModal, setCreateFolderModal] = useState(false)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null | 'all'>('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Redirect unauthenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      navigate('/login')
    }
  }, [status, navigate])

  // Reset page when folder changes
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedFolderId])

  // Fetch folders
  const { data: foldersData } = useQuery({
    queryKey: ['folders'],
    queryFn: fetchFolders,
    enabled: status === 'authenticated',
  })

  // Fetch all items (client-side pagination)
  const { data: allItems, isLoading } = useQuery({
    queryKey: [...queryKey, selectedFolderId],
    queryFn: () => {
      if (selectedFolderId === 'all') {
        return fetchFn({ limit: 1000 })
      } else if (selectedFolderId === null) {
        return fetchFn({ folderId: null, limit: 1000 })
      } else {
        return fetchFn({ folderId: selectedFolderId, limit: 1000 })
      }
    },
    enabled: status === 'authenticated',
  })

  // Delete mutation (optimistic)
  const deleteMutation = useMutation({
    mutationFn: deleteFn,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: invalidateKey })
      queryClient.setQueriesData<T[]>({ queryKey: invalidateKey }, (old) =>
        old?.filter((item) => item.id !== id)
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: invalidateKey })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
    },
  })

  // Rename mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title?: string } }) => updateFn(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateKey })
      setRenameModal(null)
    },
    onError: (error) => {
      alert(error instanceof Error ? error.message : 'Не удалось переименовать')
    },
  })

  // Move to folder mutation
  const moveMutation = useMutation({
    mutationFn: ({ id, folderId }: { id: string; folderId: string | null }) => updateFn(id, { folderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateKey })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      setMoveModal(null)
    },
    onError: (error) => {
      alert(error instanceof Error ? error.message : 'Не удалось переместить')
    },
  })

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) => createFolder({ name, color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      setCreateFolderModal(false)
    },
    onError: (error) => {
      alert(error instanceof Error ? error.message : 'Не удалось создать папку')
    },
  })

  // Delete folder mutation
  const deleteFolderMutation = useMutation({
    mutationFn: deleteFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      queryClient.invalidateQueries({ queryKey: invalidateKey })
      if (selectedFolderId !== 'all' && selectedFolderId !== null) {
        setSelectedFolderId('all')
      }
    },
    onError: (error) => {
      alert(error instanceof Error ? error.message : 'Не удалось удалить папку')
    },
  })

  const handleRename = (title: string) => {
    if (renameModal && title.trim()) {
      updateMutation.mutate({ id: renameModal.id, data: { title: title.trim() } })
    }
  }

  const handleMove = (folderId: string | null) => {
    if (moveModal) {
      moveMutation.mutate({ id: moveModal.id, folderId })
    }
  }

  const handleCreateFolder = (name: string, color: string) => {
    createFolderMutation.mutate({ name, color })
  }

  // Pagination
  const folders = foldersData?.folders || []
  const totalItems = allItems?.length || 0
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedItems = allItems?.slice(startIndex, startIndex + ITEMS_PER_PAGE) || []

  return {
    user,
    status,
    // Folders
    folders,
    foldersData,
    selectedFolderId,
    setSelectedFolderId,
    // Items
    paginatedItems,
    totalItems,
    totalPages,
    isLoading,
    // Pagination
    currentPage,
    setCurrentPage,
    // Modals state
    renameModal,
    setRenameModal,
    moveModal,
    setMoveModal,
    createFolderModal,
    setCreateFolderModal,
    // Mutations
    deleteMutation,
    updateMutation,
    moveMutation,
    deleteFolderMutation,
    // Handlers
    handleRename,
    handleMove,
    handleCreateFolder,
    // Mutation loading states
    isCreateFolderPending: createFolderMutation.isPending,
  }
}
