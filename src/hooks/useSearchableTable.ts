import { useState, useCallback, type FormEvent } from 'react'

interface UseSearchableTableOptions {
  limit?: number
}

export function useSearchableTable<TStatus extends string = string>(
  defaultStatus: TStatus,
  options: UseSearchableTableOptions = {},
) {
  const limit = options.limit ?? 20
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState<TStatus>(defaultStatus)

  const handleSearch = useCallback((e: FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }, [searchInput])

  const handleClearSearch = useCallback(() => {
    setSearchInput('')
    setSearch('')
    setPage(1)
  }, [])

  const handleStatusChange = useCallback((status: TStatus) => {
    setStatusFilter(status)
    setPage(1)
  }, [])

  return {
    page,
    setPage,
    search,
    searchInput,
    setSearchInput,
    statusFilter,
    limit,
    handleSearch,
    handleClearSearch,
    handleStatusChange,
  }
}
