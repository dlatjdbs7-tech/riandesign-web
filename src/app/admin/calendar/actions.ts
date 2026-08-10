"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function createScheduleEvent(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const eventDate = String(formData.get("event_date") ?? "");
  if (!title || !eventDate) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("calendar_events").insert({
    title,
    event_date: eventDate,
    memo: String(formData.get("memo") ?? "").trim() || null,
    created_by: user.id,
  });

  revalidatePath("/admin/calendar");
}

export async function deleteScheduleEvent(id: string) {
  const supabase = await createClient();
  await supabase.from("calendar_events").delete().eq("id", id);
  revalidatePath("/admin/calendar");
}
