export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export interface Database {
  public: {
    Tables: {
      profiles: Table<{
        id: string; full_name: string; avatar_url: string | null; created_at: string; updated_at: string
      }>
      businesses: Table<{
        id: string; name: string; slug: string; currency: string; timezone: string; whatsapp_number: string | null; created_by: string; created_at: string; updated_at: string
      }>
      business_members: Table<{
        business_id: string; profile_id: string; role: Database['public']['Enums']['member_role']; display_name: string; created_at: string; created_by: string | null
      }>
      expense_categories: Table<{
        id: string; business_id: string; name: string; color: string; is_active: boolean; sort_order: number; created_by: string; created_at: string; updated_at: string
      }>
      payment_methods: Table<{
        id: string; business_id: string; name: string; is_active: boolean; sort_order: number; created_by: string; created_at: string; updated_at: string
      }>
      products: Table<
        { id: string; business_id: string; name: string; description: string | null; sku: string | null; category: string; sale_price: number; estimated_cost: number; status: Database['public']['Enums']['product_status']; sort_order: number; image_url: string | null; created_by: string; created_at: string; updated_at: string },
        { id?: string; business_id: string; name: string; description?: string | null; sku?: string | null; category: string; sale_price: number; estimated_cost?: number; status?: Database['public']['Enums']['product_status']; sort_order?: number; image_url?: string | null; created_by: string; created_at?: string; updated_at?: string }
      >
      product_images: Table<
        { id: string; business_id: string; product_id: string; image_url: string; storage_path: string | null; sort_order: number; created_by: string; created_at: string },
        { id?: string; business_id: string; product_id: string; image_url: string; storage_path?: string | null; sort_order: number; created_by: string; created_at?: string }
      >
      delivery_showcase: Table<
        { id: string; business_id: string; title: string; image_url: string; storage_path: string | null; created_by: string; created_at: string; updated_at: string },
        { id?: string; business_id: string; title: string; image_url: string; storage_path?: string | null; created_by: string; created_at?: string; updated_at?: string }
      >
      sales: Table<{
        id: string; business_id: string; sale_number: number; sold_at: string; payment_method_id: string | null; payment_method_name: string; customer_name: string | null; notes: string | null; total: number; status: Database['public']['Enums']['record_status']; created_by: string; created_at: string; updated_at: string; voided_at: string | null; voided_by: string | null
      }>
      sale_items: Table<{
        id: string; business_id: string; sale_id: string; product_id: string; product_name: string; wrist_measurement_cm: number | null; quantity: number; unit_price: number; unit_cost: number; line_total: number; created_at: string
      }>
      expenses: Table<{
        id: string; business_id: string; spent_at: string; category_id: string | null; category_name: string; concept: string; quantity: number; unit_price: number; total: number; paid_by: Database['public']['Enums']['expense_payer']; notes: string | null; status: Database['public']['Enums']['record_status']; created_by: string; created_at: string; updated_at: string; voided_at: string | null; voided_by: string | null
      }>
      expense_contributions: Table<{
        id: string; business_id: string; expense_id: string; partner: Database['public']['Enums']['partner_name']; amount: number; created_at: string
      }>
      activity_log: Table<{
        id: string; business_id: string; entity_type: Database['public']['Enums']['activity_entity_type']; action: Database['public']['Enums']['activity_action']; entity_id: string; title: string; description: string; amount: number | null; metadata: Json; created_by: string; created_at: string
      }>
      import_batches: Table<
        { id: string; business_id: string; import_type: Database['public']['Enums']['import_type']; file_name: string; file_hash: string; row_count: number; created_by: string; created_at: string },
        { id?: string; business_id: string; import_type: Database['public']['Enums']['import_type']; file_name: string; file_hash: string; row_count: number; created_by: string; created_at?: string }
      >
    }
    Views: Record<string, never>
    Functions: {
      create_business_workspace: { Args: { workspace_name: string; workspace_slug: string }; Returns: string }
      create_sale: { Args: { p_business_id: string; p_sold_at: string; p_payment_method_id: string | null; p_payment_method_name: string; p_customer_name: string; p_notes: string; p_items: Json }; Returns: string }
      update_sale: { Args: { p_sale_id: string; p_sold_at: string; p_payment_method_id: string | null; p_payment_method_name: string; p_customer_name: string; p_notes: string; p_items: Json }; Returns: string }
      void_sale: { Args: { p_sale_id: string }; Returns: undefined }
      create_expense: { Args: { p_business_id: string; p_spent_at: string; p_category_id: string | null; p_category_name: string; p_concept: string; p_quantity: number; p_unit_price: number; p_paid_by: Database['public']['Enums']['expense_payer']; p_notes: string; p_contributions?: Json }; Returns: string }
      update_expense: { Args: { p_expense_id: string; p_spent_at: string; p_category_id: string | null; p_category_name: string; p_concept: string; p_quantity: number; p_unit_price: number; p_paid_by: Database['public']['Enums']['expense_payer']; p_notes: string; p_contributions?: Json }; Returns: string }
      void_expense: { Args: { p_expense_id: string }; Returns: undefined }
      get_public_catalog: { Args: { p_slug?: string }; Returns: Json }
      reorder_products: { Args: { p_business_id: string; p_product_ids: string[] }; Returns: undefined }
    }
    Enums: {
      member_role: 'owner' | 'admin' | 'member'
      product_status: 'active' | 'inactive'
      record_status: 'active' | 'voided'
      expense_payer: 'Fabricio' | 'Daniela' | 'Negocio' | 'Compartido'
      partner_name: 'Fabricio' | 'Daniela'
      activity_entity_type: 'sale' | 'expense' | 'inventory' | 'product' | 'import' | 'settings'
      activity_action: 'created' | 'updated' | 'voided' | 'deactivated' | 'imported'
      import_type: 'sales' | 'expenses'
    }
    CompositeTypes: Record<string, never>
  }
}
