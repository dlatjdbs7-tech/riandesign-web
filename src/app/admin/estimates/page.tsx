import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { KIND_LABEL, STATUS_LABEL, won, type Estimate } from "@/lib/estimate";
import { createEstimate, deleteEstimate } from "./actions";
import DeleteButton from "@/components/admin/DeleteButton";

export default async function EstimatesPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const params = await searchParams;
  const newKind = params.new === "simple" || params.new === "detail" ? params.new : null;

  const supabase = await createClient();
  const [{ data: estimates }, { count: itemCount }] = await Promise.all([
    supabase.from("estimates").select("*").order("created_at", { ascending: false }).returns<Estimate[]>(),
    supabase.from("estimate_items").select("*", { count: "exact", head: true }),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-charcoal">견적서</h1>
          <p className="mt-1 text-sm text-charcoal/50">
            품목을 체크하며 견적을 만듭니다 · 품목 라이브러리 {itemCount ?? 0}개
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/estimates/items"
            className="rounded-full border border-nude bg-white px-5 py-2 text-sm text-charcoal/70 hover:bg-stone-100"
          >
            품목 관리
          </Link>
          <Link
            href="/admin/estimates?new=detail"
            className="rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            + 상세 견적
          </Link>
          <Link
            href="/admin/estimates?new=simple"
            className="rounded-full border border-orange-300 bg-white px-5 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-50"
          >
            + 간단 견적 (1억 미만)
          </Link>
        </div>
      </div>

      {newKind && (
        <form action={createEstimate} className="mt-6 rounded-xl border-2 border-orange-200 bg-white p-5">
          <input type="hidden" name="kind" value={newKind} />
          <p className="text-sm font-semibold text-charcoal">{KIND_LABEL[newKind]} 만들기</p>
          <p className="mt-1 text-xs text-charcoal/50">
            {newKind === "simple"
              ? "평수를 넣으면 기본 품목 69개가 평수에 맞춰 미리 체크됩니다. 간접비 없이 부가세 별도로 계산합니다."
              : "나릿재 견적서와 같은 상세 양식입니다. 경비 2% · 공과잡비 3% · 기업이윤 5% · 부가세 10% 포함."}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_120px_auto]">
            <input
              name="title"
              required
              placeholder="공사명 (현장 주소)"
              className="rounded-lg border border-nude px-3 py-2 text-sm outline-none focus:border-orange-400"
            />
            <input
              name="customer_name"
              placeholder="고객명"
              className="rounded-lg border border-nude px-3 py-2 text-sm outline-none focus:border-orange-400"
            />
            <input
              name="area_py"
              inputMode="decimal"
              placeholder="평수"
              className="rounded-lg border border-nude px-3 py-2 text-sm outline-none focus:border-orange-400"
            />
            <div className="flex gap-2">
              <button type="submit" className="rounded-lg bg-charcoal px-5 py-2 text-sm font-semibold text-cream hover:bg-charcoal/85">
                만들기
              </button>
              <Link href="/admin/estimates" className="rounded-lg border border-nude px-4 py-2 text-sm text-charcoal/60 hover:bg-stone-100">
                취소
              </Link>
            </div>
          </div>
        </form>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border border-nude/60 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-nude/60 text-xs text-charcoal/55">
            <tr>
              <th className="px-4 py-3 font-medium">공사명</th>
              <th className="px-4 py-3 font-medium">고객</th>
              <th className="px-4 py-3 font-medium">양식</th>
              <th className="px-4 py-3 text-right font-medium">견적 금액</th>
              <th className="px-4 py-3 font-medium">날짜</th>
              <th className="px-4 py-3 font-medium">상태</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {estimates?.map((e) => (
              <tr key={e.id} className="border-b border-nude/30 last:border-0 hover:bg-stone-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/estimates/${e.id}`} className="font-medium text-charcoal hover:text-orange-600">
                    {e.title}
                  </Link>
                  {e.area_py && <span className="ml-2 text-xs text-charcoal/45">{e.area_py}평</span>}
                </td>
                <td className="px-4 py-3 text-charcoal/70">{e.customer_name ?? "-"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      e.kind === "simple" ? "bg-sky-50 text-sky-700" : "bg-violet-50 text-violet-700"
                    }`}
                  >
                    {e.kind === "simple" ? "간단" : "상세"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-charcoal">
                  {e.total_amount ? `${won(Number(e.total_amount))}원` : "-"}
                  {e.total_amount && !e.vat_included && <span className="ml-1 text-[11px] font-normal text-charcoal/45">VAT별도</span>}
                </td>
                <td className="px-4 py-3 text-charcoal/60">{e.quote_date}</td>
                <td className="px-4 py-3 text-charcoal/70">{STATUS_LABEL[e.status] ?? e.status}</td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-flex items-center gap-3">
                    <Link href={`/admin/estimates/${e.id}/print`} className="text-xs text-charcoal/50 hover:text-orange-600">
                      인쇄
                    </Link>
                    <DeleteButton action={deleteEstimate.bind(null, e.id)} className="text-xs text-charcoal/40 hover:text-red-600" />
                  </span>
                </td>
              </tr>
            ))}
            {(!estimates || estimates.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-charcoal/45">
                  아직 견적서가 없습니다. 위의 &ldquo;+ 상세 견적&rdquo; 또는 &ldquo;+ 간단 견적&rdquo;으로 시작하세요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
