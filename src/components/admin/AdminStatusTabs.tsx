export interface StatusTab<T extends string = string> {
  value: T
  label: string
  color: string
}

interface AdminStatusTabsProps<T extends string> {
  tabs: StatusTab<T>[]
  value: T
  onChange: (value: T) => void
}

export function AdminStatusTabs<T extends string>({
  tabs,
  value,
  onChange,
}: AdminStatusTabsProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${
            value === tab.value
              ? `${tab.color} text-white`
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
