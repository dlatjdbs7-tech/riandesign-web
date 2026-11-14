import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { calcEstimate, toKoreanAmount, won } from "@/lib/estimate";
import EstimateDocument, { type DocCompany, type DocEstimate, type DocLine } from "@/components/admin/estimate/EstimateDocument";
import PrintButton from "@/components/admin/estimate/PrintButton";
import { PRINT_CSS } from "@/components/admin/estimate/printCss";
import ApproveEstimate from "./ApproveEstimate";

// 고객용 견적서 링크: 로그인 없이 토큰 주소로 열람·승인한다. 검색에는 나오지 않게 한다.
export const metadata: Metadata = { title: "견적서 | 리안디자인", robots: { index: false, follow: false } };

type Shared = {
  estimate: DocEstimate & { status: string; approved_name: string | null; approved_at: string | null };
  lines: DocLine[];
  company: DocCompany;
};

export default async function SharedEstimatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_shared_estimate", { p_token: token });
  const shared = data as Shared | null;
  if (!shared?.estimate) notFound();

  // 직원이 확인하려고 연 것은 열람 기록에 넣지 않는다
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) await supabase.rpc("mark_estimate_viewed", { p_token: token });

  const e = shared.estimate;
  const s = calcEstimate(
    shared.lines.map((l) => ({ ...l, qty: Number(l.qty), material_price: Number(l.material_price), labor_price: Number(l.labor_price) })),
    {
      expense: Number(e.expense_rate),
      misc: Number(e.misc_rate),
      profit: Number(e.profit_rate),
      vat: Number(e.vat_rate),
      vatIncluded: e.vat_included,
      roundUnit: e.round_unit,
    }
  );
  const companyName = shared.company?.company_name ?? "리안디자인";

  return (
    <div className="min-h-screen bg-stone-100 pb-16">
      <style>{PRINT_CSS}</style>
      <header className="no-print border-b border-nude/60 bg-white">
        <div className="mx-auto flex max-w-[860px] items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-bold tracking-[0.25em]">REAN DESIGN</p>
            <p className="text-xs text-charcoal/50">{companyName} 견적서</p>
          </div>
          <PrintButton label="PDF 저장" />
        </div>
      </header>

      <div className="no-print mx-auto max-w-[860px] px-5 pt-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-charcoal/50">{e.customer_name ? `${e.customer_name} 고객님` : "고객님"} 견적서</p>
          <h1 className="mt-1 text-xl font-bold">{e.title}</h1>
          <div className="mt-5 rounded-xl bg-orange-50 px-5 py-4">
            <p className="text-xs text-orange-800/70">공사 금액 {e.vat_included ? `(부가세 ${e.vat_rate}% 포함)` : "(부가세 별도)"}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-orange-700">{won(s.final)}원</p>
            <p className="mt-1 text-sm text-orange-900/70">일금 {toKoreanAmount(s.final)}원정</p>
          </div>
          <ul className="mt-4 grid gap-1.5 text-sm sm:grid-cols-2">
            {s.categories.map((c) => (
              <li key={c.key} className="flex justify-between gap-3 border-b border-nude/40 py-1.5">
                <span className="text-charcoal/70">{c.label}</span>
                <span className="tabular-nums">{won(c.total)}원</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-charcoal/45">아래에서 갑지·집계표·상세 내역서를 확인하실 수 있습니다.</p>
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-[900px] px-2">
        <EstimateDocument estimate={e} lines={shared.lines} company={shared.company} showCover={false} />
      </div>

      <div className="no-print mx-auto mt-6 max-w-[860px] px-5">
        <ApproveEstimate token={token} approvedName={e.approved_name} approvedAt={e.approved_at} companyPhone={shared.company?.phone ?? null} />
      </div>
    </div>
  );
}
