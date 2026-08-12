"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function updateSiteContent(formData: FormData) {
  const supabase = await createClient();

  await supabase
    .from("site_content")
    .update({
      hero_tagline: String(formData.get("hero_tagline") ?? "").trim() || null,
      hero_headline: String(formData.get("hero_headline") ?? "").trim() || null,
      hero_description: String(formData.get("hero_description") ?? "").trim() || null,
      about_title: String(formData.get("about_title") ?? "").trim() || null,
      about_paragraph_1: String(formData.get("about_paragraph_1") ?? "").trim() || null,
      about_paragraph_2: String(formData.get("about_paragraph_2") ?? "").trim() || null,
      about_stat_projects: String(formData.get("about_stat_projects") ?? "").trim() || null,
      about_stat_region: String(formData.get("about_stat_region") ?? "").trim() || null,
      about_stat_focus: String(formData.get("about_stat_focus") ?? "").trim() || null,
      about_image_url: String(formData.get("about_image_url") ?? "").trim() || null,
      about_naming_story: String(formData.get("about_naming_story") ?? "").trim() || null,
      process_intro: String(formData.get("process_intro") ?? "").trim() || null,
      contact_notice: String(formData.get("contact_notice") ?? "").trim() || null,
      contact_image_url: String(formData.get("contact_image_url") ?? "").trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  revalidatePath("/admin/site-management");
  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/process");
  revalidatePath("/contact");
}

export async function createService(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const supabase = await createClient();
  await supabase.from("services").insert({
    title,
    description: String(formData.get("description") ?? "").trim() || null,
    display_order: Number(formData.get("display_order")) || 0,
  });

  revalidatePath("/admin/site-management");
  revalidatePath("/");
}

export async function deleteService(id: string) {
  const supabase = await createClient();
  await supabase.from("services").delete().eq("id", id);
  revalidatePath("/admin/site-management");
  revalidatePath("/");
}
