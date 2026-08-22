import { supabase } from '../lib/supabase'
import { toFriendlyError } from './errors'
import type { KovaService } from './contracts'
import type { ActivityEntry, ExpenseInput, ProductInput, SaleInput, UUID, WorkspaceData } from '../types/domain'

function client() {
  if (!supabase) throw new Error('Supabase no está configurado.')
  return supabase
}

async function currentUserId(): Promise<string> {
  const { data, error } = await client().auth.getUser()
  if (error || !data.user) throw toFriendlyError(error, 'Tu sesión ha vencido. Vuelve a iniciar sesión.')
  return data.user.id
}

export class SupabaseKovaService implements KovaService {
  private businessId: string | null = null

  async loadWorkspace(): Promise<WorkspaceData | null> {
    const database = client()
    const userId = await currentUserId()
    const membershipResult = await database.from('business_members').select('*').eq('profile_id', userId).limit(1).maybeSingle()
    if (membershipResult.error) throw toFriendlyError(membershipResult.error)
    const membership = membershipResult.data
    if (!membership) return null
    this.businessId = membership.business_id
    const businessId = membership.business_id

    const [business, members, categories, methods, products, sales, saleItems, expenses, contributions, activities, profiles] = await Promise.all([
      database.from('businesses').select('*').eq('id', businessId).single(),
      database.from('business_members').select('*').eq('business_id', businessId),
      database.from('expense_categories').select('*').eq('business_id', businessId).order('sort_order'),
      database.from('payment_methods').select('*').eq('business_id', businessId).order('sort_order'),
      database.from('products').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
      database.from('sales').select('*').eq('business_id', businessId).eq('status', 'active').order('sold_at', { ascending: false }),
      database.from('sale_items').select('*').eq('business_id', businessId),
      database.from('expenses').select('*').eq('business_id', businessId).eq('status', 'active').order('spent_at', { ascending: false }),
      database.from('expense_contributions').select('*').eq('business_id', businessId),
      database.from('activity_log').select('*').eq('business_id', businessId).order('created_at', { ascending: false }).limit(500),
      database.from('profiles').select('*'),
    ])
    const failed = [business, members, categories, methods, products, sales, saleItems, expenses, contributions, activities, profiles].find((result) => result.error)
    if (failed?.error) throw toFriendlyError(failed.error)
    if (!business.data) throw new Error('No se pudo cargar el espacio de KOVA.')

    const profileNames = new Map((profiles.data ?? []).map((profile) => [profile.id, profile.full_name]))
    return {
      business: { id: business.data.id, name: business.data.name, slug: business.data.slug },
      members: (members.data ?? []).map((member) => ({ profileId: member.profile_id, displayName: member.display_name, role: member.role })),
      categories: (categories.data ?? []).map((category) => ({ id: category.id, businessId: category.business_id, name: category.name, color: category.color, isActive: category.is_active })),
      paymentMethods: (methods.data ?? []).map((method) => ({ id: method.id, businessId: method.business_id, name: method.name, isActive: method.is_active })),
      products: (products.data ?? []).map((product) => ({ id: product.id, businessId: product.business_id, name: product.name, sku: product.sku, category: product.category, salePrice: Number(product.sale_price), estimatedCost: Number(product.estimated_cost), status: product.status, imageUrl: product.image_url, createdAt: product.created_at, updatedAt: product.updated_at })),
      sales: (sales.data ?? []).map((sale) => ({ id: sale.id, businessId: sale.business_id, saleNumber: Number(sale.sale_number), soldAt: sale.sold_at, paymentMethod: sale.payment_method_name, customerName: sale.customer_name, notes: sale.notes, total: Number(sale.total), items: (saleItems.data ?? []).filter((item) => item.sale_id === sale.id).map((item) => ({ id: item.id, saleId: item.sale_id, productId: item.product_id, productName: item.product_name, wristMeasurementCm: item.wrist_measurement_cm === null ? null : Number(item.wrist_measurement_cm), quantity: Number(item.quantity), unitPrice: Number(item.unit_price), lineTotal: Number(item.line_total) })), createdBy: sale.created_by, createdByName: profileNames.get(sale.created_by) ?? 'Usuario KOVA', createdAt: sale.created_at, updatedAt: sale.updated_at })),
      expenses: (expenses.data ?? []).map((expense) => ({ id: expense.id, businessId: expense.business_id, spentAt: expense.spent_at, category: expense.category_name, concept: expense.concept, quantity: Number(expense.quantity), unitPrice: Number(expense.unit_price), total: Number(expense.total), paidBy: expense.paid_by, notes: expense.notes, contributions: (contributions.data ?? []).filter((item) => item.expense_id === expense.id).map((item) => ({ id: item.id, expenseId: item.expense_id, partner: item.partner, amount: Number(item.amount) })), createdBy: expense.created_by, createdByName: profileNames.get(expense.created_by) ?? 'Usuario KOVA', createdAt: expense.created_at, updatedAt: expense.updated_at })),
      activities: (activities.data ?? []).filter((activity) => activity.entity_type === 'sale' || activity.entity_type === 'expense' || activity.entity_type === 'product').map((activity) => ({ id: activity.id, businessId: activity.business_id, type: activity.entity_type as ActivityEntry['type'], action: activity.action === 'voided' ? 'deleted' : activity.action === 'imported' ? 'created' : activity.action, title: activity.title, description: activity.description, amount: activity.amount === null ? null : Number(activity.amount), entityId: activity.entity_id, actorName: profileNames.get(activity.created_by) ?? 'Usuario KOVA', occurredAt: activity.created_at })),
    }
  }

  async createWorkspace(name: string, slug: string): Promise<void> {
    const { error } = await client().rpc('create_business_workspace', { workspace_name: name, workspace_slug: slug })
    if (error) throw toFriendlyError(error)
  }

  private requireBusinessId(): string {
    if (!this.businessId) throw new Error('KOVA aún no terminó de cargar.')
    return this.businessId
  }

  private async paymentMethodId(name: string): Promise<string | null> {
    const { data } = await client().from('payment_methods').select('*').eq('business_id', this.requireBusinessId()).eq('name', name).maybeSingle()
    return data?.id ?? null
  }

  private async categoryId(name: string): Promise<string | null> {
    const { data } = await client().from('expense_categories').select('*').eq('business_id', this.requireBusinessId()).eq('name', name).maybeSingle()
    return data?.id ?? null
  }

  async createSale(input: SaleInput): Promise<void> {
    const { error } = await client().rpc('create_sale', { p_business_id: this.requireBusinessId(), p_sold_at: input.soldAt, p_payment_method_id: await this.paymentMethodId(input.paymentMethod), p_payment_method_name: input.paymentMethod, p_customer_name: input.customerName ?? '', p_notes: input.notes ?? '', p_items: input.items.map((item) => ({ product_id: item.productId, wrist_measurement_cm: item.wristMeasurementCm, quantity: item.quantity, unit_price: item.unitPrice })) })
    if (error) throw toFriendlyError(error)
  }

  async updateSale(id: UUID, input: SaleInput): Promise<void> {
    const { error } = await client().rpc('update_sale', { p_sale_id: id, p_sold_at: input.soldAt, p_payment_method_id: await this.paymentMethodId(input.paymentMethod), p_payment_method_name: input.paymentMethod, p_customer_name: input.customerName ?? '', p_notes: input.notes ?? '', p_items: input.items.map((item) => ({ product_id: item.productId, wrist_measurement_cm: item.wristMeasurementCm, quantity: item.quantity, unit_price: item.unitPrice })) })
    if (error) throw toFriendlyError(error)
  }

  async voidSale(id: UUID): Promise<void> {
    const { error } = await client().rpc('void_sale', { p_sale_id: id })
    if (error) throw toFriendlyError(error)
  }

  async createExpense(input: ExpenseInput): Promise<void> {
    const contributions = input.contributions.map(({ partner, amount }) => ({ partner, amount }))
    const { error } = await client().rpc('create_expense', { p_business_id: this.requireBusinessId(), p_spent_at: input.spentAt, p_category_id: await this.categoryId(input.category), p_category_name: input.category, p_concept: input.concept, p_quantity: input.quantity, p_unit_price: input.unitPrice, p_paid_by: input.paidBy, p_notes: input.notes ?? '', p_contributions: contributions })
    if (error) throw toFriendlyError(error)
  }

  async updateExpense(id: UUID, input: ExpenseInput): Promise<void> {
    const contributions = input.contributions.map(({ partner, amount }) => ({ partner, amount }))
    const { error } = await client().rpc('update_expense', { p_expense_id: id, p_spent_at: input.spentAt, p_category_id: await this.categoryId(input.category), p_category_name: input.category, p_concept: input.concept, p_quantity: input.quantity, p_unit_price: input.unitPrice, p_paid_by: input.paidBy, p_notes: input.notes ?? '', p_contributions: contributions })
    if (error) throw toFriendlyError(error)
  }

  async voidExpense(id: UUID): Promise<void> {
    const { error } = await client().rpc('void_expense', { p_expense_id: id })
    if (error) throw toFriendlyError(error)
  }

  async createProduct(input: ProductInput): Promise<void> {
    const { error } = await client().from('products').insert({ business_id: this.requireBusinessId(), name: input.name, sku: input.sku || null, category: input.category, sale_price: input.salePrice, estimated_cost: input.estimatedCost, image_url: input.imageUrl || null, created_by: await currentUserId() })
    if (error) throw toFriendlyError(error)
  }

  async updateProduct(id: UUID, input: ProductInput): Promise<void> {
    const { error } = await client().from('products').update({ name: input.name, sku: input.sku || null, category: input.category, sale_price: input.salePrice, estimated_cost: input.estimatedCost, image_url: input.imageUrl || null }).eq('id', id)
    if (error) throw toFriendlyError(error)
  }

  async deactivateProduct(id: UUID): Promise<void> {
    const { error } = await client().from('products').update({ status: 'inactive' }).eq('id', id)
    if (error) throw toFriendlyError(error)
  }

  async hasImportBatch(type: 'sales' | 'expenses', hash: string): Promise<boolean> {
    const { data, error } = await client().from('import_batches').select('*').eq('business_id', this.requireBusinessId()).eq('import_type', type).eq('file_hash', hash).maybeSingle()
    if (error) throw toFriendlyError(error)
    return Boolean(data)
  }

  async saveImportBatch(type: 'sales' | 'expenses', fileName: string, hash: string, rowCount: number): Promise<void> {
    const { error } = await client().from('import_batches').insert({ business_id: this.requireBusinessId(), import_type: type, file_name: fileName, file_hash: hash, row_count: rowCount, created_by: await currentUserId() })
    if (error) throw toFriendlyError(error)
  }
}
