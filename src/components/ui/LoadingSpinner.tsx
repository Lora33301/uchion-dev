// Shared loading spinner components.

/** Spinning circle — use inline within content */
export function Spinner({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <div className="relative" style={{ width: 'fit-content' }}>
      <div className={`animate-spin rounded-full border-2 border-purple-200 ${className}`}></div>
      <div className={`absolute inset-0 animate-spin rounded-full border-t-2 border-[#8C52FF] ${className}`}></div>
    </div>
  )
}

/** Full-page loading spinner with gradient background */
export function PageSpinner() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-purple-50/50 to-white flex items-center justify-center">
      <Spinner />
    </div>
  )
}
