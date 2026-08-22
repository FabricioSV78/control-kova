type ErrorLike = { message?: string; code?: string }

const friendlyMessages: Record<string, string> = {
  '23505': 'Ya existe un registro con esos datos.',
  '23503': 'Este registro está siendo utilizado y no puede eliminarse.',
  '42501': 'No tienes permiso para realizar esta acción.',
  PGRST116: 'No se encontró el registro solicitado.',
}

export function toFriendlyError(error: unknown, fallback = 'No pudimos completar la acción. Inténtalo nuevamente.'): Error {
  if (error instanceof Error && !('code' in error)) return error
  const candidate = error as ErrorLike
  const databaseMessage = candidate.message?.trim()
  const safeDatabaseMessage = databaseMessage && !/postgres|relation|column|syntax|sqlstate/i.test(databaseMessage)
    ? databaseMessage
    : null
  return new Error((candidate.code && friendlyMessages[candidate.code]) || safeDatabaseMessage || fallback)
}
