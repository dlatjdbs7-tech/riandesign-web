"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { restoreTrashItem } from "@/lib/trash";

// 되돌리기: 휴지통에서 원래 자리로 복구하고 관리자 화면 전체를 새로 그린다.
export async function restoreFromTrash(trashId: string) {
  const supabase = await createClient();
  const result = await restoreTrashItem(supabase, trashId);
  revalidatePath("/admin", "layout");
  return result;
}

// 완전 삭제: 휴지통에서 하나를 영영 지운다 (되돌릴 수 없음)
export async function purgeTrashItem(trashId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("deleted_items").delete().eq("id", trashId);
  revalidatePath("/admin/trash");
  return error ? { error: "삭제하지 못했습니다." } : { ok: true as const };
}

// 휴지통 비우기: 볼 수 있는 항목을 모두 영영 지운다 (대표·팀장은 전체, 직원은 본인이 지운 것만 — DB 권한이 막아 줌)
export async function emptyTrash() {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("deleted_items")
    .delete({ count: "exact" })
    .not("id", "is", null);
  revalidatePath("/admin/trash");
  return error ? { error: "비우지 못했습니다." } : { ok: true as const, count: count ?? 0 };
}
