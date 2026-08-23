import { supabase } from '../lib/supabase'
import { toFriendlyError } from './errors'
import type { KovaService } from './contracts'
import type { ActivityEntry, DeliveryShowcaseInput, ExpenseInput, ProductInput, SaleInput, UUID, WorkspaceData } from '../types/domain'
import { attachLocalProductImages, loadProductImageManifest } from './productImages'
import { optimizeDeliveryImage } from '../utils/imageUpload'

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

    const [business, members, categories, methods, products, deliveries, sales, saleItems, expenses, contributions, activities, profiles, imageManifest] = await Promise.all([
      database.from('businesses').select('*').eq('id', businessId).single(),
      database.from('business_members').select('*').eq('business_id', businessId),
      database.from('expense_categories').select('*').eq('business_id', businessId).order('sort_order'),
      database.from('payment_methods').select('*').eq('business_id', businessId).order('sort_order'),
      database.from('products').select('*').eq('business_id', businessId).order('sort_order').order('created_at', { ascending: false }),
      database.from('delivery_showcase').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
      database.from('sales').select('*').eq('business_id', businessId).eq('status', 'active').order('sold_at', { ascending: false }),
      database.from('sale_items').select('*').eq('business_id', businessId),
      database.from('expenses').select('*').eq('business_id', businessId).eq('status', 'active').order('spent_at', { ascending: false }),
      database.from('expense_contributions').select('*').eq('business_id', businessId),
      database.from('activity_log').select('*').eq('business_id', businessId).order('created_at', { ascending: false }).limit(500),
      database.from('profiles').select('*'),
      loadProductImageManifest(),
    ])
    const failed = [business, members, categories, methods, products, deliveries, sales, saleItems, expenses, contributions, activities, profiles].find((result) => result.error)
    if (failed?.error) throw toFriendlyError(failed.error)
    if (!business.data) throw new Error('No se pudo cargar el espacio de KOVA.')

    const profileNames = new Map((profiles.data ?? []).map((profile) => [profile.id, profile.full_name]))
    return {
      business: { id: business.data.id, name: business.data.name, slug: business.data.slug, whatsappNumber: business.data.whatsapp_number },
      members: (members.data ?? []).map((member) => ({ profileId: member.profile_id, displayName: member.display_name, role: member.role })),
      categories: (categories.data ?? []).map((category) => ({ id: category.id, businessId: category.business_id, name: category.name, color: category.color, isActive: category.is_active })),
      paymentMethods: (methods.data ?? []).map((method) => ({ id: method.id, businessId: method.business_id, name: method.name, isActive: method.is_active })),
      products: attachLocalProductImages((products.data ?? []).map((product) => ({ id: product.id, businessId: product.business_id, name: product.name, description: product.description, sku: product.sku, category: product.category, salePrice: Number(product.sale_price), estimatedCost: Number(product.estimated_cost), status: product.status, sortOrder: Number(product.sort_order), images: [], outfitImages: [], createdAt: product.created_at, updatedAt: product.updated_at })), imageManifest),
      deliveries: (deliveries.data ?? []).map((delivery) => ({ id: delivery.id, businessId: delivery.business_id, title: delivery.title, imageUrl: delivery.image_url, storagePath: delivery.storage_path, createdAt: delivery.created_at })),
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
    const productId = crypto.randomUUID()
    const userId = await currentUserId()
    const businessId = this.requireBusinessId()
    const first = await client().from('products').select('*').eq('business_id', businessId).order('sort_order').limit(1).maybeSingle()
    if (first.error) throw toFriendlyError(first.error)
    const sortOrder = (first.data?.sort_order ?? 1) - 1
    const { error } = await client().from('products').insert({ id: productId, business_id: businessId, name: input.name, description: input.description || null, sku: input.sku || null, category: input.category, sale_price: input.salePrice, estimated_cost: input.estimatedCost, sort_order: sortOrder, image_url: null, created_by: userId })
    if (error) throw toFriendlyError(error)
  }

  async updateProduct(id: UUID, input: ProductInput): Promise<void> {
    const database = client()
    const { error } = await database.from('products').update({ name: input.name, description: input.description || null, sku: input.sku || null, category: input.category, sale_price: input.salePrice, estimated_cost: input.estimatedCost, image_url: null }).eq('id', id)
    if (error) throw toFriendlyError(error)
  }

  async deactivateProduct(id: UUID): Promise<void> {
    const { error } = await client().from('products').update({ status: 'inactive' }).eq('id', id)
    if (error) throw toFriendlyError(error)
  }

  async activateProduct(id: UUID): Promise<void> {
    const { error } = await client().from('products').update({ status: 'active' }).eq('id', id)
    if (error) throw toFriendlyError(error)
  }

  async reorderProducts(ids: UUID[]): Promise<void> {
    const { error } = await client().rpc('reorder_products', { p_business_id: this.requireBusinessId(), p_product_ids: ids })
    if (error) throw toFriendlyError(error, 'No se pudo guardar el orden del catálogo.')
  }

  async createDeliveryShowcase(input: DeliveryShowcaseInput): Promise<void> {
    const database = client()
    const businessId = this.requireBusinessId()
    const deliveryId = crypto.randomUUID()
    const userId = await currentUserId()
    const image = await optimizeDeliveryImage(input.image)
    const storagePath = `${businessId}/${deliveryId}.webp`
    const upload = await database.storage.from('delivery-images').upload(storagePath, image, { cacheControl: '31536000', contentType: 'image/webp', upsert: false })
    if (upload.error) throw toFriendlyError(upload.error, 'No se pudo subir la foto de la entrega.')

    const imageUrl = database.storage.from('delivery-images').getPublicUrl(storagePath).data.publicUrl
    const { error } = await database.from('delivery_showcase').insert({ id: deliveryId, business_id: businessId, title: input.title.trim(), image_url: imageUrl, storage_path: storagePath, created_by: userId })
    if (error) {
      await database.storage.from('delivery-images').remove([storagePath])
      throw toFriendlyError(error, 'No se pudo publicar la entrega.')
    }
  }

  async deleteDeliveryShowcase(id: UUID): Promise<void> {
    const database = client()
    const businessId = this.requireBusinessId()
    const current = await database.from('delivery_showcase').select('*').eq('business_id', businessId).eq('id', id).single()
    if (current.error) throw toFriendlyError(current.error, 'No se encontró la entrega.')
    const removed = await database.from('delivery_showcase').delete().eq('business_id', businessId).eq('id', id)
    if (removed.error) throw toFriendlyError(removed.error, 'No se pudo eliminar la entrega.')
    if (current.data.storage_path) {
      const storageRemoval = await database.storage.from('delivery-images').remove([current.data.storage_path])
      if (storageRemoval.error) throw toFriendlyError(storageRemoval.error, 'La publicación se eliminó, pero no se pudo borrar su archivo.')
    }
  }

  async updateBusinessContact(whatsappNumber: string): Promise<void> {
    const { error } = await client().from('businesses').update({ whatsapp_number: whatsappNumber }).eq('id', this.requireBusinessId())
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
