import { useCallback, useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'

export default function PhotoUpload({ previewUrl, onFileChange, existingUrl }) {
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  const displayUrl = previewUrl || existingUrl

  const handleFile = useCallback(
    (file) => {
      if (!file?.type.startsWith('image/')) return
      const url = URL.createObjectURL(file)
      onFileChange?.(file, url)
    },
    [onFileChange],
  )

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault()
      setIsDragging(false)
      const file = event.dataTransfer.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleClear = () => {
    onFileChange?.(null, null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex flex-col gap-3">
      {displayUrl ? (
        <div className="relative mx-auto w-full max-w-xs">
          <img
            src={displayUrl}
            alt="Profile preview"
            className="aspect-square w-full rounded-xl border border-gray-200 object-cover"
          />
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
            aria-label="Remove photo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => event.key === 'Enter' && inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50/50'
          }`}
        >
          <Upload className="h-8 w-8 text-gray-400" />
          <p className="text-center text-sm font-medium text-gray-700">
            Drag and drop a photo here
          </p>
          <p className="text-center text-xs text-gray-500">or click to browse</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) handleFile(file)
        }}
      />

      {displayUrl && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          Choose a different photo
        </button>
      )}
    </div>
  )
}
