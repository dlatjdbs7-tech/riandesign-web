"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { distanceInMeters } from "@/lib/geo";
import type { WorkSite } from "@/lib/types";

export async function checkIn(lat: number, lng: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const { data: openRecord } = await supabase
    .from("attendance_records")
    .select("id")
    .eq("user_id", user.id)
    .is("check_out_at", null)
    .maybeSingle();

  if (openRecord) return { error: "이미 출근 처리되어 있습니다." };

  const { data: sites } = await supabase.from("work_sites").select("*").returns<WorkSite[]>();

  const matched = (sites ?? [])
    .map((site) => ({
      site,
      distance: distanceInMeters(lat, lng, site.latitude, site.longitude),
    }))
    .filter((entry) => entry.distance <= entry.site.radius_meters)
    .sort((a, b) => a.distance - b.distance)[0];

  if (!matched) return { error: "등록된 근무지 반경 밖입니다." };

  const { error } = await supabase.from("attendance_records").insert({
    user_id: user.id,
    work_site_id: matched.site.id,
    check_in_at: new Date().toISOString(),
    check_in_lat: lat,
    check_in_lng: lng,
  });

  if (error) return { error: "출근 기록에 실패했습니다." };

  revalidatePath("/admin/attendance");
  return { success: true, siteName: matched.site.name };
}

export async function checkOut(lat: number, lng: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const { data: openRecord } = await supabase
    .from("attendance_records")
    .select("id")
    .eq("user_id", user.id)
    .is("check_out_at", null)
    .order("check_in_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!openRecord) return { error: "출근 기록이 없습니다." };

  const { error } = await supabase
    .from("attendance_records")
    .update({
      check_out_at: new Date().toISOString(),
      check_out_lat: lat,
      check_out_lng: lng,
    })
    .eq("id", openRecord.id);

  if (error) return { error: "퇴근 기록에 실패했습니다." };

  revalidatePath("/admin/attendance");
  return { success: true };
}
