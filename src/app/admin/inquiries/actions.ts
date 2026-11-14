"use server";

import { moveToTrash } from "@/lib/trash";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { InquiryStatus } from "@/lib/types";

export async function updateInquiryStatus(id: string, status: InquiryStatus) {
  const supabase = await createClient();
  await supabase.from("inquiries").update({ status }).eq("id", id);
  revalidatePath("/admin/inquiries");
}

export async function deleteInquiry(id: string) {
  const supabase = await createClient();
  const trashed = await moveToTrash(supabase, "inquiries", id);
  revalidatePath("/admin/inquiries");
  return trashed;
}
