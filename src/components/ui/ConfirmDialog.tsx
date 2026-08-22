import { Button } from './Button'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description: string
  loading?: boolean
  confirmLabel?: string
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, loading, confirmLabel = 'Eliminar' }: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button variant="danger" loading={loading} onClick={() => void onConfirm()}>{confirmLabel}</Button>
      </div>
    </Modal>
  )
}
