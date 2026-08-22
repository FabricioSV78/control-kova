const currencyFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const dateFormatter = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'America/Lima',
})

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount).replace('PEN', 'S/')
}

export function formatDate(value: string | Date): string {
  return dateFormatter.format(typeof value === 'string' ? new Date(value) : value).replace('.', '')
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
