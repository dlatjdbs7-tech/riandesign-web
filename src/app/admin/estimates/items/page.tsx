import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { EstimateItem } from "@/lib/estimate";
import PriceBook from "@/components/admin/estimate/PriceBook";

// 단가표 (견적 품목 관리): 공종·세부공종으로 나눠 보고, 검색해서 찾고, 고른 품목을 작성 중인 견적서에 넣는다.
//  ?to=<견적서 id> 로 열면 그 견적서에 넣는 상태로 시작한다 (견적서 편집 화면의 [단가표에서 찾기]).
export default async function EstimateItemsPage({ searchParams }: { searchParams: Promise<{ to?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const all: EstimateItem[] = [];
  // 1000개 넘게 늘어날 수 있으니 나눠서 읽는다
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase
      .from("estimate_items")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .range(from, from + 999)
      .returns<EstimateItem[]>();
    all.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const { data: estimates } = await supabase
    .from("estimates")
    .select("id, title, kind, status")
    .neq("status", "approved")
    .order("updated_at", { ascending: false })
    .limit(50)
    .returns<{ id: string; title: string; kind: string; status: string }[]>();
  const target = sp.to ? (estimates ?? []).find((e) => e.id === sp.to) ?? null : null;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href={target ? `/admin/estimates/${target.id}` : "/admin/estimates"} className="text-sm text-charcoal/50 hover:text-orange-600">
            ← {target ? "견적서로 돌아가기" : "견적서"}
          </Link>
          <h1 className="mt-1 font-serif text-2xl font-semibold text-charcoal">단가표</h1>
          <p className="mt-1 text-sm text-charcoal/50">
            견적 품목 {all.length.toLocaleString("ko-KR")}개 · 칸을 눌러 고치면 바로 저장됩니다(이미 만든 견적서 금액은 바뀌지 않아요). 체크해서 견적서에 넣을 수 있어요.
          </p>
        </div>
      </div>
      <div className="mt-4">
        <PriceBook items={all} estimates={estimates ?? []} target={target} />
      </div>
    </div>
  );
}
