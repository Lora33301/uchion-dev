import { ChevronLeftIcon } from '../ui/Icons'

interface ListPagePaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function ListPagePagination({
  currentPage,
  totalPages,
  onPageChange,
}: ListPagePaginationProps) {
  if (totalPages <= 1) return null

  const pages = []
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i)
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeftIcon />
      </button>

      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`w-10 h-10 rounded-lg font-medium transition-colors ${
            page === currentPage
              ? 'bg-[#8C52FF] text-white'
              : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          {page}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rotate-180"
      >
        <ChevronLeftIcon />
      </button>
    </div>
  )
}
