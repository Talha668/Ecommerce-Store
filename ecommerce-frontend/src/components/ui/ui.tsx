/** Small shared UI primitives used across pages. */

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-500">
      <i className="fas fa-spinner fa-spin text-3xl text-blue-600"></i>
      {label && <p className="mt-3 text-sm">{label}</p>}
    </div>
  )
}

export function Alert({
  type,
  children,
  onClose,
}: {
  type: 'error' | 'success' | 'info'
  children: React.ReactNode
  onClose?: () => void
}) {
  const styles = {
    error: 'bg-red-50 border-red-200 text-red-700',
    success: 'bg-green-50 border-green-200 text-green-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
  }[type]
  const icon = { error: 'fa-circle-exclamation', success: 'fa-circle-check', info: 'fa-circle-info' }[type]

  return (
    <div className={`border rounded-lg px-4 py-3 mb-4 flex items-start justify-between ${styles}`}>
      <div className="flex items-start">
        <i className={`fas ${icon} mt-1 mr-2`}></i>
        <div className="text-sm">{children}</div>
      </div>
      {onClose && (
        <button onClick={onClose} aria-label="Dismiss" className="ml-4 opacity-60 hover:opacity-100">
          <i className="fas fa-times"></i>
        </button>
      )}
    </div>
  )
}

export function EmptyState({
  icon = 'fa-box-open',
  title,
  description,
  action,
}: {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="text-center py-12">
      <i className={`fas ${icon} text-gray-400 text-6xl mb-4`}></i>
      <h3 className="text-xl font-semibold text-gray-600 mb-2">{title}</h3>
      {description && <p className="text-gray-500 mb-6">{description}</p>}
      {action}
    </div>
  )
}

/** Reusable input field matching the old template styling. */
export function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

export const inputClass =
  'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500'
