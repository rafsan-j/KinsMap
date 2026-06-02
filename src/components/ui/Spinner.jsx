export default function Spinner({ className = '' }) {
  return (
    <div
      className={`h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600 ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}
