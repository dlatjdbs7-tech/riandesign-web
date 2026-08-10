"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { TransactionStatus } from "@/lib/types";

export async function createTransaction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let attachmentUrl: string | null = null;
  let attachmentName: string | null = null;

  const file = formData.get("attachment");
  if (file instanceof File && file.size > 0) {
    const path = `${user?.id ?? "anon"}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("transaction-files").upload(path, file);
    if (!error) {
      attachmentUrl = supabase.storage.from("transaction-files").getPublicUrl(path).data.publicUrl;
      attachmentName = file.name;
    }
  }

  await supabase.from("transactions").insert({
    title,
    customer_id: String(formData.get("customer_id") ?? "") || null,
    amount: Number(formData.get("amount")) || 0,
    transaction_date:
      String(formData.get("transaction_date") ?? "") || new Date().toISOString().slice(0, 10),
    memo: String(formData.get("memo") ?? "").trim() || null,
    attachment_url: attachmentUrl,
    attachment_name: attachmentName,
    created_by: user?.id,
  });

  revalidatePath("/admin/transactions");
}

export async function updateTransactionStatus(id: string, status: TransactionStatus) {
  const supabase = await createClient();
  await supabase.from("transactions").update({ status }).eq("id", id);
  revalidatePath("/admin/transactions");
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient();
  await supabase.from("transactions").delete().eq("id", id);
  revalidatePath("/admin/transactions");
}
