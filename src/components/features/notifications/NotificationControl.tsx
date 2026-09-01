import { Bell, BellOff, BellRing } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  requestKovaNotificationPermission,
  showKovaTestNotification,
  supportsKovaNotifications,
  TEST_NOTIFICATION_INTERVAL_MS,
} from '../../../services/notifications'
import { Button } from '../../ui/Button'

const enabledKey = 'kova:test-notifications-enabled'
const nextNotificationKey = 'kova:test-notification-next-at'

type PermissionState = NotificationPermission | 'unsupported'

function currentPermission(): PermissionState {
  return supportsKovaNotifications() ? Notification.permission : 'unsupported'
}

function initiallyEnabled() {
  return currentPermission() === 'granted' && localStorage.getItem(enabledKey) === 'true'
}

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const remainingSeconds = (seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remainingSeconds}`
}

export function NotificationControl() {
  const [permission, setPermission] = useState<PermissionState>(currentPermission)
  const [enabled, setEnabled] = useState(initiallyEnabled)
  const [busy, setBusy] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState(TEST_NOTIFICATION_INTERVAL_MS / 1000)

  useEffect(() => {
    if (!enabled || permission !== 'granted') return undefined

    let nextAt = Number(localStorage.getItem(nextNotificationKey))
    if (!Number.isFinite(nextAt) || nextAt <= Date.now()) {
      nextAt = Date.now() + TEST_NOTIFICATION_INTERVAL_MS
      localStorage.setItem(nextNotificationKey, String(nextAt))
    }

    const tick = () => {
      const remaining = nextAt - Date.now()
      if (remaining > 0) {
        setSecondsRemaining(Math.ceil(remaining / 1000))
        return
      }

      nextAt = Date.now() + TEST_NOTIFICATION_INTERVAL_MS
      localStorage.setItem(nextNotificationKey, String(nextAt))
      setSecondsRemaining(TEST_NOTIFICATION_INTERVAL_MS / 1000)
      void showKovaTestNotification().catch((reason: unknown) => {
        toast.error(reason instanceof Error ? reason.message : 'No se pudo mostrar la notificación.')
      })
    }

    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [enabled, permission])

  const activate = async () => {
    setBusy(true)
    try {
      const result = await requestKovaNotificationPermission()
      setPermission(result)
      if (result === 'unsupported') {
        toast.error('Este navegador no admite notificaciones web.')
        return
      }
      if (result !== 'granted') {
        toast.error('Debes permitir las notificaciones desde la configuración del navegador.')
        return
      }

      await showKovaTestNotification()
      const nextAt = Date.now() + TEST_NOTIFICATION_INTERVAL_MS
      localStorage.setItem(enabledKey, 'true')
      localStorage.setItem(nextNotificationKey, String(nextAt))
      setSecondsRemaining(TEST_NOTIFICATION_INTERVAL_MS / 1000)
      setEnabled(true)
      toast.success('Notificaciones activadas. La siguiente prueba llegará en 2 minutos.')
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'No se pudieron activar las notificaciones.')
    } finally {
      setBusy(false)
    }
  }

  const deactivate = () => {
    localStorage.removeItem(enabledKey)
    localStorage.removeItem(nextNotificationKey)
    setEnabled(false)
    toast.success('Notificaciones de prueba desactivadas.')
  }

  const isBlocked = permission === 'denied'
  const isUnsupported = permission === 'unsupported'

  return (
    <div className="flex w-full flex-col items-stretch gap-1.5 sm:w-auto sm:items-end">
      <Button
        type="button"
        variant={enabled ? 'secondary' : 'primary'}
        loading={busy}
        disabled={isBlocked || isUnsupported}
        onClick={enabled ? deactivate : () => void activate()}
        className="w-full sm:w-auto"
      >
        {enabled ? <BellRing className="size-4 text-emerald-600" /> : isBlocked ? <BellOff className="size-4" /> : <Bell className="size-4" />}
        {enabled ? 'Desactivar notificaciones' : isBlocked ? 'Notificaciones bloqueadas' : isUnsupported ? 'Notificaciones no disponibles' : 'Activar notificaciones'}
      </Button>
      <p className="px-1 text-[11px] font-medium text-stone-400" aria-live="polite">
        {enabled
          ? `Próxima prueba en ${formatCountdown(secondsRemaining)}`
          : isBlocked
            ? 'Habilítalas desde los ajustes del navegador.'
            : 'Modo de prueba · cada 2 minutos con la app abierta'}
      </p>
    </div>
  )
}
