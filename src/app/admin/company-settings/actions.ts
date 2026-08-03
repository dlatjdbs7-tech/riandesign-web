"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function updateCompanySettings(formData: FormData) {
  const supabase = await createClient();

  await supabase
    .from("company_settings")
    .update({
      company_name: String(formData.get("company_name") ?? "").trim() || null,
      business_registration_number:
        String(formData.get("business_registration_number") ?? "").trim() || null,
      representative_name: String(formData.get("representative_name") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      blog_url: String(formData.get("blog_url") ?? "").trim() || null,
      instagram_url: String(formData.get("instagram_url") ?? "").trim() || null,
      youtube_url: String(formData.get("youtube_url") ?? "").trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  revalidatePath("/admin/company-settings");
}
