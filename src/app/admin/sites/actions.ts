"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

function revalidatePipeline() {
  revalidatePath("/admin/sites");
  revalidatePath("/admin/inquiries");
  revalidatePath("/admin/analytics");
}

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

  revalidatePipeline();
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

  revalidatePipeline();
  redirect("/admin/sites");
}

export async function promoteLeadToNew(inquiryId: string) {
  const supabase = await createClient();
  await supabase.from("inquiries").update({ status: "new" }).eq("id", inquiryId);
  revalidatePipeline();
}

export async function revertNewToLead(inquiryId: string) {
  const supabase = await createClient();
  await supabase.from("inquiries").update({ status: "lead" }).eq("id", inquiryId);
  revalidatePipeline();
}

export async function promoteNewToContacted(inquiryId: string) {
  const supabase = await createClient();
  await supabase.from("inquiries").update({ status: "contacted" }).eq("id", inquiryId);
  revalidatePipeline();
}

export async function revertContactedToNew(inquiryId: string) {
  const supabase = await createClient();
  await supabase.from("inquiries").update({ status: "new" }).eq("id", inquiryId);
  revalidatePipeline();
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

  // 아파트/평형/성함/연락처/예산은 연결된 문의(inquiry_id)에서 그대로 조회해 보여주므로,
  // 메모는 상담 중 남긴 실제 내용만 옮겨서 순수 메모칸으로 비워둔다.
  await supabase.from("quotes").insert({
    title: inquiry.address || inquiry.name,
    inquiry_id: inquiry.id,
    amount: null,
    status: "sent",
    memo: inquiry.message?.trim() || null,
    created_by: user?.id,
  });

  await supabase.from("inquiries").update({ status: "quoted" }).eq("id", inquiryId);

  revalidatePipeline();
}

export async function revertQuoteToContacted(quoteId: string, inquiryId: string) {
  const supabase = await createClient();

  if (inquiryId) {
    await supabase.from("inquiries").update({ status: "contacted" }).eq("id", inquiryId);
  } else {
    // 견적이 문의 파이프라인을 거치지 않고 직접 등록된 경우, 삭제 전 내용을 새 문의로 복원해 데이터가 사라지지 않게 한다.
    const { data: quote } = await supabase.from("quotes").select("*").eq("id", quoteId).single();
    if (quote) {
      await supabase.from("inquiries").insert({
        name: "미정",
        address: quote.title,
        message: quote.memo,
        budget: quote.amount ? String(quote.amount) : null,
        status: "contacted",
      });
    }
  }

  await supabase.from("quotes").delete().eq("id", quoteId);
  revalidatePipeline();
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

export async function updateInquiryMessage(inquiryId: string, value: string) {
  await updateInquiryField(inquiryId, "message", value);
}

export async function updateQuoteMemo(quoteId: string, memo: string) {
  const supabase = await createClient();
  await supabase
    .from("quotes")
    .update({ memo: memo.trim() || null })
    .eq("id", quoteId);
  revalidatePath("/admin/sites");
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
    quote_id: quote.id,
    contract_amount: quote.amount,
    schedule_notes: quote.memo,
    status: "pending",
    created_by: user?.id,
  });

  revalidatePipeline();
  revalidatePath("/admin/quotes");
}

export async function revertWorkOrderToQuote(workOrderId: string, quoteId: string) {
  const supabase = await createClient();

  if (quoteId) {
    await supabase.from("quotes").update({ status: "sent" }).eq("id", quoteId);
  } else {
    // 계약이 견적 파이프라인을 거치지 않고 직접 등록된 경우, 삭제 전 내용을 새 견적으로 복원해 데이터가 사라지지 않게 한다.
    const { data: order } = await supabase.from("work_orders").select("*").eq("id", workOrderId).single();
    if (order) {
      await supabase.from("quotes").insert({
        title: order.title,
        customer_id: order.customer_id,
        amount: order.contract_amount,
        memo: order.schedule_notes,
        status: "sent",
      });
    }
  }

  await supabase.from("work_orders").delete().eq("id", workOrderId);
  revalidatePipeline();
  revalidatePath("/admin/quotes");
}
