"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function createWorkSite(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const latitude = Number(formData.get("latitude"));
  const longitude = Number(formData.get("longitude"));
  const radiusMeters = Number(formData.get("radius_meters")) || 200;

  if (!name || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("work_sites").insert({
    name,
    address: address || null,
    latitude,
    longitude,
    radius_meters: radiusMeters,
    created_by: user?.id,
  });

  revalidatePath("/admin/work-sites");
}

export async function deleteWorkSite(id: string) {
  const supabase = await createClient();
  await supabase.from("work_sites").delete().eq("id", id);
  revalidatePath("/admin/work-sites");
}
