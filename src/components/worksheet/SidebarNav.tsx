import React from 'react'

interface SidebarNavProps {
  activePage: number
  hasAssignments: boolean
  hasTest: boolean
}

export default function SidebarNav({ activePage, hasAssignments, hasTest }: SidebarNavProps) {
  return (
    <nav className="hidden xl:flex flex-col gap-2 fixed left-8 top-32 w-40 text-sm print:hidden">
      {hasAssignments && (
        <a
          href="#page1"
          className={`px-3 py-2 rounded-md transition-colors ${activePage === 1 ? 'text-indigo-600 font-semibold bg-indigo-50' : 'text-gray-500 hover:text-indigo-500 hover:bg-gray-50'}`}
        >
          Задания
        </a>
      )}
      {hasTest && (
        <a
          href="#page2"
          className={`px-3 py-2 rounded-md transition-colors ${activePage === 2 ? 'text-indigo-600 font-semibold bg-indigo-50' : 'text-gray-500 hover:text-indigo-500 hover:bg-gray-50'}`}
        >
          Тест
        </a>
      )}
      <a
        href="#page3"
        className={`px-3 py-2 rounded-md transition-colors ${activePage === 3 ? 'text-indigo-600 font-semibold bg-indigo-50' : 'text-gray-500 hover:text-indigo-500 hover:bg-gray-50'}`}
      >
        Заметки
      </a>
      <a
        href="#page4"
        className={`px-3 py-2 rounded-md transition-colors ${activePage === 4 ? 'text-indigo-600 font-semibold bg-indigo-50' : 'text-gray-500 hover:text-indigo-500 hover:bg-gray-50'}`}
      >
        Ответы
      </a>
    </nav>
  )
}
