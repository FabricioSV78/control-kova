import { useEffect, type PropsWithChildren } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button } from './Button'

interface ModalProps extends PropsWithChildren {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  size?: 'md' | 'lg' | 'xl'
}

const widths = { md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

export function Modal({ open, onClose, title, description, size = 'md', children }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose, open])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`max-h-[94vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${widths[size]}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-stone-100 bg-white/95 px-5 py-5 backdrop-blur sm:px-6">
          <div>
            <h2 id="modal-title" className="font-display text-xl font-bold tracking-tight text-stone-950">{title}</h2>
            {description && <p className="mt-1 text-sm text-stone-500">{description}</p>}
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar"><X className="size-5" /></Button>
        </header>
        <div className="p-5 sm:p-6">{children}</div>
      </section>
    </div>,
    document.body,
  )
}
