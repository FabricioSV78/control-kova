import { beforeEach, describe, expect, it } from 'vitest'
import { createDemoData } from '../services/demoData'
import { DemoKovaService } from '../services/demoService'
import { calculateMetrics, presetRange } from './analytics'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true })
})

describe('métricas financieras', () => {
  it('reproduce exactamente los totales requeridos del ejemplo', () => {
    const metrics = calculateMetrics(createDemoData(), presetRange('all'))
    expect(metrics.income).toBe(58)
    expect(metrics.expenses).toBe(126.5)
    expect(metrics.profit).toBe(-68.5)
    expect(metrics.fabricio).toBe(117)
    expect(metrics.daniela).toBe(9.5)
  })

  it('un gasto financiado no se duplica en egresos', () => {
    const data = createDemoData()
    const firstExpense = data.expenses[0]
    expect(firstExpense?.contributions.reduce((sum, item) => sum + item.amount, 0)).toBe(firstExpense?.total)
    expect(calculateMetrics(data, presetRange('all')).expenses).toBe(126.5)
  })
})

describe('operaciones demo', () => {
  it('registra la medida de muñeca sin alterar el catálogo', async () => {
    const service = new DemoKovaService()
    const before = await service.loadWorkspace()
    const product = before.products[0]
    expect(product).toBeDefined()
    await service.createSale({ soldAt: new Date().toISOString(), paymentMethod: 'Yape', items: [{ productId: product!.id, wristMeasurementCm: 17.5, quantity: 2, unitPrice: 29 }] })
    const after = await service.loadWorkspace()
    expect(after.products).toEqual(before.products)
    expect(after.sales).toHaveLength(before.sales.length + 1)
    expect(after.sales[0]?.items[0]?.wristMeasurementCm).toBe(17.5)
  })

  it('permite el mismo modelo con medidas distintas en un pedido', async () => {
    const service = new DemoKovaService()
    const before = await service.loadWorkspace()
    const product = before.products[0]
    expect(product).toBeDefined()
    await service.createSale({
      soldAt: new Date().toISOString(),
      paymentMethod: 'Yape',
      items: [
        { productId: product!.id, wristMeasurementCm: 16, quantity: 1, unitPrice: product!.salePrice },
        { productId: product!.id, wristMeasurementCm: 18.5, quantity: 1, unitPrice: product!.salePrice },
      ],
    })
    const after = await service.loadWorkspace()
    expect(after.sales[0]?.items.map((item) => item.wristMeasurementCm)).toEqual([16, 18.5])
  })

  it('rechaza pedidos sin una medida de muñeca válida', async () => {
    const service = new DemoKovaService()
    const product = (await service.loadWorkspace()).products[0]
    await expect(service.createSale({
      soldAt: new Date().toISOString(),
      paymentMethod: 'Yape',
      items: [{ productId: product!.id, wristMeasurementCm: null, quantity: 1, unitPrice: product!.salePrice }],
    })).rejects.toThrow('medida de muñeca válida')
  })

  it('rechaza un reparto compartido que no coincide con el total', async () => {
    const service = new DemoKovaService()
    await expect(service.createExpense({ spentAt: new Date().toISOString(), category: 'Otros', concept: 'Prueba', quantity: 1, unitPrice: 50, paidBy: 'Compartido', contributions: [{ partner: 'Fabricio', amount: 10 }, { partner: 'Daniela', amount: 20 }] })).rejects.toThrow('debe sumar')
  })
})
