import type {
  ActivityEntry,
  Expense,
  Product,
  Sale,
  WorkspaceData,
} from '../types/domain'

export const DEMO_BUSINESS_ID = '10000000-0000-4000-8000-000000000001'
export const DEMO_USER_ID = '20000000-0000-4000-8000-000000000001'

const productIds = {
  urban: '30000000-0000-4000-8000-000000000001',
  alba: '30000000-0000-4000-8000-000000000002',
  eclipse: '30000000-0000-4000-8000-000000000003',
  polar: '30000000-0000-4000-8000-000000000004',
  void: '30000000-0000-4000-8000-000000000005',
  noctis: '30000000-0000-4000-8000-000000000006',
}

function atDayOffset(days: number, hour: number): string {
  const date = new Date()
  date.setHours(hour, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

function buildProducts(now: string): Product[] {
  const base = {
    businessId: DEMO_BUSINESS_ID,
    category: 'Pulseras',
    estimatedCost: 11,
    status: 'active' as const,
    imageUrl: null,
    createdAt: now,
    updatedAt: now,
  }
  return [
    { ...base, id: productIds.urban, name: 'KOVA Urban Black', sku: 'KOV-URB-01', salePrice: 29 },
    { ...base, id: productIds.alba, name: 'KOVA Alba', sku: 'KOV-ALB-01', salePrice: 29 },
    { ...base, id: productIds.eclipse, name: 'KOVA Eclipse', sku: 'KOV-ECL-01', salePrice: 31 },
    { ...base, id: productIds.polar, name: 'KOVA Polar Core', sku: 'KOV-POL-01', salePrice: 31 },
    { ...base, id: productIds.void, name: 'KOVA Void Line', sku: 'KOV-VOI-01', salePrice: 33 },
    { ...base, id: productIds.noctis, name: 'KOVA Noctis 45', sku: 'KOV-NOC-45', salePrice: 33 },
  ]
}

function buildSales(now: string): Sale[] {
  return [
    {
      id: '40000000-0000-4000-8000-000000000001', businessId: DEMO_BUSINESS_ID, saleNumber: 1,
      soldAt: atDayOffset(-2, 15), paymentMethod: 'Yape', customerName: 'María', notes: null, total: 29,
      items: [{ id: '41000000-0000-4000-8000-000000000001', saleId: '40000000-0000-4000-8000-000000000001', productId: productIds.urban, productName: 'KOVA Urban Black', wristMeasurementCm: 17, quantity: 1, unitPrice: 29, lineTotal: 29 }],
      createdBy: DEMO_USER_ID, createdByName: 'Fabricio', createdAt: now, updatedAt: now,
    },
    {
      id: '40000000-0000-4000-8000-000000000002', businessId: DEMO_BUSINESS_ID, saleNumber: 2,
      soldAt: atDayOffset(-1, 18), paymentMethod: 'Plin', customerName: null, notes: null, total: 29,
      items: [{ id: '41000000-0000-4000-8000-000000000002', saleId: '40000000-0000-4000-8000-000000000002', productId: productIds.alba, productName: 'KOVA Alba', wristMeasurementCm: 16.5, quantity: 1, unitPrice: 29, lineTotal: 29 }],
      createdBy: DEMO_USER_ID, createdByName: 'Fabricio', createdAt: now, updatedAt: now,
    },
  ]
}

function buildExpenses(now: string): Expense[] {
  const rows: Array<[string, number, number, 'Fabricio' | 'Daniela', string, number]> = [
    ['Nylon', 1, 2, 'Fabricio', 'Materiales', 8],
    ['Hematita', 3, 3, 'Fabricio', 'Materiales', 7],
    ['Broches', 2, 1, 'Fabricio', 'Materiales', 7],
    ['Impresión agradecimiento', 1, 4, 'Daniela', 'Impresión', 6],
    ['Papel sticker', 1, 2.5, 'Daniela', 'Materiales', 6],
    ['Papel coreano', 1, 1.5, 'Daniela', 'Packaging', 5],
    ['Papel crepé', 1, 1.5, 'Daniela', 'Packaging', 5],
    ['Publicidad Facebook', 1, 39, 'Fabricio', 'Publicidad', 4],
    ['Stickers pedidos', 1, 55, 'Fabricio', 'Packaging', 3],
    ['Publicidad TikTok', 1, 10, 'Fabricio', 'Publicidad', 2],
  ]
  return rows.map(([concept, quantity, unitPrice, partner, category, days], index) => {
    const id = `50000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`
    const total = quantity * unitPrice
    return {
      id, businessId: DEMO_BUSINESS_ID, spentAt: atDayOffset(-days, 11), category, concept,
      quantity, unitPrice, total, paidBy: partner, notes: null,
      contributions: [{ id: `51000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, expenseId: id, partner, amount: total }],
      createdBy: DEMO_USER_ID, createdByName: index > 2 && index < 7 ? 'Daniela' : 'Fabricio', createdAt: now, updatedAt: now,
    }
  })
}

function buildActivities(sales: Sale[], expenses: Expense[]): ActivityEntry[] {
  const saleActivities = sales.map<ActivityEntry>((sale) => ({
    id: crypto.randomUUID(), businessId: DEMO_BUSINESS_ID, type: 'sale', action: 'created',
    title: `Venta #${String(sale.saleNumber).padStart(4, '0')} registrada`,
    description: sale.items.map((item) => `${item.productName} × ${item.quantity}`).join(', '),
    amount: sale.total, entityId: sale.id, actorName: sale.createdByName, occurredAt: sale.soldAt,
  }))
  const expenseActivities = expenses.map<ActivityEntry>((expense) => ({
    id: crypto.randomUUID(), businessId: DEMO_BUSINESS_ID, type: 'expense', action: 'created',
    title: 'Gasto registrado', description: `${expense.concept} · Pagado por ${expense.paidBy}`,
    amount: expense.total, entityId: expense.id, actorName: expense.createdByName, occurredAt: expense.spentAt,
  }))
  return [...saleActivities, ...expenseActivities].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
}

export function createDemoData(): WorkspaceData {
  const now = new Date().toISOString()
  const products = buildProducts(now)
  const sales = buildSales(now)
  const expenses = buildExpenses(now)
  return {
    business: { id: DEMO_BUSINESS_ID, name: 'KOVA', slug: 'kova' },
    members: [
      { profileId: DEMO_USER_ID, displayName: 'Fabricio', role: 'owner' },
      { profileId: '20000000-0000-4000-8000-000000000002', displayName: 'Daniela', role: 'admin' },
    ],
    categories: ['Materiales', 'Packaging', 'Publicidad', 'Envíos', 'Herramientas', 'Impresión', 'Otros'].map((name, index) => ({
      id: `60000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      businessId: DEMO_BUSINESS_ID, name, color: ['#292524', '#57534e', '#dc2626', '#2563eb', '#7c3aed', '#ca8a04', '#737373'][index] ?? '#737373', isActive: true,
    })),
    paymentMethods: ['Yape', 'Plin', 'Efectivo', 'Transferencia', 'Tarjeta'].map((name, index) => ({
      id: `70000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      businessId: DEMO_BUSINESS_ID, name, isActive: true,
    })),
    products, sales, expenses,
    activities: buildActivities(sales, expenses),
  }
}
