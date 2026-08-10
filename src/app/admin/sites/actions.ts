"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function promoteQuoteToWorkOrder(quoteId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: quote } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .single();

  if (!quote) return;

  await supabase.from("quotes").update({ status: "accepted" }).eq("id", quoteId);

  await supabase.from("work_orders").insert({
    title: quote.title,
    customer_id: quote.customer_id,
    contract_amount: quote.amount,
    status: "pending",
    created_by: user?.id,
  });

  revalidatePath("/admin/sites");
  revalidatePath("/admin/quotes");
}
