import { eachDayOfInterval, endOfDay, endOfMonth, endOfWeek, endOfYear, format, parseISO, startOfDay, startOfMonth, startOfWeek, startOfYear, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Expense, Sale, WorkspaceData } from '../types/domain'
import { roundMoney } from './format'

export type PeriodPreset = 'today' | 'week' | 'month' | 'previous-month' | 'year' | 'all' | 'custom'
export interface DateRange { from: Date | null; to: Date | null }

export function presetRange(preset: PeriodPreset, now = new Date()): DateRange {
  switch (preset) {
    case 'today': return { from: startOfDay(now), to: endOfDay(now) }
    case 'week': return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) }
    case 'month': return { from: startOfMonth(now), to: endOfMonth(now) }
    case 'previous-month': {
      const previous = subMonths(now, 1)
      return { from: startOfMonth(previous), to: endOfMonth(previous) }
    }
    case 'year': return { from: startOfYear(now), to: endOfYear(now) }
    case 'all': return { from: null, to: null }
    case 'custom': return { from: startOfMonth(now), to: endOfMonth(now) }
  }
}

export function isWithinRange(dateValue: string, range: DateRange): boolean {
  const time = parseISO(dateValue).getTime()
  return (!range.from || time >= range.from.getTime()) && (!range.to || time <= range.to.getTime())
}

export function filterFinance(data: WorkspaceData, range: DateRange): { sales: Sale[]; expenses: Expense[] } {
  return {
    sales: data.sales.filter((sale) => isWithinRange(sale.soldAt, range)),
    expenses: data.expenses.filter((expense) => isWithinRange(expense.spentAt, range)),
  }
}

export function calculateMetrics(data: WorkspaceData, range: DateRange) {
  const { sales, expenses } = filterFinance(data, range)
  const income = roundMoney(sales.reduce((sum, sale) => sum + sale.total, 0))
  const expensesTotal = roundMoney(expenses.reduce((sum, expense) => sum + expense.total, 0))
  const contributions = expenses.flatMap((expense) => expense.contributions)
  const fabricio = roundMoney(contributions.filter((item) => item.partner === 'Fabricio').reduce((sum, item) => sum + item.amount, 0))
  const daniela = roundMoney(contributions.filter((item) => item.partner === 'Daniela').reduce((sum, item) => sum + item.amount, 0))
  const units = sales.flatMap((sale) => sale.items).reduce((sum, item) => sum + item.quantity, 0)
  const productCounts = new Map<string, number>()
  for (const item of sales.flatMap((sale) => sale.items)) productCounts.set(item.productName, (productCounts.get(item.productName) ?? 0) + item.quantity)
  const topProduct = [...productCounts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
  return {
    income,
    expenses: expensesTotal,
    profit: roundMoney(income - expensesTotal),
    salesCount: sales.length,
    averageTicket: sales.length ? roundMoney(income / sales.length) : 0,
    units,
    topProduct,
    fabricio,
    daniela,
    totalContributions: roundMoney(fabricio + daniela),
    contributionDifference: roundMoney(Math.abs(fabricio - daniela)),
    filteredSales: sales,
    filteredExpenses: expenses,
  }
}

export function buildDailySeries(sales: Sale[], expenses: Expense[], range: DateRange) {
  const allDates = [...sales.map((item) => parseISO(item.soldAt)), ...expenses.map((item) => parseISO(item.spentAt))]
  if (allDates.length === 0) return []
  const minTime = Math.min(...allDates.map((date) => date.getTime()))
  const maxTime = Math.max(...allDates.map((date) => date.getTime()))
  const from = range.from && range.from.getTime() > minTime ? range.from : new Date(minTime)
  const to = range.to && range.to.getTime() < maxTime ? range.to : new Date(maxTime)
  const days = eachDayOfInterval({ start: startOfDay(from), end: endOfDay(to) })
  return days.slice(-31).map((day) => {
    const key = format(day, 'yyyy-MM-dd')
    return {
      date: format(day, 'dd MMM', { locale: es }).replace('.', ''),
      ingresos: roundMoney(sales.filter((sale) => format(parseISO(sale.soldAt), 'yyyy-MM-dd') === key).reduce((sum, sale) => sum + sale.total, 0)),
      egresos: roundMoney(expenses.filter((expense) => format(parseISO(expense.spentAt), 'yyyy-MM-dd') === key).reduce((sum, expense) => sum + expense.total, 0)),
    }
  })
}

export function buildExpenseDistribution(expenses: Expense[]) {
  const totals = new Map<string, number>()
  for (const expense of expenses) totals.set(expense.category, roundMoney((totals.get(expense.category) ?? 0) + expense.total))
  return [...totals].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

export function buildTopProducts(sales: Sale[]) {
  const totals = new Map<string, number>()
  for (const item of sales.flatMap((sale) => sale.items)) totals.set(item.productName, (totals.get(item.productName) ?? 0) + item.quantity)
  return [...totals].map(([name, unidades]) => ({ name: name.replace(/^KOVA\s+/i, ''), unidades })).sort((a, b) => b.unidades - a.unidades).slice(0, 5)
}

export function buildMonthlyProfit(sales: Sale[], expenses: Expense[]) {
  const months = new Map<string, { month: string; ingresos: number; egresos: number }>()
  const ensure = (value: string) => {
    const date = parseISO(value)
    const key = format(date, 'yyyy-MM')
    if (!months.has(key)) months.set(key, { month: format(date, 'MMM yy', { locale: es }).replace('.', ''), ingresos: 0, egresos: 0 })
    return months.get(key)
  }
  for (const sale of sales) { const row = ensure(sale.soldAt); if (row) row.ingresos += sale.total }
  for (const expense of expenses) { const row = ensure(expense.spentAt); if (row) row.egresos += expense.total }
  return [...months].sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([, row]) => ({ ...row, ganancia: roundMoney(row.ingresos - row.egresos) }))
}
