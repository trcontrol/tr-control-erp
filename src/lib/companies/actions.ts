import { createClient } from "@/lib/supabase/client";
import type { Company, CompanyUpdate } from "@/types/database";

type UpdateCompanyResult =
  | { data: Company; error: null }
  | { data: null; error: { message: string } };

export async function updateCompanyRecord(
  companyId: string,
  payload: CompanyUpdate
): Promise<UpdateCompanyResult> {
  const supabase = createClient();

  // Cast necessário: tipagem do cliente Supabase pode inferir Update como never
  // quando o schema local cresce além do gerado automaticamente.
  const { data, error } = await supabase
    .from("companies")
    .update(payload as never)
    .eq("id", companyId)
    .select("*")
    .single();

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  return { data: data as Company, error: null };
}

export async function uploadCompanyLogo(
  companyId: string,
  file: File,
  bucket: string
): Promise<{ publicUrl: string | null; error: string | null }> {
  const supabase = createClient();
  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${companyId}/logo-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
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
  } = supabase.storage.from(bucket).getPublicUrl(path);

  return { publicUrl, error: null };
}
