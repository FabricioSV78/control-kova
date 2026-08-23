export type UUID = string
export type ISODate = string
export type ISOTimestamp = string

export type PartnerName = 'Fabricio' | 'Daniela'
export type ExpensePayer = PartnerName | 'Negocio' | 'Compartido'
export type ProductStatus = 'active' | 'inactive'

export interface Business {
  id: UUID
  name: string
  slug: string
  whatsappNumber: string | null
}

export interface BusinessMember {
  profileId: UUID
  displayName: string
  role: 'owner' | 'admin' | 'member'
}

export interface ExpenseCategory {
  id: UUID
  businessId: UUID
  name: string
  color: string
  isActive: boolean
}

export interface PaymentMethod {
  id: UUID
  businessId: UUID
  name: string
  isActive: boolean
}

export interface Product {
  id: UUID
  businessId: UUID
  name: string
  description: string | null
  sku: string | null
  category: string
  salePrice: number
  estimatedCost: number
  status: ProductStatus
  sortOrder: number
  images: ProductImage[]
  outfitImages: ProductImage[]
  createdAt: ISOTimestamp
  updatedAt: ISOTimestamp
}

export interface ProductImage {
  id: UUID
  url: string
  storagePath: string | null
  sortOrder: number
}

export interface DeliveryShowcase {
  id: UUID
  businessId: UUID
  title: string
  imageUrl: string
  storagePath: string | null
  createdAt: ISOTimestamp
}

export interface SaleItem {
  id: UUID
  saleId: UUID
  productId: UUID
  productName: string
  wristMeasurementCm: number | null
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface Sale {
  id: UUID
  businessId: UUID
  saleNumber: number
  soldAt: ISOTimestamp
  paymentMethod: string
  customerName: string | null
  notes: string | null
  total: number
  items: SaleItem[]
  createdBy: UUID
  createdByName: string
  createdAt: ISOTimestamp
  updatedAt: ISOTimestamp
}

export interface ExpenseContribution {
  id: UUID
  expenseId: UUID
  partner: PartnerName
  amount: number
}

export interface Expense {
  id: UUID
  businessId: UUID
  spentAt: ISOTimestamp
  category: string
  concept: string
  quantity: number
  unitPrice: number
  total: number
  paidBy: ExpensePayer
  notes: string | null
  contributions: ExpenseContribution[]
  createdBy: UUID
  createdByName: string
  createdAt: ISOTimestamp
  updatedAt: ISOTimestamp
}

export interface ActivityEntry {
  id: UUID
  businessId: UUID
  type: 'sale' | 'expense' | 'product'
  action: 'created' | 'updated' | 'deleted' | 'deactivated'
  title: string
  description: string
  amount: number | null
  entityId: UUID
  actorName: string
  occurredAt: ISOTimestamp
}

export interface WorkspaceData {
  business: Business
  members: BusinessMember[]
  categories: ExpenseCategory[]
  paymentMethods: PaymentMethod[]
  products: Product[]
  deliveries: DeliveryShowcase[]
  sales: Sale[]
  expenses: Expense[]
  activities: ActivityEntry[]
}

export interface DeliveryShowcaseInput {
  title: string
  image: File
}

export interface SaleItemInput {
  productId: UUID
  wristMeasurementCm: number | null
  quantity: number
  unitPrice: number
}

export interface SaleInput {
  soldAt: ISOTimestamp
  paymentMethod: string
  customerName?: string
  notes?: string
  items: SaleItemInput[]
}

export interface ExpenseContributionInput {
  partner: PartnerName
  amount: number
}

export interface ExpenseInput {
  spentAt: ISOTimestamp
  category: string
  concept: string
  quantity: number
  unitPrice: number
  paidBy: ExpensePayer
  notes?: string
  contributions: ExpenseContributionInput[]
}

export interface ProductInput {
  name: string
  description?: string
  sku?: string
  category: string
  salePrice: number
  estimatedCost: number
}
