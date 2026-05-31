import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

export default function Modal({ open = true, onClose, title, children, className = '' }) {
  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose?.()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content
          className={`fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-white shadow-xl sm:max-w-2xl ${className}`}
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6">
            <Dialog.Title className="text-lg font-semibold text-gray-900">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
