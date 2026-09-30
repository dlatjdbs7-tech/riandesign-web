"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { classifyTrafficSource } from "@/lib/trafficSource";

const VISITOR_COOKIE = "visitor_id";

// 로그인 없는 방문자를 쿠키 기반 익명 id로 구분해 총 방문/순방문 집계에 쓴다.
async function ensureVisitorId() {
  const cookieStore = await cookies();
  let visitorId = cookieStore.get(VISITOR_COOKIE)?.value;
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    cookieStore.set(VISITOR_COOKIE, visitorId, {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
    });
  }
  return visitorId;
}

export async function logPageView(path: string, referrerHost: string | null, utmSource: string | null) {
  const visitorId = await ensureVisitorId();
  const supabase = await createClient();
  await supabase.from("page_views").insert({
    visitor_id: visitorId,
    path,
    referrer_host: referrerHost || null,
    utm_source: utmSource || null,
  });
}

// 포트폴리오 카드를 열어본 것도 페이지 이동은 아니지만 조회로 기록한다.
// path에 "#"을 넣어 실제 페이지 이동(인기 페이지 집계)과 구분한다.
export async function logPortfolioView(itemId: string) {
  const visitorId = await ensureVisitorId();
  const supabase = await createClient();
  await supabase.from("page_views").insert({ visitor_id: visitorId, path: `/project#${itemId}` });
}

// 상담문의를 넣은 이 방문자가 애초에 어느 채널(블로그·인스타·유튜브·홈페이지 등)로
// 들어왔는지, 방문 기록(page_views) 중 가장 최근 실제 페이지 이동에서 역추적한다.
// 고객이 상담폼에서 직접 고르는 referral_source와는 별개로, 자동 감지된 값을 보조로 남긴다.
async function detectVisitorSource(supabase: Awaited<ReturnType<typeof createClient>>) {
  const cookieStore = await cookies();
  const visitorId = cookieStore.get(VISITOR_COOKIE)?.value;
  if (!visitorId) return null;

  // 최근이 아니라 "가장 처음" 방문 기록을 쓴다 — 이후 새 탭/새로고침으로 referrer가
  // 비어버려도 최초 유입 경로가 덮어써지지 않게 하기 위함.
  const { data } = await supabase
    .from("page_views")
    .select("referrer_host, utm_source")
    .eq("visitor_id", visitorId)
    .not("path", "like", "%#%")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return classifyTrafficSource(data);
}

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  // Server Action을 <form action>이 아니라 클라이언트에서 함수처럼 직접 호출하면
  // Next.js가 파일을 역직렬화한 객체가 서버 런타임의 File 클래스와 instanceof로
  // 일치하지 않을 수 있어, size/name/arrayBuffer 존재 여부로 덕타이핑 검사한다.
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    typeof (value as File).arrayBuffer === "function" &&
    typeof (value as File).size === "number"
  );
}

async function uploadInquiryFile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData,
  field: string
): Promise<string | null> {
  const file = formData.get(field);
  if (!isUploadedFile(file) || file.size === 0) return null;

  // Supabase Storage 오브젝트 키는 비-ASCII 문자(한글 등)를 거부하므로 안전한 키로 치환한다.
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from("inquiry-files").upload(path, file);
  if (error) return null;

  return supabase.storage.from("inquiry-files").getPublicUrl(path).data.publicUrl;
}

export async function submitInquiry(formData: FormData) {
  // 허니팟: 사람 눈에는 안 보이는 필드라 봇만 채워서 제출함. 채워져 있으면 조용히 성공 처리하고 무시한다.
  if (String(formData.get("website") ?? "").trim()) {
    return { success: true };
  }

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!name || !phone) {
    return { error: "이름과 연락처를 입력해주세요." };
  }

  const supabase = await createClient();

  const [floorPlanUrl, referenceUrl, autoSource] = await Promise.all([
    uploadInquiryFile(supabase, formData, "floor_plan"),
    uploadInquiryFile(supabase, formData, "reference"),
    detectVisitorSource(supabase),
  ]);

  const { error } = await supabase.from("inquiries").insert({
    name,
    phone,
    message: String(formData.get("message") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    size_py: String(formData.get("size_py") ?? "").trim() || null,
    floor_plan_type: String(formData.get("floor_plan_type") ?? "").trim() || null,
    budget: String(formData.get("budget") ?? "").trim() || null,
    construction_date: String(formData.get("construction_date") ?? "").trim() || null,
    move_in_date: String(formData.get("move_in_date") ?? "").trim() || null,
    visit_date: String(formData.get("visit_date") ?? "").trim() || null,
    visit_time: String(formData.get("visit_time") ?? "").trim() || null,
    family_members: String(formData.get("family_members") ?? "").trim() || null,
    pets: formData.getAll("pets").map(String),
    space_type: String(formData.get("space_type") ?? "").trim() || null,
    construction_items: formData.getAll("construction_items").map(String),
    referral_source: String(formData.get("referral_source") ?? "").trim() || null,
    floor_plan_url: floorPlanUrl,
    reference_url: referenceUrl,
    portfolio_url: String(formData.get("portfolio_url") ?? "").trim() || null,
    auto_source: autoSource,
  });

  if (error) {
    return { error: "접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." };
  }

  return { success: true };
}
