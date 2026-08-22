import type {
  ExpenseInput,
  ProductInput,
  SaleInput,
  UUID,
  WorkspaceData,
} from '../types/domain'

export interface KovaService {
  loadWorkspace(): Promise<WorkspaceData | null>
  createWorkspace(name: string, slug: string): Promise<void>
  createSale(input: SaleInput): Promise<void>
  updateSale(id: UUID, input: SaleInput): Promise<void>
  voidSale(id: UUID): Promise<void>
  createExpense(input: ExpenseInput): Promise<void>
  updateExpense(id: UUID, input: ExpenseInput): Promise<void>
  voidExpense(id: UUID): Promise<void>
  createProduct(input: ProductInput): Promise<void>
  updateProduct(id: UUID, input: ProductInput): Promise<void>
  deactivateProduct(id: UUID): Promise<void>
  hasImportBatch(type: 'sales' | 'expenses', hash: string): Promise<boolean>
  saveImportBatch(type: 'sales' | 'expenses', fileName: string, hash: string, rowCount: number): Promise<void>
  resetDemo?(): Promise<void>
}
