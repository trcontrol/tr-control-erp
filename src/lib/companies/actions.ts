import { createClient } from "@/lib/supabase/client";

/**
 * Upload de logo (Storage). A gravação de logo_url em companies
 * deve passar por updateCompanySettingsAction (settings.edit).
 */
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
