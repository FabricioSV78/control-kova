import { createDemoData, DEMO_USER_ID } from './demoData'
import { attachLocalProductImages, loadProductImageManifest } from './productImages'
import { roundMoney } from '../utils/format'
import { fileToDataUrl, optimizeDeliveryImage } from '../utils/imageUpload'
import type { KovaService } from './contracts'
import type {
  ActivityEntry,
  DeliveryShowcaseInput,
  ExpenseContribution,
  ExpenseInput,
  ProductInput,
  SaleInput,
  UUID,
  WorkspaceData,
} from '../types/domain'

const STORAGE_KEY = 'kova-control-demo-v2'
const IMPORTS_KEY = 'kova-control-demo-imports-v2'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const newId = () => crypto.randomUUID()
function readData(): WorkspaceData {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    const initial = createDemoData()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
    return initial
  }
  try {
    return JSON.parse(stored) as WorkspaceData
  } catch {
    const initial = createDemoData()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
    return initial
  }
}

function writeData(data: WorkspaceData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function addActivity(data: WorkspaceData, entry: Omit<ActivityEntry, 'id' | 'businessId' | 'actorName' | 'occurredAt'> & { occurredAt?: string }): void {
  data.activities.unshift({
    ...entry,
    id: newId(),
    businessId: data.business.id,
    actorName: 'Fabricio',
    occurredAt: entry.occurredAt ?? new Date().toISOString(),
  })
}

function buildContributions(expenseId: UUID, input: ExpenseInput, total: number): ExpenseContribution[] {
  if (input.paidBy === 'Negocio') return []
  if (input.paidBy === 'Fabricio' || input.paidBy === 'Daniela') {
    return [{ id: newId(), expenseId, partner: input.paidBy, amount: total }]
  }
  const contributionTotal = roundMoney(input.contributions.reduce((sum, item) => sum + item.amount, 0))
  if (contributionTotal !== total) {
    throw new Error(`El aporte de Fabricio y Daniela debe sumar S/ ${total.toFixed(2)}.`)
  }
  return input.contributions.map((item) => ({ id: newId(), expenseId, ...item }))
}

function validateSaleItems(data: WorkspaceData, input: SaleInput): void {
  if (input.items.length === 0) throw new Error('La venta debe incluir al menos un producto.')
  for (const item of input.items) {
    const product = data.products.find((candidate) => candidate.id === item.productId)
    if (!product || product.status !== 'active') throw new Error('Uno de los productos no está disponible.')
    if (item.wristMeasurementCm === null || item.wristMeasurementCm < 5 || item.wristMeasurementCm > 50) {
      throw new Error(`Ingresa una medida de muñeca válida para ${product.name}.`)
    }
  }
}

export class DemoKovaService implements KovaService {
  async loadWorkspace(): Promise<WorkspaceData> {
    const data = clone(readData())
    data.deliveries ??= []
    data.products = data.products.map((product, index) => ({ ...product, sortOrder: product.sortOrder ?? index })).sort((a, b) => a.sortOrder - b.sortOrder)
    data.products = attachLocalProductImages(data.products, await loadProductImageManifest())
    return data
  }

  async createWorkspace(): Promise<void> {
    writeData(createDemoData())
  }

  async createSale(input: SaleInput): Promise<void> {
    const data = readData()
    validateSaleItems(data, input)
    const now = new Date().toISOString()
    const saleId = newId()
    const saleNumber = Math.max(0, ...data.sales.map((sale) => sale.saleNumber)) + 1
    const items = input.items.map((item) => {
      const product = data.products.find((candidate) => candidate.id === item.productId)
      if (!product) throw new Error('Producto no encontrado.')
      return { id: newId(), saleId, productId: product.id, productName: product.name, wristMeasurementCm: item.wristMeasurementCm, quantity: item.quantity, unitPrice: item.unitPrice, lineTotal: roundMoney(item.quantity * item.unitPrice) }
    })
    const total = roundMoney(items.reduce((sum, item) => sum + item.lineTotal, 0))
    data.sales.unshift({
      id: saleId, businessId: data.business.id, saleNumber, soldAt: input.soldAt,
      paymentMethod: input.paymentMethod, customerName: input.customerName?.trim() || null,
      notes: input.notes?.trim() || null, total, items, createdBy: DEMO_USER_ID,
      createdByName: 'Fabricio', createdAt: now, updatedAt: now,
    })
    addActivity(data, { type: 'sale', action: 'created', entityId: saleId, title: `Venta #${String(saleNumber).padStart(4, '0')} registrada`, description: items.map((item) => `${item.productName} × ${item.quantity}`).join(', '), amount: total, occurredAt: input.soldAt })
    writeData(data)
  }

  async updateSale(id: UUID, input: SaleInput): Promise<void> {
    const data = readData()
    const sale = data.sales.find((candidate) => candidate.id === id)
    if (!sale) throw new Error('Venta no encontrada.')
    validateSaleItems(data, input)
    sale.items = input.items.map((item) => {
      const product = data.products.find((candidate) => candidate.id === item.productId)
      if (!product) throw new Error('Producto no encontrado.')
      return { id: newId(), saleId: id, productId: product.id, productName: product.name, wristMeasurementCm: item.wristMeasurementCm, quantity: item.quantity, unitPrice: item.unitPrice, lineTotal: roundMoney(item.quantity * item.unitPrice) }
    })
    sale.soldAt = input.soldAt
    sale.paymentMethod = input.paymentMethod
    sale.customerName = input.customerName?.trim() || null
    sale.notes = input.notes?.trim() || null
    sale.total = roundMoney(sale.items.reduce((sum, item) => sum + item.lineTotal, 0))
    sale.updatedAt = new Date().toISOString()
    addActivity(data, { type: 'sale', action: 'updated', entityId: sale.id, title: `Venta #${String(sale.saleNumber).padStart(4, '0')} actualizada`, description: 'Productos y datos de la venta actualizados.', amount: sale.total })
    writeData(data)
  }

  async voidSale(id: UUID): Promise<void> {
    const data = readData()
    const index = data.sales.findIndex((sale) => sale.id === id)
    if (index < 0) throw new Error('Venta no encontrada.')
    const sale = data.sales[index]
    if (!sale) return
    data.sales.splice(index, 1)
    addActivity(data, { type: 'sale', action: 'deleted', entityId: sale.id, title: `Venta #${String(sale.saleNumber).padStart(4, '0')} anulada`, description: 'La venta fue anulada.', amount: sale.total })
    writeData(data)
  }

  async createExpense(input: ExpenseInput): Promise<void> {
    const data = readData()
    const id = newId()
    const now = new Date().toISOString()
    const total = roundMoney(input.quantity * input.unitPrice)
    const contributions = buildContributions(id, input, total)
    data.expenses.unshift({
      id, businessId: data.business.id, spentAt: input.spentAt, category: input.category,
      concept: input.concept.trim(), quantity: input.quantity, unitPrice: input.unitPrice, total,
      paidBy: input.paidBy, notes: input.notes?.trim() || null, contributions,
      createdBy: DEMO_USER_ID, createdByName: 'Fabricio', createdAt: now, updatedAt: now,
    })
    addActivity(data, { type: 'expense', action: 'created', entityId: id, title: 'Gasto registrado', description: `${input.concept} · Pagado por ${input.paidBy}`, amount: total, occurredAt: input.spentAt })
    writeData(data)
  }

  async updateExpense(id: UUID, input: ExpenseInput): Promise<void> {
    const data = readData()
    const expense = data.expenses.find((candidate) => candidate.id === id)
    if (!expense) throw new Error('Gasto no encontrado.')
    const total = roundMoney(input.quantity * input.unitPrice)
    Object.assign(expense, {
      spentAt: input.spentAt, category: input.category, concept: input.concept.trim(),
      quantity: input.quantity, unitPrice: input.unitPrice, total, paidBy: input.paidBy,
      notes: input.notes?.trim() || null, contributions: buildContributions(id, input, total),
      updatedAt: new Date().toISOString(),
    })
    addActivity(data, { type: 'expense', action: 'updated', entityId: id, title: 'Gasto actualizado', description: input.concept, amount: total })
    writeData(data)
  }

  async voidExpense(id: UUID): Promise<void> {
    const data = readData()
    const index = data.expenses.findIndex((expense) => expense.id === id)
    if (index < 0) throw new Error('Gasto no encontrado.')
    const expense = data.expenses[index]
    if (!expense) return
    data.expenses.splice(index, 1)
    addActivity(data, { type: 'expense', action: 'deleted', entityId: expense.id, title: 'Gasto anulado', description: expense.concept, amount: expense.total })
    writeData(data)
  }

  async createProduct(input: ProductInput): Promise<void> {
    const data = readData()
    const now = new Date().toISOString()
    const id = newId()
    const firstOrder = Math.min(0, ...data.products.map((product) => product.sortOrder ?? 0))
    data.products.unshift({ id, businessId: data.business.id, name: input.name.trim(), description: input.description?.trim() || null, sku: input.sku?.trim() || null, category: input.category, salePrice: input.salePrice, estimatedCost: input.estimatedCost, status: 'active', sortOrder: firstOrder - 1, images: [], outfitImages: [], createdAt: now, updatedAt: now })
    addActivity(data, { type: 'product', action: 'created', entityId: id, title: 'Producto creado', description: input.name, amount: null })
    writeData(data)
  }

  async updateProduct(id: UUID, input: ProductInput): Promise<void> {
    const data = readData()
    const product = data.products.find((candidate) => candidate.id === id)
    if (!product) throw new Error('Producto no encontrado.')
    Object.assign(product, { name: input.name.trim(), description: input.description?.trim() || null, sku: input.sku?.trim() || null, category: input.category, salePrice: input.salePrice, estimatedCost: input.estimatedCost, images: [], outfitImages: [], updatedAt: new Date().toISOString() })
    addActivity(data, { type: 'product', action: 'updated', entityId: id, title: 'Producto actualizado', description: product.name, amount: null })
    writeData(data)
  }

  async deactivateProduct(id: UUID): Promise<void> {
    const data = readData()
    const product = data.products.find((candidate) => candidate.id === id)
    if (!product) throw new Error('Producto no encontrado.')
    product.status = 'inactive'
    addActivity(data, { type: 'product', action: 'deactivated', entityId: id, title: 'Producto desactivado', description: product.name, amount: null })
    writeData(data)
  }

  async activateProduct(id: UUID): Promise<void> {
    const data = readData()
    const product = data.products.find((candidate) => candidate.id === id)
    if (!product) throw new Error('Producto no encontrado.')
    product.status = 'active'
    addActivity(data, { type: 'product', action: 'updated', entityId: id, title: 'Producto activado', description: product.name, amount: null })
    writeData(data)
  }

  async reorderProducts(ids: UUID[]): Promise<void> {
    const data = readData()
    const orderById = new Map(ids.map((id, index) => [id, index]))
    data.products.forEach((product) => {
      const nextOrder = orderById.get(product.id)
      if (nextOrder !== undefined) product.sortOrder = nextOrder
    })
    writeData(data)
  }

  async createDeliveryShowcase(input: DeliveryShowcaseInput): Promise<void> {
    const data = readData()
    const image = await optimizeDeliveryImage(input.image)
    data.deliveries ??= []
    data.deliveries.unshift({ id: newId(), businessId: data.business.id, title: input.title.trim(), imageUrl: await fileToDataUrl(image), storagePath: null, createdAt: new Date().toISOString() })
    writeData(data)
  }

  async deleteDeliveryShowcase(id: UUID): Promise<void> {
    const data = readData()
    data.deliveries = (data.deliveries ?? []).filter((delivery) => delivery.id !== id)
    writeData(data)
  }

  async updateBusinessContact(whatsappNumber: string): Promise<void> {
    const data = readData()
    data.business.whatsappNumber = whatsappNumber
    writeData(data)
  }

  async hasImportBatch(type: 'sales' | 'expenses', hash: string): Promise<boolean> {
    const imports = JSON.parse(localStorage.getItem(IMPORTS_KEY) ?? '[]') as Array<{ type: string; hash: string }>
    return imports.some((item) => item.type === type && item.hash === hash)
  }

  async saveImportBatch(type: 'sales' | 'expenses', fileName: string, hash: string, rowCount: number): Promise<void> {
    const imports = JSON.parse(localStorage.getItem(IMPORTS_KEY) ?? '[]') as Array<{ type: string; hash: string; fileName: string; rowCount: number }>
    imports.push({ type, hash, fileName, rowCount })
    localStorage.setItem(IMPORTS_KEY, JSON.stringify(imports))
  }

  async resetDemo(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(IMPORTS_KEY)
  }
}
