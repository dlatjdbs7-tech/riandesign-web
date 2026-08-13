"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function createInquiry(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim() || "미정";
  const phone = String(formData.get("phone") ?? "").trim();
  const inquiryDate = String(formData.get("inquiry_date") ?? "").trim();

  const supabase = await createClient();
  await supabase.from("inquiries").insert({
    name,
    phone: phone || null,
    message: String(formData.get("message") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    size_py: String(formData.get("size_py") ?? "").trim() || null,
    budget: String(formData.get("budget") ?? "").trim() || null,
    referral_source: String(formData.get("referral_source") ?? "").trim() || null,
    status: "new",
    ...(inquiryDate ? { created_at: new Date(`${inquiryDate}T12:00:00+09:00`).toISOString() } : {}),
  });

  revalidatePath("/admin/sites");
  revalidatePath("/admin/inquiries");
  revalidatePath("/admin/analytics");
  redirect("/admin/sites");
}

export async function createLeadInquiry(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim() || "미정";
  const phone = String(formData.get("phone") ?? "").trim();
  const supabase = await createClient();
  await supabase.from("inquiries").insert({
    name,
    phone: phone || null,
    message: String(formData.get("message") ?? "").trim() || null,
    budget: String(formData.get("budget") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    size_py: String(formData.get("size_py") ?? "").trim() || null,
    floor_plan_type: String(formData.get("floor_plan_type") ?? "").trim() || null,
    status: "lead",
  });

  revalidatePath("/admin/sites");
  revalidatePath("/admin/inquiries");
  revalidatePath("/admin/analytics");
  redirect("/admin/sites");
}

export async function promoteLeadToNew(inquiryId: string) {
  const supabase = await createClient();
  await supabase.from("inquiries").update({ status: "new" }).eq("id", inquiryId);

  revalidatePath("/admin/sites");
  revalidatePath("/admin/inquiries");
  revalidatePath("/admin/analytics");
}

export async function promoteNewToContacted(inquiryId: string) {
  const supabase = await createClient();
  await supabase.from("inquiries").update({ status: "contacted" }).eq("id", inquiryId);

  revalidatePath("/admin/sites");
  revalidatePath("/admin/inquiries");
  revalidatePath("/admin/analytics");
}

export async function toggleConsultStep(inquiryId: string, step: 1 | 2) {
  const supabase = await createClient();
  const field = step === 1 ? "consulted_1" : "consulted_2";
  const { data: inquiry } = await supabase.from("inquiries").select(field).eq("id", inquiryId).single();
  if (!inquiry) return;

  await supabase
    .from("inquiries")
    .update({ [field]: !inquiry[field as keyof typeof inquiry] })
    .eq("id", inquiryId);

  revalidatePath("/admin/sites");
}

export async function promoteContactedToQuote(inquiryId: string) {
  const supabase = await createClient();
  const { data: inquiry } = await supabase.from("inquiries").select("*").eq("id", inquiryId).single();
  if (!inquiry) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("quotes").insert({
    title: inquiry.address || inquiry.name,
    amount: null,
    status: "sent",
    memo: [inquiry.name, inquiry.phone, inquiry.message].filter(Boolean).join(" · ") || null,
    created_by: user?.id,
  });

  await supabase.from("inquiries").update({ status: "quoted" }).eq("id", inquiryId);

  revalidatePath("/admin/sites");
  revalidatePath("/admin/inquiries");
  revalidatePath("/admin/analytics");
}

export async function updateInquiryField(
  inquiryId: string,
  field: "name" | "address" | "size_py" | "floor_plan_type" | "phone" | "budget" | "message",
  value: string
) {
  const trimmed = value.trim();
  const requiredFields = ["name", "phone"];
  if (requiredFields.includes(field) && !trimmed) return;

  const supabase = await createClient();
  await supabase
    .from("inquiries")
    .update({ [field]: requiredFields.includes(field) ? trimmed : trimmed || null })
    .eq("id", inquiryId);

  revalidatePath("/admin/sites");
  revalidatePath("/admin/inquiries");
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
