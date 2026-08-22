import Papa from 'papaparse'
import type { ExpenseInput, Product, SaleInput, WorkspaceData } from '../types/domain'
import { calculateMetrics, type DateRange } from '../utils/analytics'

type CsvValue = string | number | null
type CsvRow = Record<string, CsvValue>

export interface PreviewRow<T> {
  rowNumber: number
  raw: Record<string, string>
  value?: T
  errors: string[]
}

const normalizeHeader = (value: string) => value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
const get = (row: Record<string, string>, ...aliases: string[]) => aliases.map(normalizeHeader).map((alias) => row[alias]).find((value) => value !== undefined)?.trim() ?? ''

function parseNumber(value: string): number | null {
  const stripped = value.replace(/s\/?|pen/gi, '').replace(/\s/g, '')
  const normalized = stripped.includes(',') && stripped.includes('.') ? stripped.replace(/,/g, '') : stripped.replace(',', '.')
  const number = Number(normalized)
  return Number.isFinite(number) ? number : null
}

function parseDate(value: string): string | null {
  const parts = value.trim().split(/[/-]/)
  let normalized = value.trim()
  if (parts.length === 3 && parts[0]?.length !== 4) normalized = `${parts[2]}-${parts[1]?.padStart(2, '0')}-${parts[0]?.padStart(2, '0')}`
  const date = new Date(`${normalized.slice(0, 10)}T12:00:00-05:00`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function parseRows(text: string): Array<{ rowNumber: number; raw: Record<string, string> }> {
  const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: 'greedy', transformHeader: normalizeHeader })
  if (result.errors.some((error) => error.type === 'Delimiter' || error.type === 'Quotes')) throw new Error('El CSV tiene un formato inválido.')
  return result.data.map((raw, index) => ({ rowNumber: index + 2, raw }))
}

const normalized = (value: string) => value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const findProduct = (products: Product[], name: string) => products.find((product) => normalized(product.name) === normalized(name) || normalized(product.sku ?? '') === normalized(name))

export function previewSalesCsv(text: string, data: WorkspaceData): PreviewRow<SaleInput>[] {
  return parseRows(text).map(({ rowNumber, raw }) => {
    const errors: string[] = []
    const date = parseDate(get(raw, 'fecha', 'date'))
    const productName = get(raw, 'producto', 'product', 'nombre_producto')
    const product = findProduct(data.products, productName)
    const wristMeasurementCm = parseNumber(get(raw, 'medida_muneca_cm', 'medida_muneca', 'medida', 'wrist_measurement_cm'))
    const quantity = parseNumber(get(raw, 'cantidad', 'quantity'))
    const unitPrice = parseNumber(get(raw, 'precio_unitario', 'precio', 'unit_price'))
    if (!date) errors.push('Fecha inválida')
    if (!productName) errors.push('Producto vacío')
    else if (!product) errors.push(`Producto no encontrado: ${productName}`)
    if (wristMeasurementCm === null || wristMeasurementCm < 5 || wristMeasurementCm > 50) errors.push('Medida de muñeca inválida (5 a 50 cm)')
    if (quantity === null || quantity <= 0) errors.push('Cantidad inválida')
    if (unitPrice === null || unitPrice < 0) errors.push('Precio inválido')
    const value = date && product && wristMeasurementCm !== null && wristMeasurementCm >= 5 && wristMeasurementCm <= 50 && quantity !== null && quantity > 0 && unitPrice !== null && unitPrice >= 0 ? { soldAt: date, paymentMethod: get(raw, 'medio_de_pago', 'pago', 'payment_method') || data.paymentMethods[0]?.name || 'Efectivo', customerName: get(raw, 'cliente', 'customer') || undefined, notes: get(raw, 'notas', 'notes') || undefined, items: [{ productId: product.id, wristMeasurementCm, quantity, unitPrice }] } : undefined
    return { rowNumber, raw, value, errors }
  })
}

export function previewExpensesCsv(text: string, data: WorkspaceData): PreviewRow<ExpenseInput>[] {
  const payers = ['Fabricio', 'Daniela', 'Negocio', 'Compartido'] as const
  return parseRows(text).map(({ rowNumber, raw }) => {
    const errors: string[] = []
    const date = parseDate(get(raw, 'fecha', 'date'))
    const category = get(raw, 'categoria', 'category') || 'Otros'
    const concept = get(raw, 'concepto', 'producto', 'concept')
    const quantity = parseNumber(get(raw, 'cantidad', 'quantity'))
    const unitPrice = parseNumber(get(raw, 'precio_unitario', 'precio', 'unit_price'))
    const payerRaw = get(raw, 'quien_pago', 'pagado_por', 'responsable', 'paid_by')
    const paidBy = payers.find((payer) => normalized(payer) === normalized(payerRaw))
    if (!date) errors.push('Fecha inválida')
    if (!concept) errors.push('Concepto vacío')
    if (!data.categories.some((item) => normalized(item.name) === normalized(category))) errors.push(`Categoría no encontrada: ${category}`)
    if (quantity === null || quantity <= 0) errors.push('Cantidad inválida')
    if (unitPrice === null || unitPrice < 0) errors.push('Precio inválido')
    if (!paidBy) errors.push('Responsable inválido')
    const total = (quantity ?? 0) * (unitPrice ?? 0)
    const fabricio = parseNumber(get(raw, 'aporte_fabricio', 'fabricio')) ?? 0
    const daniela = parseNumber(get(raw, 'aporte_daniela', 'daniela')) ?? 0
    if (paidBy === 'Compartido' && Math.round((fabricio + daniela) * 100) !== Math.round(total * 100)) errors.push('Los aportes no suman el total')
    const contributions = paidBy === 'Compartido' ? [{ partner: 'Fabricio' as const, amount: fabricio }, { partner: 'Daniela' as const, amount: daniela }] : []
    const value = date && concept && quantity !== null && quantity > 0 && unitPrice !== null && unitPrice >= 0 && paidBy && !errors.length ? { spentAt: date, category, concept, quantity, unitPrice, paidBy, notes: get(raw, 'notas', 'notes') || undefined, contributions } : undefined
    return { rowNumber, raw, value, errors }
  })
}

export async function fileHash(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function downloadCsv(filename: string, rows: CsvRow[]): void {
  const csv = Papa.unparse(rows, { quotes: true })
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = filename; anchor.click()
  URL.revokeObjectURL(url)
}

const dateOnly = (value: string) => value.slice(0, 10)
export function exportSales(data: WorkspaceData): void {
  downloadCsv('kova-ventas.csv', data.sales.flatMap((sale) => sale.items.map<CsvRow>((item) => ({ venta: sale.saleNumber, fecha: dateOnly(sale.soldAt), producto: item.productName, medida_muneca_cm: item.wristMeasurementCm, cantidad: item.quantity, precio_unitario: item.unitPrice, subtotal: item.lineTotal, total_venta: sale.total, medio_de_pago: sale.paymentMethod, cliente: sale.customerName, notas: sale.notes }))))
}
export function exportExpenses(data: WorkspaceData): void {
  downloadCsv('kova-gastos.csv', data.expenses.map((expense) => ({ fecha: dateOnly(expense.spentAt), categoria: expense.category, concepto: expense.concept, cantidad: expense.quantity, precio_unitario: expense.unitPrice, total: expense.total, pagado_por: expense.paidBy, aporte_fabricio: expense.contributions.find((item) => item.partner === 'Fabricio')?.amount ?? 0, aporte_daniela: expense.contributions.find((item) => item.partner === 'Daniela')?.amount ?? 0, notas: expense.notes })))
}
export function exportHistory(data: WorkspaceData): void {
  downloadCsv('kova-historial.csv', data.activities.map((activity) => ({ fecha: activity.occurredAt, tipo: activity.type, accion: activity.action, titulo: activity.title, detalle: activity.description, importe: activity.amount, usuario: activity.actorName })))
}
export function exportReport(data: WorkspaceData, range: DateRange, label = 'periodo'): void {
  const metrics = calculateMetrics(data, range)
  downloadCsv(`kova-reporte-${label}.csv`, [
    { indicador: 'Ingresos', valor: metrics.income }, { indicador: 'Egresos', valor: metrics.expenses }, { indicador: 'Ganancia neta', valor: metrics.profit },
    { indicador: 'Ventas', valor: metrics.salesCount }, { indicador: 'Ticket promedio', valor: metrics.averageTicket }, { indicador: 'Unidades vendidas', valor: metrics.units },
    { indicador: 'Producto más vendido', valor: metrics.topProduct }, { indicador: 'Aporte Fabricio', valor: metrics.fabricio }, { indicador: 'Aporte Daniela', valor: metrics.daniela },
  ])
}

export function downloadSalesTemplate(): void {
  downloadCsv('plantilla-ventas-kova.csv', [{ fecha: '2026-08-21', producto: 'KOVA Urban Black', medida_muneca_cm: 17, cantidad: 1, precio_unitario: 29, medio_de_pago: 'Yape', cliente: '', notas: '' }])
}
export function downloadExpensesTemplate(): void {
  downloadCsv('plantilla-gastos-kova.csv', [{ fecha: '2026-08-21', categoria: 'Materiales', concepto: 'Nylon', cantidad: 1, precio_unitario: 2, pagado_por: 'Fabricio', aporte_fabricio: '', aporte_daniela: '', notas: '' }])
}
