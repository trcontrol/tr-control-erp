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
      [_ in never]: never;
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
export type Profile = Tables<"profiles">;
export type CompanyMember = Tables<"company_members">;
