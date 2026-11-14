import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { calcEstimate, toKoreanAmount, won } from "@/lib/estimate";
import EstimateDocument, { type DocCompany, type DocEstimate, type DocLine } from "@/components/admin/estimate/EstimateDocument";
import ApproveEstimate from "./ApproveEstimate";
import PinGate from "./PinGate";
import NoCopy from "./NoCopy";
import { readPin } from "./actions";

// 고객용 견적서 링크
//  - 보낸 날부터 3일만 열람 (DB share_expires_at)
//  - 전화번호 뒤 4자리를 입력해야 열람
//  - 인쇄·저장·복사 막기, 검색 노출 안 함
export const metadata: Metadata = { title: "견적서", robots: { index: false, follow: false } };

type Shared = {
  estimate: DocEstimate & { status: string; approved_name: string | null; approved_at: string | null; share_expires_at: string | null };
  lines: DocLine[];
  company: DocCompany;
};

function Closed({ phone, companyName }: { phone: string | null; companyName: string | null }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 px-5">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 text-center shadow-sm">
        <p className="text-sm font-bold tracking-[0.25em]">REAN DESIGN</p>
        <h1 className="mt-4 text-xl font-bold">열람 기간이 끝났습니다</h1>
        <p className="mt-2 text-sm text-charcoal/60">견적서 링크는 받은 날부터 3일 동안만 열람할 수 있습니다. 다시 보시려면 담당자에게 연락해 주세요.</p>
        {phone && (
          <p className="mt-4 text-lg font-bold">
            {companyName ?? "리안디자인"} {phone}
          </p>
        )}
      </div>
    </div>
  );
}

export default async function SharedEstimatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();

  const supabase = await createClient();
  const pin = await readPin(token);
  const { data: status } = await supabase.rpc("check_shared_estimate", { p_token: token, p_phone: pin ?? "" });
  if (status === "not_found") notFound();
  if (status === "expired" || status === "not_sent") {
    const { data: contact } = await supabase.rpc("shared_estimate_contact");
    const c = contact as { company_name: string | null; phone: string | null } | null;
    return <Closed phone={c?.phone ?? null} companyName={c?.company_name ?? null} />;
  }
  if (status !== "ok" || !pin) return <PinGate token={token} customerHint="고객님" />;

  const { data } = await supabase.rpc("get_shared_estimate", { p_token: token, p_phone: pin });
  const shared = data as Shared | null;
  if (!shared?.estimate) return <PinGate token={token} customerHint="고객님" />;

  // 직원이 확인하려고 연 것은 열람 기록에 넣지 않는다
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) await supabase.rpc("mark_estimate_viewed", { p_token: token, p_phone: pin });

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
  const customer = e.customer_name ? `${e.customer_name} 고객님` : "고객님";
  const expires = e.share_expires_at
    ? new Date(e.share_expires_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <NoCopy watermark={`${customer} 전용 · ${companyName}`}>
      <div className="min-h-screen bg-stone-100 pb-16">
        <header className="border-b border-nude/60 bg-white">
          <div className="mx-auto flex max-w-[860px] items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-bold tracking-[0.25em]">REAN DESIGN</p>
              <p className="text-xs text-charcoal/50">{companyName} 견적서</p>
            </div>
            {expires && <p className="text-right text-xs text-charcoal/50">{expires}까지 열람 가능</p>}
          </div>
        </header>

        <div className="mx-auto max-w-[860px] px-5 pt-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-charcoal/50">{customer} 견적서</p>
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
            <p className="mt-4 text-xs text-charcoal/45">아래에서 갑지·집계표·상세 내역서를 확인하실 수 있습니다. 견적서는 이 화면에서만 열람할 수 있습니다.</p>
          </div>
        </div>

        <div className="mx-auto mt-6 max-w-[900px] px-2">
          <EstimateDocument estimate={e} lines={shared.lines} company={shared.company} showCover={false} />
        </div>

        <div className="mx-auto mt-6 max-w-[860px] px-5">
          <ApproveEstimate token={token} approvedName={e.approved_name} approvedAt={e.approved_at} companyPhone={shared.company?.phone ?? null} />
        </div>
      </div>
    </NoCopy>
  );
}
