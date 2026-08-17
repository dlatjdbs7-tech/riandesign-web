"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getKSTDateBounds } from "@/lib/date";

export async function upsertWeeklyWorkLog(weekStartDate: string, formData: FormData) {
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { todayDateString } = getKSTDateBounds();

  await supabase.from("work_logs").upsert(
    {
      author_id: user.id,
      week_start_date: weekStartDate,
      log_date: todayDateString,
      content,
    },
    { onConflict: "author_id,week_start_date" }
  );

  revalidatePath("/admin/work-logs");
}
