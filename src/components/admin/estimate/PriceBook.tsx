"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Search, X } from "lucide-react";
import { ESTIMATE_CATEGORIES, categoryLabel, won, type EstimateItem } from "@/lib/estimate";
import { addItemsToEstimate, createItem, deleteItem } from "@/app/admin/estimates/actions";
import ItemCell from "@/components/admin/estimate/ItemCell";
import DeleteButton from "@/components/admin/DeleteButton";

type EstimateOption = { id: string; title: string; kind: string; status: string };

const CHOSUNG = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
// "강마루" → "ㄱㅁㄹ" (초성 검색)
function toChosung(text: string) {
  return [...text]
    .map((ch) => {
      const code = ch.charCodeAt(0) - 0xac00;
      return code >= 0 && code <= 11171 ? CHOSUNG[Math.floor(code / 588)] : ch;
    })
    .join("");
}
function hit(item: EstimateItem, words: string[]) {
  const hay = `${item.name} ${item.spec ?? ""} ${item.subcategory ?? ""} ${item.note ?? ""} ${categoryLabel(item.category)}`.toLowerCase();
  const cho = toChosung(hay);
  return words.every((w) => hay.includes(w) || (/^[ㄱ-ㅎ]+$/.test(w) && cho.replace(/\s/g, "").includes(w)));
}

const KINDS = ["전체", "견적가", "매입가", "업체가", "시장가"] as const;

// 단가표: 공종·세부공종·단가종류로 나눠 보고, 검색(초성 가능)해서 찾고, 골라서 견적서에 넣는다.
export default function PriceBook({
  items,
  estimates,
  target,
}: {
  items: EstimateItem[];
  estimates: EstimateOption[];
  target: EstimateOption | null;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [sub, setSub] = useState<string>("all");
  const [kind, setKind] = useState<(typeof KINDS)[number]>("전체");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [to, setTo] = useState<string>(target?.id ?? estimates[0]?.id ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [isPending, start] = useTransition();

  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const inCat = useMemo(() => (cat === "all" ? items : items.filter((i) => i.category === cat)), [items, cat]);
  const subs = useMemo(
    () => [...new Set(inCat.map((i) => i.subcategory ?? "").filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko", { numeric: true })),
    [inCat]
  );
  const shown = useMemo(
    () =>
      inCat
        .filter((i) => sub === "all" || (i.subcategory ?? "") === sub)
        .filter((i) => kind === "전체" || i.price_kind === kind)
        .filter((i) => words.length === 0 || hit(i, words))
        .sort(
          (a, b) =>
            (ESTIMATE_CATEGORIES.find((c) => c.key === a.category)?.no ?? 99) - (ESTIMATE_CATEGORIES.find((c) => c.key === b.category)?.no ?? 99) ||
            (a.subcategory ?? "").localeCompare(b.subcategory ?? "", "ko", { numeric: true }) ||
            a.sort_order - b.sort_order
        ),
    [inCat, sub, kind, words]
  );
  const countBy = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of items) m.set(i.category, (m.get(i.category) ?? 0) + 1);
    return m;
  }, [items]);

  const toggle = (id: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const add = () =>
    start(async () => {
      if (!to) return setMsg("넣을 견적서를 골라 주세요.");
      const r = await addItemsToEstimate(to, [...picked]);
      if ("error" in r) return setMsg(r.error ?? "넣지 못했습니다.");
      setPicked(new Set());
      setMsg(`"${r.title}"에 ${r.added}개 넣었어요${r.skipped ? ` (이미 있던 ${r.skipped}개는 건너뜀)` : ""}`);
      if (target && to === target.id) router.push(`/admin/estimates/${to}`);
    });

  const chip = (active: boolean) =>
    `whitespace-nowrap rounded-full border px-3 py-1 text-xs ${
      active ? "border-orange-400 bg-orange-50 font-semibold text-orange-700" : "border-nude/70 bg-white text-charcoal/60 hover:border-orange-300"
    }`;
  const field = "rounded-lg border border-nude px-3 py-2 text-sm outline-none focus:border-orange-400";

  return (
    <div className="pb-24">
      {target && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
          <b>{target.title}</b> 견적서에 넣을 품목을 고르는 중입니다. 체크한 뒤 아래 <b>[견적서에 넣기]</b>를 누르면 견적서로 돌아갑니다.
        </div>
      )}

      {/* 검색 */}
      <div className="sticky top-0 z-10 -mx-1 bg-stone-100/95 px-1 pb-3 pt-1 backdrop-blur">
        <label className="flex items-center gap-2 rounded-xl border border-nude bg-white px-4 py-2.5 focus-within:border-orange-400">
          <Search size={17} className="text-charcoal/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="품명·규격·브랜드로 찾기 (예: 양변기, 아메리칸, 600*1200, 초성 ㄱㅁㄹ)"
            className="w-full bg-transparent text-sm outline-none"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="검색어 지우기" className="text-charcoal/40 hover:text-charcoal">
              <X size={16} />
            </button>
          )}
        </label>
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          <button type="button" className={chip(cat === "all")} onClick={() => (setCat("all"), setSub("all"))}>
            전체 {items.length}
          </button>
          {ESTIMATE_CATEGORIES.map((c) => (
            <button key={c.key} type="button" className={chip(cat === c.key)} onClick={() => (setCat(c.key), setSub("all"))}>
              {c.no}. {c.label} <span className="text-charcoal/40">{countBy.get(c.key) ?? 0}</span>
            </button>
          ))}
        </div>
        {cat !== "all" && subs.length > 0 && (
          <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
            <button type="button" className={chip(sub === "all")} onClick={() => setSub("all")}>
              세부 전체
            </button>
            {subs.map((s) => (
              <button key={s} type="button" className={chip(sub === s)} onClick={() => setSub(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-charcoal/45">단가 종류</span>
          {KINDS.map((k) => (
            <button key={k} type="button" className={chip(kind === k)} onClick={() => setKind(k)}>
              {k}
            </button>
          ))}
          <span className="ml-auto text-charcoal/50">{shown.length}개</span>
          <button type="button" onClick={() => setShowNew((v) => !v)} className="flex items-center gap-1 rounded-full bg-charcoal px-3 py-1 text-white">
            <Plus size={13} /> 새 품목
          </button>
        </div>
      </div>

      {showNew && (
        <form action={createItem} className="mb-3 rounded-xl border-2 border-dashed border-orange-200 bg-white p-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.1fr_1fr_1.3fr_1.2fr_70px_110px_110px_100px_auto]">
            <select name="category" defaultValue={cat === "all" ? ESTIMATE_CATEGORIES[0].key : cat} className={field}>
              {ESTIMATE_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            <input name="subcategory" list="pb-subcats" defaultValue={sub === "all" ? "" : sub} placeholder="세부공종" className={field} />
            <datalist id="pb-subcats">
              {subs.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <input name="name" required placeholder="품명 *" className={field} />
            <input name="spec" placeholder="규격" className={field} />
            <input name="unit" placeholder="단위" className={field} />
            <input name="material_price" inputMode="numeric" placeholder="재료 단가" className={`${field} text-right`} />
            <input name="labor_price" inputMode="numeric" placeholder="노무 단가" className={`${field} text-right`} />
            <select name="price_kind" className={field}>
              <option>견적가</option>
              <option>매입가</option>
              <option>업체가</option>
              <option>시장가</option>
            </select>
            <button className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">추가</button>
          </div>
        </form>
      )}

      {/* 단가표 */}
      <div className="overflow-x-auto rounded-xl border border-nude/60 bg-white">
        <table className="w-full min-w-[1040px] table-fixed text-sm">
          <colgroup>
            <col style={{ width: 40 }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "17%" }} />
            <col />
            <col style={{ width: 56 }} />
            <col style={{ width: 104 }} />
            <col style={{ width: 104 }} />
            <col style={{ width: 104 }} />
            <col style={{ width: 70 }} />
            <col style={{ width: 44 }} />
          </colgroup>
          <thead className="border-b border-nude/60 bg-[#F0EBE4] text-xs text-charcoal/70">
            <tr>
              <th className="py-2" />
              <th className="px-2 py-2 text-left font-semibold">공종 · 세부</th>
              <th className="px-2 py-2 text-left font-semibold">품명</th>
              <th className="px-2 py-2 text-left font-semibold">규격 · 비고</th>
              <th className="px-2 py-2 font-semibold">단위</th>
              <th className="px-2 py-2 text-right font-semibold">재료 단가</th>
              <th className="px-2 py-2 text-right font-semibold">노무 단가</th>
              <th className="px-2 py-2 text-right font-semibold">합계 단가</th>
              <th className="px-2 py-2 font-semibold">종류</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.slice(0, 600).map((i) => {
              const on = picked.has(i.id);
              return (
                <tr key={i.id} className={`border-b border-nude/30 last:border-0 ${on ? "bg-orange-50" : "hover:bg-stone-50"}`}>
                  <td className="text-center">
                    <button
                      type="button"
                      aria-label={`${i.name} 고르기`}
                      onClick={() => toggle(i.id)}
                      className={`inline-flex h-5 w-5 items-center justify-center rounded border ${on ? "border-orange-500 bg-orange-500 text-white" : "border-charcoal/30 bg-white"}`}
                    >
                      {on && <Check size={13} />}
                    </button>
                  </td>
                  <td className="px-2 py-1 text-[11px] leading-tight text-charcoal/55">
                    {categoryLabel(i.category)}
                    <br />
                    <span className="text-charcoal/70">{i.subcategory}</span>
                  </td>
                  <td className="px-1 py-1">
                    <ItemCell id={i.id} field="name" value={i.name} className="font-medium" />
                  </td>
                  <td className="px-1 py-1">
                    <ItemCell id={i.id} field="spec" value={i.spec} className="text-xs text-charcoal/65" />
                    {i.note && <p className="truncate px-1 text-[10px] text-charcoal/40" title={`${i.note}${i.source ? ` · ${i.source}` : ""}`}>{i.note}</p>}
                  </td>
                  <td className="px-1 py-1">
                    <ItemCell id={i.id} field="unit" value={i.unit} className="text-center text-xs" />
                  </td>
                  <td className="px-1 py-1">
                    <ItemCell id={i.id} field="material_price" value={i.material_price} numeric />
                  </td>
                  <td className="px-1 py-1">
                    <ItemCell id={i.id} field="labor_price" value={i.labor_price} numeric />
                  </td>
                  <td className="px-2 py-1 text-right font-semibold tabular-nums">{won(Number(i.material_price) + Number(i.labor_price))}</td>
                  <td className="px-1 py-1 text-center">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] ${
                        i.price_kind === "시장가"
                          ? "bg-sky-50 text-sky-700"
                          : i.price_kind === "매입가"
                            ? "bg-amber-50 text-amber-700"
                            : i.price_kind === "업체가"
                              ? "bg-violet-50 text-violet-700"
                              : "bg-stone-100 text-charcoal/60"
                      }`}
                    >
                      {i.price_kind}
                    </span>
                  </td>
                  <td className="text-center">
                    <DeleteButton action={deleteItem.bind(null, i.id)} className="text-xs text-charcoal/35 hover:text-red-600" />
                  </td>
                </tr>
              );
            })}
            {shown.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-charcoal/45">
                  찾는 품목이 없습니다. 오른쪽 위 [새 품목]으로 만들 수 있어요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {shown.length > 600 && <p className="px-4 py-3 text-center text-xs text-charcoal/45">600개까지만 보입니다. 검색이나 공종으로 좁혀 주세요.</p>}
      </div>

      {/* 고른 품목 → 견적서에 넣기 */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-nude bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-charcoal">{picked.size}개 고름</span>
          {picked.size > 0 && (
            <button type="button" onClick={() => setPicked(new Set())} className="text-xs text-charcoal/50 underline">
              비우기
            </button>
          )}
          {msg && <span className="text-xs text-emerald-700">{msg}</span>}
          <div className="ml-auto flex items-center gap-2">
            <select value={to} onChange={(e) => setTo(e.target.value)} className="max-w-[240px] rounded-lg border border-nude px-2 py-2 text-sm">
              {estimates.length === 0 && <option value="">작성 중인 견적서 없음</option>}
              {estimates.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} ({e.kind === "simple" ? "간단" : "상세"})
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={isPending || picked.size === 0 || !to}
              onClick={add}
              className="rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {isPending ? "넣는 중" : "견적서에 넣기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
