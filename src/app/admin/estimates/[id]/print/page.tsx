import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { Estimate, EstimateLine } from "@/lib/estimate";
import EstimateDocument, { type DocCompany } from "@/components/admin/estimate/EstimateDocument";
import PrintButton from "@/components/admin/estimate/PrintButton";
import { PRINT_CSS } from "@/components/admin/estimate/printCss";

// 견적서 보기 (목록에서 누르면 열림): 표지~내역서 전체. 인쇄에서 "PDF로 저장"을 고르면 PDF가 된다.
export default async function EstimatePrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ detail?: string; cover?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const showDetail = sp.detail !== "0";
  const showCover = sp.cover !== "0";

  const supabase = await createClient();
  const [{ data: estimate }, { data: lines }, { data: company }] = await Promise.all([
    supabase.from("estimates").select("*").eq("id", id).maybeSingle<Estimate>(),
    supabase.from("estimate_lines").select("*").eq("estimate_id", id).order("sort_order").returns<EstimateLine[]>(),
    supabase.from("company_settings").select("*").order("id").limit(1).maybeSingle<NonNullable<DocCompany>>(),
  ]);
  if (!estimate) notFound();

  const toggle = (key: "detail" | "cover", on: boolean) => {
    const q = new URLSearchParams();
    if (key === "detail" ? !on : !showDetail) q.set("detail", "0");
    if (key === "cover" ? !on : !showCover) q.set("cover", "0");
    const s = q.toString();
    return `/admin/estimates/${id}/print${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <style>{PRINT_CSS}</style>
      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        <Link href="/admin/estimates" className="text-sm text-charcoal/50 hover:text-orange-600">
          ← 견적서 목록
        </Link>
        <Link href={`/admin/estimates/${id}`} className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">
          편집하기
        </Link>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Link href={toggle("cover", !showCover)} className="rounded-full border border-nude bg-white px-4 py-2 text-sm text-charcoal/70 hover:bg-stone-100">
            표지 {showCover ? "빼기" : "넣기"}
          </Link>
          <Link href={toggle("detail", !showDetail)} className="rounded-full border border-nude bg-white px-4 py-2 text-sm text-charcoal/70 hover:bg-stone-100">
            내역서 {showDetail ? "빼기" : "넣기"}
          </Link>
          <a
            href={`/admin/estimates/${id}/excel`}
            download
            className="rounded-full border border-emerald-300 bg-white px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
          >
            엑셀 내려받기
          </a>
          <PrintButton />
        </div>
      </div>
      <EstimateDocument estimate={estimate} lines={lines ?? []} company={company ?? null} showCover={showCover} showDetail={showDetail} />
    </div>
  );
}
