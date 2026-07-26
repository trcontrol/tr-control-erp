export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CompanyRow = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  logo_url: string | null;
  legal_name: string | null;
  cnpj: string | null;
  state_registration: string | null;
  municipal_registration: string | null;
  tax_regime: string | null;
  zip_code: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  responsible_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyInsert = {
  id?: string;
  name: string;
  slug: string;
  plan?: string;
  logo_url?: string | null;
  legal_name?: string | null;
  cnpj?: string | null;
  state_registration?: string | null;
  municipal_registration?: string | null;
  tax_regime?: string | null;
  zip_code?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  responsible_name?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CompanyUpdate = {
  id?: string;
  name?: string;
  slug?: string;
  plan?: string;
  logo_url?: string | null;
  legal_name?: string | null;
  cnpj?: string | null;
  state_registration?: string | null;
  municipal_registration?: string | null;
  tax_regime?: string | null;
  zip_code?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  responsible_name?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CustomerRow = {
  id: string;
  company_id: string;
  person_type: "individual" | "company" | string;
  full_name: string;
  trade_name: string | null;
  document: string | null;
  secondary_document: string | null;
  birth_date: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  zip_code: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  status: "active" | "inactive" | string;
  created_at: string;
  updated_at: string;
};

export type CustomerInsert = {
  id?: string;
  company_id: string;
  person_type: string;
  full_name: string;
  trade_name?: string | null;
  document?: string | null;
  secondary_document?: string | null;
  birth_date?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  zip_code?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  notes?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

export type CustomerUpdate = Partial<Omit<CustomerInsert, "company_id">> & {
  company_id?: string;
};

export type SupplierRow = {
  id: string;
  company_id: string;
  person_type: "individual" | "company" | string;
  full_name: string;
  trade_name: string | null;
  document: string | null;
  secondary_document: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  zip_code: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  contact_name: string | null;
  category: string | null;
  notes: string | null;
  status: "active" | "inactive" | string;
  created_at: string;
  updated_at: string;
};

export type SupplierInsert = {
  id?: string;
  company_id: string;
  person_type: string;
  full_name: string;
  trade_name?: string | null;
  document?: string | null;
  secondary_document?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  zip_code?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  contact_name?: string | null;
  category?: string | null;
  notes?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

export type SupplierUpdate = Partial<Omit<SupplierInsert, "company_id">> & {
  company_id?: string;
};

export type FinancialEntryRow = {
  id: string;
  company_id: string;
  customer_id: string | null;
  supplier_id: string | null;
  entry_type: "payable" | "receivable" | string;
  description: string;
  category: string | null;
  party_name: string | null;
  amount: number | string;
  issue_date: string;
  due_date: string;
  payment_date: string | null;
  status: "pending" | "paid" | "received" | "overdue" | "cancelled" | string;
  payment_method: string | null;
  document_number: string | null;
  notes: string | null;
  is_recurring: boolean;
  source_type: string | null;
  source_id: string | null;
  created_at: string;
  updated_at: string;
};

export type FinancialEntryInsert = {
  id?: string;
  company_id: string;
  customer_id?: string | null;
  supplier_id?: string | null;
  entry_type: string;
  description: string;
  category?: string | null;
  party_name?: string | null;
  amount: number;
  issue_date: string;
  due_date: string;
  payment_date?: string | null;
  status?: string;
  payment_method?: string | null;
  document_number?: string | null;
  notes?: string | null;
  is_recurring?: boolean;
  source_type?: string | null;
  source_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type FinancialEntryUpdate = Partial<
  Omit<FinancialEntryInsert, "company_id">
> & {
  company_id?: string;
};

export type ProductRow = {
  id: string;
  company_id: string;
  product_type: "product" | "service" | string;
  internal_code: string | null;
  sku: string | null;
  barcode: string | null;
  name: string;
  description: string | null;
  category: string | null;
  brand: string | null;
  unit: string | null;
  ncm: string | null;
  cost_price: number | string;
  sale_price: number | string;
  tracks_stock: boolean;
  current_stock: number | string;
  min_stock: number | string;
  max_stock: number | string | null;
  stock_location: string | null;
  image_url: string | null;
  status: "active" | "inactive" | string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductInsert = {
  id?: string;
  company_id: string;
  product_type: string;
  internal_code?: string | null;
  sku?: string | null;
  barcode?: string | null;
  name: string;
  description?: string | null;
  category?: string | null;
  brand?: string | null;
  unit?: string | null;
  ncm?: string | null;
  cost_price?: number;
  sale_price?: number;
  tracks_stock?: boolean;
  current_stock?: number;
  min_stock?: number;
  max_stock?: number | null;
  stock_location?: string | null;
  image_url?: string | null;
  status?: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type StockMovementRow = {
  id: string;
  company_id: string;
  product_id: string;
  movement_type: "entry" | "exit" | "adjustment" | "inventory" | string;
  quantity: number | string;
  quantity_delta: number | string | null;
  previous_stock: number | string | null;
  new_stock: number | string | null;
  movement_date: string;
  notes: string | null;
  responsible_user_id: string | null;
  source_type: string | null;
  source_id: string | null;
  created_at: string;
  updated_at: string;
};

export type StockMovementInsert = {
  id?: string;
  company_id: string;
  product_id: string;
  movement_type: string;
  quantity: number;
  quantity_delta?: number | null;
  previous_stock?: number | null;
  new_stock?: number | null;
  movement_date?: string;
  notes?: string | null;
  responsible_user_id?: string | null;
  source_type?: string | null;
  source_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type PurchaseRow = {
  id: string;
  company_id: string;
  supplier_id: string | null;
  status: "draft" | "confirmed" | "cancelled" | string;
  purchase_date: string;
  due_date: string | null;
  payment_method: string | null;
  document_number: string | null;
  notes: string | null;
  freight_amount: number | string;
  discount_amount: number | string;
  items_subtotal: number | string;
  total_amount: number | string;
  payment_terms: string | null;
  stock_posted: boolean;
  finance_posted: boolean;
  cost_posted: boolean;
  financial_entry_id: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancelled_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PurchaseInsert = {
  id?: string;
  company_id: string;
  supplier_id?: string | null;
  status?: string;
  purchase_date?: string;
  due_date?: string | null;
  payment_method?: string | null;
  document_number?: string | null;
  notes?: string | null;
  freight_amount?: number;
  discount_amount?: number;
  items_subtotal?: number;
  total_amount?: number;
  payment_terms?: string | null;
  stock_posted?: boolean;
  finance_posted?: boolean;
  cost_posted?: boolean;
  financial_entry_id?: string | null;
  confirmed_at?: string | null;
  confirmed_by?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancelled_reason?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type PurchaseUpdate = Partial<Omit<PurchaseInsert, "company_id">> & {
  company_id?: string;
};

export type PurchaseItemRow = {
  id: string;
  company_id: string;
  purchase_id: string;
  product_id: string;
  quantity: number | string;
  unit_cost: number | string;
  discount_amount: number | string;
  line_total: number | string;
  tracks_stock_snapshot: boolean | null;
  stock_movement_id: string | null;
  net_unit_cost: number | string | null;
  cost_before: number | string | null;
  cost_after: number | string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type PurchaseItemInsert = {
  id?: string;
  company_id: string;
  purchase_id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  discount_amount?: number;
  line_total?: number;
  tracks_stock_snapshot?: boolean | null;
  stock_movement_id?: string | null;
  net_unit_cost?: number | null;
  cost_before?: number | null;
  cost_after?: number | null;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
};

export type PurchaseItemUpdate = Partial<
  Omit<PurchaseItemInsert, "company_id" | "purchase_id">
> & {
  company_id?: string;
  purchase_id?: string;
};

export type SaleRow = {
  id: string;
  company_id: string;
  customer_id: string | null;
  status: "draft" | "confirmed" | "cancelled" | string;
  sale_date: string;
  due_date: string | null;
  payment_method: string | null;
  document_number: string | null;
  notes: string | null;
  freight_amount: number | string;
  discount_amount: number | string;
  items_subtotal: number | string;
  total_amount: number | string;
  payment_terms: string | null;
  quote_id: string | null;
  stock_posted: boolean;
  finance_posted: boolean;
  financial_entry_id: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancelled_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SaleInsert = {
  id?: string;
  company_id: string;
  customer_id?: string | null;
  status?: string;
  sale_date?: string;
  due_date?: string | null;
  payment_method?: string | null;
  document_number?: string | null;
  notes?: string | null;
  freight_amount?: number;
  discount_amount?: number;
  items_subtotal?: number;
  total_amount?: number;
  payment_terms?: string | null;
  quote_id?: string | null;
  stock_posted?: boolean;
  finance_posted?: boolean;
  financial_entry_id?: string | null;
  confirmed_at?: string | null;
  confirmed_by?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancelled_reason?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type SaleUpdate = Partial<Omit<SaleInsert, "company_id">> & {
  company_id?: string;
};

export type SaleItemRow = {
  id: string;
  company_id: string;
  sale_id: string;
  product_id: string;
  quantity: number | string;
  unit_price: number | string;
  discount_amount: number | string;
  line_total: number | string;
  tracks_stock_snapshot: boolean | null;
  stock_movement_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type SaleItemInsert = {
  id?: string;
  company_id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  discount_amount?: number;
  line_total?: number;
  tracks_stock_snapshot?: boolean | null;
  stock_movement_id?: string | null;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
};

export type SaleItemUpdate = Partial<
  Omit<SaleItemInsert, "company_id" | "sale_id">
> & {
  company_id?: string;
  sale_id?: string;
};

export type StockMovementUpdate = Partial<
  Omit<StockMovementInsert, "company_id">
> & {
  company_id?: string;
};

export type ProductUpdate = Partial<Omit<ProductInsert, "company_id">> & {
  company_id?: string;
};

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: CompanyRow;
        Insert: CompanyInsert;
        Update: CompanyUpdate;
        Relationships: [];
      };
      customers: {
        Row: CustomerRow;
        Insert: CustomerInsert;
        Update: CustomerUpdate;
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      suppliers: {
        Row: SupplierRow;
        Insert: SupplierInsert;
        Update: SupplierUpdate;
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      financial_entries: {
        Row: FinancialEntryRow;
        Insert: FinancialEntryInsert;
        Update: FinancialEntryUpdate;
        Relationships: [
          {
            foreignKeyName: "financial_entries_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "financial_entries_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "financial_entries_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: ProductRow;
        Insert: ProductInsert;
        Update: ProductUpdate;
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_movements: {
        Row: StockMovementRow;
        Insert: StockMovementInsert;
        Update: StockMovementUpdate;
        Relationships: [
          {
            foreignKeyName: "stock_movements_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movements_responsible_user_id_fkey";
            columns: ["responsible_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      purchases: {
        Row: PurchaseRow;
        Insert: PurchaseInsert;
        Update: PurchaseUpdate;
        Relationships: [
          {
            foreignKeyName: "purchases_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchases_financial_entry_id_fkey";
            columns: ["financial_entry_id"];
            isOneToOne: false;
            referencedRelation: "financial_entries";
            referencedColumns: ["id"];
          },
        ];
      };
      purchase_items: {
        Row: PurchaseItemRow;
        Insert: PurchaseItemInsert;
        Update: PurchaseItemUpdate;
        Relationships: [
          {
            foreignKeyName: "purchase_items_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey";
            columns: ["purchase_id"];
            isOneToOne: false;
            referencedRelation: "purchases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      sales: {
        Row: SaleRow;
        Insert: SaleInsert;
        Update: SaleUpdate;
        Relationships: [
          {
            foreignKeyName: "sales_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_financial_entry_id_fkey";
            columns: ["financial_entry_id"];
            isOneToOne: false;
            referencedRelation: "financial_entries";
            referencedColumns: ["id"];
          },
        ];
      };
      sale_items: {
        Row: SaleItemRow;
        Insert: SaleItemInsert;
        Update: SaleItemUpdate;
        Relationships: [
          {
            foreignKeyName: "sale_items_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sale_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      company_members: {
        Row: {
          id: string;
          company_id: string;
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          user_id: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          user_id?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "company_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      confirm_purchase: {
        Args: { p_purchase_id: string };
        Returns: PurchaseRow;
      };
      cancel_purchase: {
        Args: { p_purchase_id: string; p_reason: string | null };
        Returns: PurchaseRow;
      };
      recalculate_purchase_totals: {
        Args: { p_purchase_id: string };
        Returns: null;
      };
      confirm_sale: {
        Args: { p_sale_id: string };
        Returns: SaleRow;
      };
      cancel_sale: {
        Args: { p_sale_id: string; p_reason: string | null };
        Returns: SaleRow;
      };
      recalculate_sale_totals: {
        Args: { p_sale_id: string };
        Returns: null;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Company = Tables<"companies">;
export type Customer = Tables<"customers">;
export type Supplier = Tables<"suppliers">;
export type FinancialEntry = Tables<"financial_entries">;
export type Product = Tables<"products">;
export type StockMovement = Tables<"stock_movements">;
export type Purchase = Tables<"purchases">;
export type PurchaseItem = Tables<"purchase_items">;
export type Sale = Tables<"sales">;
export type SaleItem = Tables<"sale_items">;
export type Profile = Tables<"profiles">;
export type CompanyMember = Tables<"company_members">;
