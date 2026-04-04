import { ChevronLeftIcon, ChevronRightIcon } from '../ui/Icons'

interface AdminPaginationProps {
  page: number
  totalPages: number
  total: number
  limit: number
  onPageChange: (page: number) => void
}

export function AdminPagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
}: AdminPaginationProps) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
      <p className="text-sm text-slate-500">
        Показано {(page - 1) * limit + 1}&ndash;{Math.min(page * limit, total)} из {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeftIcon className="w-5 h-5 text-slate-600" />
        </button>
        <span className="px-3 py-1 text-sm font-medium text-slate-600">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRightIcon className="w-5 h-5 text-slate-600" />
        </button>
      </div>
    </div>
  )
}
