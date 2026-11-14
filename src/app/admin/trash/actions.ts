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
