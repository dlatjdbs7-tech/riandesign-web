"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown, Copy, Plus, Printer, Save, Search, Trash2 } from "lucide-react";
import {
  ESTIMATE_CATEGORIES,
  KIND_LABEL,
  STATUS_LABEL,
  calcEstimate,
  lineAmounts,
  toKoreanAmount,
  won,
  type Estimate,
  type EstimateItem,
  type EstimateLine,
} from "@/lib/estimate";
import { copyEstimate, saveCustomToLibrary, saveEstimate, type EstimateHeaderInput, type EstimateLineInput } from "@/app/admin/estimates/actions";
import ShareLinkButton from "./ShareLinkButton";

// name·spec: 이 견적에서만 바꾼 제품명·규격 (없으면 라이브러리 이름)
type Picked = { qty: number; material_price: number; labor_price: number; note: string | null; name?: string; spec?: string | null };
type Custom = Picked & { key: string; category: string; subcategory: string | null; name: string; spec: string | null; unit: string | null };

const INPUT = "w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-right tabular-nums outline-none hover:border-nude focus:border-orange-400 focus:bg-white";

function NumInput({
  value,
  onChange,
  decimals = false,
  className = INPUT,
  ariaLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  decimals?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? (value ? value.toLocaleString("ko-KR", { maximumFractionDigits: 2 }) : "");
  return (
    <input
      aria-label={ariaLabel}
      inputMode={decimals ? "decimal" : "numeric"}
      value={shown}
      placeholder="0"
      onFocus={() => setText(value ? String(value) : "")}
      onBlur={() => setText(null)}
      onChange={(e) => {
        const raw = e.target.value.replace(/,/g, "");
        if (raw === "" || raw === "-" || (decimals ? /^-?\d*\.?\d*$/ : /^-?\d*$/).test(raw)) {
          setText(raw);
          onChange(Number(raw) || 0);
        }
      }}
      className={className}
    />
  );
}

export default function EstimateEditor({
  estimate,
  lines,
  items,
}: {
  estimate: Estimate;
  lines: EstimateLine[];
  items: EstimateItem[];
}) {
  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const [header, setHeader] = useState<EstimateHeaderInput>({
    title: estimate.title,
    customer_name: estimate.customer_name,
    customer_phone: estimate.customer_phone,
    site_address: estimate.site_address,
    area_py: estimate.area_py,
    area_m2: estimate.area_m2,
    quote_date: estimate.quote_date,
    status: estimate.status,
    expense_rate: Number(estimate.expense_rate),
    misc_rate: Number(estimate.misc_rate),
    profit_rate: Number(estimate.profit_rate),
    vat_rate: Number(estimate.vat_rate),
    vat_included: estimate.vat_included,
    round_unit: estimate.round_unit,
    notes: estimate.notes,
  });

  const [picks, setPicks] = useState<Record<string, Picked>>(() => {
    const map: Record<string, Picked> = {};
    for (const l of lines) {
      const item = l.item_id ? itemById.get(l.item_id) : undefined;
      if (l.item_id && item) {
        map[l.item_id] = {
          qty: Number(l.qty),
          material_price: Number(l.material_price),
          labor_price: Number(l.labor_price),
          note: l.note,
          ...(l.name !== item.name ? { name: l.name } : {}),
          ...(l.spec !== item.spec ? { spec: l.spec } : {}),
        };
      }
    }
    return map;
  });
  const [customs, setCustoms] = useState<Custom[]>(() =>
    lines
      .filter((l) => !l.item_id || !itemById.has(l.item_id))
      .map((l) => ({
        key: l.id,
        category: l.category,
        subcategory: l.subcategory,
        name: l.name,
        spec: l.spec,
        unit: l.unit,
        qty: Number(l.qty),
        material_price: Number(l.material_price),
        labor_price: Number(l.labor_price),
        note: l.note,
      }))
  );

  const [search, setSearch] = useState("");
  const [onlyPicked, setOnlyPicked] = useState(false);
  const [open, setOpen] = useState<Set<string>>(() => {
    const withPicks = new Set(lines.map((l) => l.category));
    return withPicks.size > 0 ? withPicks : new Set([ESTIMATE_CATEGORIES[0].key]);
  });
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function touch() {
    setDirty(true);
    setMessage(null);
  }
  function setH<K extends keyof EstimateHeaderInput>(key: K, value: EstimateHeaderInput[K]) {
    setHeader((h) => ({ ...h, [key]: value }));
    touch();
  }

  function toggleItem(item: EstimateItem) {
    setPicks((p) => {
      const next = { ...p };
      if (next[item.id]) delete next[item.id];
      else next[item.id] = { qty: Number(item.simple_qty) || 1, material_price: Number(item.material_price), labor_price: Number(item.labor_price), note: null };
      return next;
    });
    touch();
  }
  function editPick(item: EstimateItem, patch: Partial<Picked>) {
    setPicks((p) => ({
      ...p,
      [item.id]: {
        ...(p[item.id] ?? { qty: 1, material_price: Number(item.material_price), labor_price: Number(item.labor_price), note: null }),
        ...patch,
      },
    }));
    touch();
  }
  // ▼로 같은 세부공종의 다른 제품으로 바꾸기 (수량은 그대로)
  function swapItem(from: EstimateItem, toId: string) {
    const to = itemById.get(toId);
    if (!to) return;
    setPicks((p) => {
      const next = { ...p };
      const qty = next[from.id]?.qty ?? 1;
      delete next[from.id];
      next[to.id] = { qty, material_price: Number(to.material_price), labor_price: Number(to.labor_price), note: null };
      return next;
    });
    touch();
  }
  const alternativesOf = (item: EstimateItem) =>
    items.filter((i) => i.id !== item.id && i.category === item.category && (i.subcategory ?? "") === (item.subcategory ?? ""));

  function editCustom(key: string, patch: Partial<Custom>) {
    setCustoms((c) => c.map((x) => (x.key === key ? { ...x, ...patch } : x)));
    touch();
  }
  function addCustom(category: string) {
    setCustoms((c) => [
      ...c,
      { key: `new-${Date.now()}`, category, subcategory: null, name: "", spec: null, unit: "식", qty: 1, material_price: 0, labor_price: 0, note: null },
    ]);
    touch();
  }

  // 저장·계산에 쓰는 실제 견적 줄 (공종 순서 → 라이브러리 순서 → 직접 입력)
  const allLines: EstimateLineInput[] = useMemo(() => {
    const result: EstimateLineInput[] = [];
    const categoryKeys = [...ESTIMATE_CATEGORIES.map((c) => c.key as string)];
    for (const c of customs) if (!categoryKeys.includes(c.category)) categoryKeys.push(c.category);
    for (const cat of categoryKeys) {
      for (const item of items) {
        if (item.category !== cat || !picks[item.id]) continue;
        const p = picks[item.id];
        result.push({
          item_id: item.id,
          category: item.category,
          subcategory: item.subcategory,
          name: p.name?.trim() || item.name,
          spec: p.spec !== undefined ? p.spec : item.spec,
          unit: item.unit,
          qty: p.qty,
          material_price: p.material_price,
          labor_price: p.labor_price,
          note: p.note,
        });
      }
      for (const c of customs) {
        if (c.category !== cat || !c.name.trim()) continue;
        result.push({ item_id: null, category: c.category, subcategory: c.subcategory, name: c.name.trim(), spec: c.spec, unit: c.unit, qty: c.qty, material_price: c.material_price, labor_price: c.labor_price, note: c.note });
      }
    }
    return result;
  }, [items, picks, customs]);

  const summary = calcEstimate(allLines, {
    expense: header.expense_rate,
    misc: header.misc_rate,
    profit: header.profit_rate,
    vat: header.vat_rate,
    vatIncluded: header.vat_included,
    roundUnit: header.round_unit,
  });

  const q = search.trim().toLowerCase();
  const matches = (item: EstimateItem) =>
    !q || `${item.name} ${item.spec ?? ""} ${item.subcategory ?? ""}`.toLowerCase().includes(q);

  function save() {
    startSaving(async () => {
      const result = await saveEstimate(estimate.id, header, allLines);
      if ("error" in result) setMessage(result.error ?? "저장하지 못했습니다.");
      else {
        setDirty(false);
        setMessage(`저장했어요 · ${new Date(result.savedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`);
      }
    });
  }

  const headerInput = "w-full rounded-lg border border-nude px-3 py-2 text-sm outline-none focus:border-orange-400";

  return (
    <div className="pb-24 xl:pb-0">
      {/* 상단 바 */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/estimates" className="text-sm text-charcoal/50 hover:text-orange-600">
          ← 견적서 목록
        </Link>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${estimate.kind === "simple" ? "bg-sky-50 text-sky-700" : "bg-violet-50 text-violet-700"}`}>
          {KIND_LABEL[estimate.kind]}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {message && <span className="text-sm text-emerald-700">{message}</span>}
          {dirty && !message && <span className="text-sm text-orange-600">저장 안 된 변경이 있어요</span>}
          <ShareLinkButton
            token={estimate.share_token}
            beforeCopy={async () => {
              // 링크를 보내기 전에 지금 내용을 저장하고, 작성 중이면 "발송"으로 바꾼다
              const nextHeader = header.status === "draft" ? { ...header, status: "sent" } : header;
              if (dirty || nextHeader !== header) {
                const result = await saveEstimate(estimate.id, nextHeader, allLines);
                if (!("error" in result)) {
                  setHeader(nextHeader);
                  setDirty(false);
                }
              }
            }}
          />
          <button
            type="button"
            onClick={() => copyEstimate(estimate.id)}
            className="flex items-center gap-1.5 rounded-full border border-nude bg-white px-4 py-2 text-sm text-charcoal/70 hover:bg-stone-100"
          >
            <Copy size={15} /> 사본(수정 견적)
          </button>
          <Link
            href={`/admin/estimates/${estimate.id}/print`}
            className="flex items-center gap-1.5 rounded-full border border-nude bg-white px-4 py-2 text-sm text-charcoal/70 hover:bg-stone-100"
          >
            <Printer size={15} /> 인쇄·PDF
          </Link>
          <button
            type="button"
            onClick={save}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
          >
            <Save size={15} /> {isSaving ? "저장 중" : "저장"}
          </button>
        </div>
      </div>

      {(estimate.approved_at || estimate.view_count > 0) && (
        <p className="mt-3 rounded-lg bg-white px-4 py-2 text-sm text-charcoal/70">
          {estimate.approved_at ? (
            <span className="font-semibold text-emerald-700">
              고객 승인 · {estimate.approved_name} · {new Date(estimate.approved_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
            </span>
          ) : (
            <span>
              고객이 링크를 {estimate.view_count}번 열어 봤어요
              {estimate.viewed_at && ` · 마지막 ${new Date(estimate.viewed_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`}
            </span>
          )}
        </p>
      )}

      {/* 견적 정보 */}
      <section className="mt-4 rounded-xl border border-nude/60 bg-white p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="lg:col-span-2">
            <span className="text-xs text-charcoal/50">공사명</span>
            <input value={header.title} onChange={(e) => setH("title", e.target.value)} className={headerInput} />
          </label>
          <label>
            <span className="text-xs text-charcoal/50">고객명</span>
            <input value={header.customer_name ?? ""} onChange={(e) => setH("customer_name", e.target.value || null)} className={headerInput} />
          </label>
          <label>
            <span className="text-xs text-charcoal/50">연락처</span>
            <input value={header.customer_phone ?? ""} onChange={(e) => setH("customer_phone", e.target.value || null)} className={headerInput} />
          </label>
          <label className="lg:col-span-2">
            <span className="text-xs text-charcoal/50">현장 주소</span>
            <input value={header.site_address ?? ""} onChange={(e) => setH("site_address", e.target.value || null)} className={headerInput} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="text-xs text-charcoal/50">평수</span>
              <NumInput
                decimals
                value={header.area_py ?? 0}
                onChange={(n) => {
                  setH("area_py", n || null);
                  setH("area_m2", n ? Math.round(n * 3.3058 * 100) / 100 : null);
                }}
                className={`${headerInput} text-right`}
              />
            </label>
            <label>
              <span className="text-xs text-charcoal/50">m2</span>
              <NumInput decimals value={header.area_m2 ?? 0} onChange={(n) => setH("area_m2", n || null)} className={`${headerInput} text-right`} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="text-xs text-charcoal/50">제출일</span>
              <input type="date" value={header.quote_date} onChange={(e) => setH("quote_date", e.target.value)} className={headerInput} />
            </label>
            <label>
              <span className="text-xs text-charcoal/50">상태</span>
              <select value={header.status} onChange={(e) => setH("status", e.target.value)} className={headerInput}>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="sm:col-span-2 lg:col-span-4">
            <span className="text-xs text-charcoal/50">비고 (포함·불포함 등, 줄마다 하나씩 · 갑지에 그대로 나옵니다)</span>
            <textarea rows={2} value={header.notes ?? ""} onChange={(e) => setH("notes", e.target.value || null)} className={`${headerInput} resize-y`} />
          </label>
        </div>
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_320px]">
        {/* 품목 체크리스트 */}
        <section>
          <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-2 bg-stone-100/95 px-1 py-2 backdrop-blur">
            <div className="relative min-w-[200px] flex-1">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/35" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="품목 검색 (예: 도배, 양변기, 블룸)"
                className="w-full rounded-lg border border-nude bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-orange-400"
              />
            </div>
            <label className="flex items-center gap-1.5 rounded-lg border border-nude bg-white px-3 py-2 text-sm text-charcoal/70">
              <input type="checkbox" checked={onlyPicked} onChange={(e) => setOnlyPicked(e.target.checked)} className="accent-orange-500" />
              체크한 품목만
            </label>
            <button
              type="button"
              onClick={() => setOpen(open.size >= ESTIMATE_CATEGORIES.length ? new Set() : new Set(ESTIMATE_CATEGORIES.map((c) => c.key)))}
              className="rounded-lg border border-nude bg-white px-3 py-2 text-sm text-charcoal/70 hover:bg-stone-50"
            >
              {open.size >= ESTIMATE_CATEGORIES.length ? "모두 접기" : "모두 펼치기"}
            </button>
          </div>

          <div className="mt-2 flex flex-col gap-3">
            {ESTIMATE_CATEGORIES.map((cat) => {
              const catItems = items.filter((i) => i.category === cat.key && matches(i) && (!onlyPicked || picks[i.id]));
              const catCustoms = customs.filter((c) => c.category === cat.key);
              const pickedCount = items.filter((i) => i.category === cat.key && picks[i.id]).length + catCustoms.length;
              const catTotal = summary.categories.find((c) => c.key === cat.key)?.total ?? 0;
              const isOpen = open.has(cat.key) || !!q;
              if ((q || onlyPicked) && catItems.length === 0 && catCustoms.length === 0) return null;

              // 세부공종별로 묶기
              const groups: { sub: string; list: EstimateItem[] }[] = [];
              for (const item of catItems) {
                const sub = item.subcategory ?? "";
                const g = groups[groups.length - 1];
                if (g && g.sub === sub) g.list.push(item);
                else groups.push({ sub, list: [item] });
              }

              return (
                <div key={cat.key} className="overflow-hidden rounded-xl border border-nude/60 bg-white">
                  <button
                    type="button"
                    onClick={() =>
                      setOpen((o) => {
                        const n = new Set(o);
                        if (n.has(cat.key)) n.delete(cat.key);
                        else n.add(cat.key);
                        return n;
                      })
                    }
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-stone-50"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-charcoal text-xs font-bold text-cream">{cat.no}</span>
                    <span className="font-semibold text-charcoal">{cat.label}</span>
                    {pickedCount > 0 && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">{pickedCount}개 체크</span>}
                    <span className="ml-auto text-sm font-semibold tabular-nums text-charcoal">{catTotal ? `${won(catTotal)}원` : ""}</span>
                    <ChevronDown size={18} className={`shrink-0 text-charcoal/40 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isOpen && (
                    <div className="overflow-x-auto border-t border-nude/50">
                      <table className="w-full min-w-[760px] text-sm">
                        <thead>
                          <tr className="bg-stone-50 text-xs text-charcoal/50">
                            <th className="w-9 py-2" />
                            <th className="py-2 pl-1 text-left font-medium">품명 · 규격</th>
                            <th className="w-14 py-2 font-medium">단위</th>
                            <th className="w-20 py-2 text-right font-medium">수량</th>
                            <th className="w-28 py-2 text-right font-medium">재료 단가</th>
                            <th className="w-28 py-2 text-right font-medium">노무 단가</th>
                            <th className="w-32 py-2 pr-4 text-right font-medium">금액</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groups.map((g) => (
                            <GroupRows key={g.sub || "-"} sub={g.sub}>
                              {g.list.map((item) => {
                                const p = picks[item.id];
                                const checked = !!p;
                                const v = p ?? { qty: Number(item.simple_qty) || 1, material_price: Number(item.material_price), labor_price: Number(item.labor_price), note: null };
                                return (
                                  <tr key={item.id} className={`border-t border-nude/30 ${checked ? "bg-orange-50/60" : "text-charcoal/55"}`}>
                                    <td className="py-1.5 text-center">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleItem(item)}
                                        aria-label={`${item.name} 선택`}
                                        className="h-4 w-4 accent-orange-500"
                                      />
                                    </td>
                                    <td className="py-1.5 pl-1">
                                      {checked ? (
                                        <div className="flex items-center gap-1">
                                          {alternativesOf(item).length > 0 && (
                                            <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-nude bg-white text-xs text-orange-600 hover:border-orange-400 hover:bg-orange-50">
                                              ▼
                                              <select
                                                value=""
                                                title="같은 종류의 다른 제품으로 바꾸기"
                                                aria-label={`${item.name} 다른 제품으로 바꾸기`}
                                                onChange={(e) => e.target.value && swapItem(item, e.target.value)}
                                                className="absolute inset-0 cursor-pointer opacity-0"
                                              >
                                                <option value="">다른 제품으로 바꾸기 ({alternativesOf(item).length}개)</option>
                                                {alternativesOf(item).map((a) => (
                                                  <option key={a.id} value={a.id}>
                                                    {a.name}
                                                    {a.spec ? ` · ${a.spec}` : ""} — {won(Number(a.material_price) + Number(a.labor_price))}원/{a.unit}
                                                    {a.price_kind !== "견적가" ? ` (${a.price_kind})` : ""}
                                                  </option>
                                                ))}
                                              </select>
                                            </span>
                                          )}
                                          <input
                                            value={v.name ?? item.name}
                                            onChange={(e) => editPick(item, { ...v, name: e.target.value })}
                                            aria-label="제품명"
                                            className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1.5 py-1 font-medium text-charcoal outline-none hover:border-nude focus:border-orange-400 focus:bg-white"
                                          />
                                          <input
                                            value={(v.spec !== undefined ? v.spec : item.spec) ?? ""}
                                            onChange={(e) => editPick(item, { ...v, spec: e.target.value || null })}
                                            aria-label="규격"
                                            placeholder="규격"
                                            className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1.5 py-1 text-xs text-charcoal/55 outline-none hover:border-nude focus:border-orange-400 focus:bg-white"
                                          />
                                        </div>
                                      ) : (
                                        <button type="button" onClick={() => toggleItem(item)} className="text-left">
                                          <span>{item.name}</span>
                                          {item.spec && <span className="ml-1.5 text-xs text-charcoal/45">{item.spec}</span>}
                                          {item.price_kind !== "견적가" && (
                                            <span className="ml-1.5 rounded bg-amber-50 px-1 text-[10px] text-amber-700">{item.price_kind}</span>
                                          )}
                                        </button>
                                      )}
                                    </td>
                                    <td className="py-1.5 text-center text-xs">{item.unit}</td>
                                    <td className="py-1.5">
                                      <NumInput decimals ariaLabel="수량" value={v.qty} onChange={(n) => editPick(item, { ...v, qty: n })} />
                                    </td>
                                    <td className="py-1.5">
                                      <NumInput ariaLabel="재료 단가" value={v.material_price} onChange={(n) => editPick(item, { ...v, material_price: n })} />
                                    </td>
                                    <td className="py-1.5">
                                      <NumInput ariaLabel="노무 단가" value={v.labor_price} onChange={(n) => editPick(item, { ...v, labor_price: n })} />
                                    </td>
                                    <td className="py-1.5 pr-4 text-right font-medium tabular-nums">{checked ? won(lineAmounts(v).total) : ""}</td>
                                  </tr>
                                );
                              })}
                            </GroupRows>
                          ))}

                          {catCustoms.map((c) => (
                            <tr key={c.key} className="border-t border-nude/30 bg-orange-50/60">
                              <td className="py-1.5 text-center">
                                <button
                                  type="button"
                                  aria-label="직접 입력 줄 빼기"
                                  onClick={() => {
                                    setCustoms((list) => list.filter((x) => x.key !== c.key));
                                    touch();
                                  }}
                                  className="text-charcoal/35 hover:text-red-600"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                              <td className="py-1.5 pl-1">
                                <div className="flex gap-1">
                                  <input
                                    value={c.name}
                                    onChange={(e) => editCustom(c.key, { name: e.target.value })}
                                    placeholder="품명 (직접 입력)"
                                    className="w-1/2 rounded border border-nude px-1.5 py-1 text-sm outline-none focus:border-orange-400"
                                  />
                                  <input
                                    value={c.spec ?? ""}
                                    onChange={(e) => editCustom(c.key, { spec: e.target.value || null })}
                                    placeholder="규격"
                                    className="w-1/2 rounded border border-nude px-1.5 py-1 text-xs outline-none focus:border-orange-400"
                                  />
                                  <button
                                    type="button"
                                    title="다음 견적부터 체크로 고를 수 있게 품목 목록에 저장"
                                    onClick={async () => {
                                      const result = await saveCustomToLibrary({
                                        category: c.category,
                                        subcategory: c.subcategory,
                                        name: c.name,
                                        spec: c.spec,
                                        unit: c.unit,
                                        material_price: c.material_price,
                                        labor_price: c.labor_price,
                                      });
                                      setMessage("error" in result ? (result.error ?? "저장하지 못했습니다.") : `"${c.name}" 품목 목록에 저장했어요`);
                                    }}
                                    className="shrink-0 whitespace-nowrap rounded border border-nude bg-white px-2 py-1 text-[11px] text-charcoal/60 hover:border-orange-400 hover:text-orange-700"
                                  >
                                    목록에 저장
                                  </button>
                                </div>
                              </td>
                              <td className="py-1.5">
                                <input
                                  value={c.unit ?? ""}
                                  onChange={(e) => editCustom(c.key, { unit: e.target.value || null })}
                                  className="w-full rounded border border-nude px-1 py-1 text-center text-xs outline-none focus:border-orange-400"
                                />
                              </td>
                              <td className="py-1.5">
                                <NumInput decimals ariaLabel="수량" value={c.qty} onChange={(n) => editCustom(c.key, { qty: n })} />
                              </td>
                              <td className="py-1.5">
                                <NumInput ariaLabel="재료 단가" value={c.material_price} onChange={(n) => editCustom(c.key, { material_price: n })} />
                              </td>
                              <td className="py-1.5">
                                <NumInput ariaLabel="노무 단가" value={c.labor_price} onChange={(n) => editCustom(c.key, { labor_price: n })} />
                              </td>
                              <td className="py-1.5 pr-4 text-right font-medium tabular-nums">{won(lineAmounts(c).total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <button
                        type="button"
                        onClick={() => addCustom(cat.key)}
                        className="flex w-full items-center gap-1.5 border-t border-nude/40 px-4 py-2.5 text-sm text-charcoal/50 hover:bg-stone-50 hover:text-orange-600"
                      >
                        <Plus size={15} /> 목록에 없는 품목 직접 추가
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 합계 */}
        <aside className="xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-xl border border-nude/60 bg-white p-5">
            <h2 className="font-semibold text-charcoal">집계</h2>
            <ul className="mt-3 flex flex-col gap-1.5 text-sm">
              {summary.categories.map((c) => (
                <li key={c.key} className="flex justify-between gap-2">
                  <span className="truncate text-charcoal/65">
                    {c.no}. {c.label}
                  </span>
                  <span className="shrink-0 tabular-nums">{won(c.total)}</span>
                </li>
              ))}
              {summary.categories.length === 0 && <li className="text-charcoal/45">품목을 체크하면 여기에 합계가 나옵니다.</li>}
            </ul>

            <dl className="mt-4 flex flex-col gap-1.5 border-t border-nude/50 pt-3 text-sm">
              <Row label="재료비" value={summary.material} />
              <Row label="노무비" value={summary.labor} />
              <Row label="직접공사비" value={summary.direct} strong />
              <RateRow label="경비 (재료비의)" rate={header.expense_rate} onRate={(n) => setH("expense_rate", n)} value={summary.expense} />
              <RateRow label="공과잡비 (재료비의)" rate={header.misc_rate} onRate={(n) => setH("misc_rate", n)} value={summary.misc} />
              <RateRow label="기업이윤 (직접공사비의)" rate={header.profit_rate} onRate={(n) => setH("profit_rate", n)} value={summary.profit} />
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-charcoal/65">
                  부가세
                  <select
                    value={header.vat_included ? "in" : "out"}
                    onChange={(e) => setH("vat_included", e.target.value === "in")}
                    className="rounded border border-nude px-1 py-0.5 text-xs"
                  >
                    <option value="in">포함</option>
                    <option value="out">별도</option>
                  </select>
                  <span className="w-10">
                    <NumInput decimals value={header.vat_rate} onChange={(n) => setH("vat_rate", n)} className="w-full rounded border border-nude px-1 py-0.5 text-right text-xs" />
                  </span>
                  %
                </span>
                <span className="tabular-nums">{header.vat_included ? won(summary.vat) : "별도"}</span>
              </div>
              <Row label="합계" value={summary.total} />
              <div className="flex items-center justify-between text-charcoal/50">
                <span className="flex items-center gap-1">
                  절사
                  <select value={header.round_unit} onChange={(e) => setH("round_unit", Number(e.target.value))} className="rounded border border-nude px-1 py-0.5 text-xs">
                    <option value={1}>안 함</option>
                    <option value={1000}>천원 미만</option>
                    <option value={10000}>만원 미만</option>
                    <option value={100000}>10만원 미만</option>
                    <option value={1000000}>100만원 미만</option>
                  </select>
                </span>
                <span className="tabular-nums">-{won(summary.cut)}</span>
              </div>
            </dl>

            <div className="mt-4 rounded-lg bg-orange-50 px-4 py-3">
              <p className="text-xs text-orange-800/70">공사 금액 {header.vat_included ? "(부가세 포함)" : "(부가세 별도)"}</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-orange-700">{won(summary.final)}원</p>
              <p className="mt-0.5 text-xs text-orange-800/70">일금 {toKoreanAmount(summary.final)}원정</p>
              {!header.vat_included && summary.final > 0 && (
                <p className="mt-1 text-xs text-charcoal/50">부가세 {won(summary.separateVat)}원 별도</p>
              )}
            </div>
            <p className="mt-3 text-xs text-charcoal/40">체크 {allLines.length}개 품목 · 계산은 리안 엑셀 견적서와 같습니다</p>
          </div>
        </aside>
      </div>

      {/* 휴대폰: 아래 고정 합계 */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-nude bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] xl:hidden">
        <div>
          <p className="text-xs text-charcoal/50">공사 금액 · {allLines.length}개 품목</p>
          <p className="text-lg font-bold tabular-nums text-orange-700">{won(summary.final)}원</p>
        </div>
        <button type="button" onClick={save} disabled={isSaving} className="rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {isSaving ? "저장 중" : "저장"}
        </button>
      </div>
    </div>
  );
}

function GroupRows({ sub, children }: { sub: string; children: React.ReactNode }) {
  return (
    <>
      {sub && (
        <tr className="border-t border-nude/40 bg-stone-50/70">
          <td />
          <td colSpan={6} className="py-1.5 pl-1 text-xs font-semibold text-charcoal/55">
            {sub}
          </td>
        </tr>
      )}
      {children}
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "font-semibold text-charcoal" : "text-charcoal/65"}`}>
      <span>{label}</span>
      <span className="tabular-nums">{won(value)}</span>
    </div>
  );
}

function RateRow({ label, rate, onRate, value }: { label: string; rate: number; onRate: (n: number) => void; value: number }) {
  return (
    <div className="flex items-center justify-between gap-2 text-charcoal/65">
      <span className="flex items-center gap-1">
        {label}
        <span className="w-10">
          <NumInput decimals value={rate} onChange={onRate} className="w-full rounded border border-nude px-1 py-0.5 text-right text-xs" />
        </span>
        %
      </span>
      <span className="tabular-nums">{won(value)}</span>
    </div>
  );
}
