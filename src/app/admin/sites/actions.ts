"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function createInquiry(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!name || !phone) return;

  const supabase = await createClient();
  await supabase.from("inquiries").insert({
    name,
    phone,
    message: String(formData.get("message") ?? "").trim() || null,
    size_py: String(formData.get("size_py") ?? "").trim() || null,
    budget: String(formData.get("budget") ?? "").trim() || null,
    referral_source: String(formData.get("referral_source") ?? "").trim() || null,
    status: "new",
  });

  revalidatePath("/admin/sites");
  revalidatePath("/admin/inquiries");
  revalidatePath("/admin/analytics");
  redirect("/admin/sites");
}

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
