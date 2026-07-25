import { createClient } from "@/lib/supabase/client";
import { PRODUCT_IMAGES_BUCKET } from "@/lib/constants";
import type { Product, ProductInsert, ProductUpdate } from "@/types/database";

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string } };

export async function listProducts(params: {
  companyId: string;
  search?: string;
  status?: string;
  productType?: string;
  category?: string;
  brand?: string;
}): Promise<Result<Product[]>> {
  const supabase = createClient();
  let query = supabase
    .from("products")
    .select("*")
    .eq("company_id", params.companyId)
    .order("name", { ascending: true });

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (params.productType && params.productType !== "all") {
    query = query.eq("product_type", params.productType);
  }

  if (params.category && params.category !== "all") {
    query = query.eq("category", params.category);
  }

  if (params.brand && params.brand !== "all") {
    query = query.eq("brand", params.brand);
  }

  if (params.search?.trim()) {
    const term = params.search.trim();
    query = query.or(
      `name.ilike.%${term}%,internal_code.ilike.%${term}%,sku.ilike.%${term}%,barcode.ilike.%${term}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  return { data: (data ?? []) as Product[], error: null };
}

export async function getProduct(
  companyId: string,
  productId: string
): Promise<Result<Product>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  if (!data) {
    return { data: null, error: { message: "Produto não encontrado." } };
  }

  return { data: data as Product, error: null };
}

export async function createProduct(
  payload: ProductInsert
): Promise<Result<Product>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .insert(payload as never)
    .select("*")
    .single();

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  return { data: data as Product, error: null };
}

export async function updateProduct(
  companyId: string,
  productId: string,
  payload: ProductUpdate
): Promise<Result<Product>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .update(payload as never)
    .eq("company_id", companyId)
    .eq("id", productId)
    .select("*")
    .single();

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  return { data: data as Product, error: null };
}

export async function deleteProduct(
  companyId: string,
  productId: string
): Promise<Result<true>> {
  const supabase = createClient();
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("company_id", companyId)
    .eq("id", productId);

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  return { data: true, error: null };
}

export async function uploadProductImage(
  companyId: string,
  file: File
): Promise<{ publicUrl: string | null; error: string | null }> {
  const supabase = createClient();
  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${companyId}/product-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    return { publicUrl: null, error: uploadError.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);

  return { publicUrl, error: null };
}

export async function listProductFilterOptions(
  companyId: string
): Promise<Result<{ categories: string[]; brands: string[] }>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("category, brand")
    .eq("company_id", companyId);

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  const rows = (data ?? []) as Array<{
    category: string | null;
    brand: string | null;
  }>;

  const categories = Array.from(
    new Set(
      rows
        .map((item) => item.category)
        .filter((value): value is string => Boolean(value && value.trim()))
    )
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const brands = Array.from(
    new Set(
      rows
        .map((item) => item.brand)
        .filter((value): value is string => Boolean(value && value.trim()))
    )
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  return { data: { categories, brands }, error: null };
}
