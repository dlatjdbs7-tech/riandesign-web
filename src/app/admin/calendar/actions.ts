"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAsRequest } from "../as-requests/actions";
import { createTodo } from "../todos/actions";

const CALENDAR_CATEGORIES = ["미팅", "수금", "행사", "촬영"] as const;

// 팝업의 "일정 추가"는 카테고리에 따라 실제로 관리하는 시스템에 등록한다.
// A/S와 할일은 각자의 관리 페이지(AS관리/할일)에 그대로 등록돼야 캘린더에만 있는
// 별개의 사본이 생기지 않는다. 나머지(미팅/수금/행사/촬영)는 캘린더 전용 항목이라
// calendar_events에 직접 저장한다.
export async function createScheduleItem(formData: FormData) {
  const category = String(formData.get("category") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const eventDate = String(formData.get("event_date") ?? "").trim();
  if (!title || !eventDate) return;

  if (category === "A/S") {
    const asForm = new FormData();
    asForm.set("title", title);
    asForm.set("request_date", eventDate);
    const siteName = String(formData.get("site_name") ?? "").trim();
    if (siteName) asForm.set("address", siteName);
    await createAsRequest(asForm);
    revalidatePath("/admin/calendar");
    return;
  }

  if (category === "할일") {
    const todoForm = new FormData();
    todoForm.set("title", title);
    todoForm.set("due_date", eventDate);
    await createTodo(todoForm);
    revalidatePath("/admin/calendar");
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("calendar_events").insert({
    title,
    event_date: eventDate,
    category: (CALENDAR_CATEGORIES as readonly string[]).includes(category) ? category : "행사",
    meeting_type: category === "미팅" ? String(formData.get("meeting_type") ?? "").trim() || null : null,
    event_time: String(formData.get("event_time") ?? "").trim() || null,
    site_name: String(formData.get("site_name") ?? "").trim() || null,
    team: String(formData.get("team") ?? "").trim() || null,
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
