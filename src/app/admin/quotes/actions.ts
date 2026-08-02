"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { QuoteStatus } from "@/lib/types";

export async function createQuote(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("quotes").insert({
    title,
    customer_id: String(formData.get("customer_id") ?? "") || null,
    amount: Number(formData.get("amount")) || null,
    quote_date: String(formData.get("quote_date") ?? "") || new Date().toISOString().slice(0, 10),
    memo: String(formData.get("memo") ?? "").trim() || null,
    created_by: user?.id,
  });

  revalidatePath("/admin/quotes");
}

export async function updateQuoteStatus(id: string, status: QuoteStatus) {
  const supabase = await createClient();
  await supabase.from("quotes").update({ status }).eq("id", id);
  revalidatePath("/admin/quotes");
}

export async function deleteQuote(id: string) {
  const supabase = await createClient();
  await supabase.from("quotes").delete().eq("id", id);
  revalidatePath("/admin/quotes");
}
