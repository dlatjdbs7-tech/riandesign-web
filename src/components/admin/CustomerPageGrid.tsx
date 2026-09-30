"use client";

import { useMemo, useState } from "react";
import type { WorkOrder } from "@/lib/types";
import CopyLinkButton from "./CopyLinkButton";
import {
  addManualProjectPhoto,
  addProjectPhoto,
  deleteManualProject,
  deleteManualProjectPhoto,
  deleteProjectPhoto,
} from "@/app/admin/customer-pages/actions";

const STATUS_LABEL: Record<WorkOrder["status"], string> = {
  pending: "대기",
  in_progress: "진행중",
  completed: "완료",
  cancelled: "취소",
  on_hold: "보류",
};

export type ProjectCard = {
  id: string;
  title: string;
  status: WorkOrder["status"];
  customerLabel: string;
  customerPhone: string | null;
  siteAddress: string | null;
  isManual: boolean;
  photos: {
    id: string;
    image_url: string;
    caption: string | null;
    period_start: string | null;
    period_end: string | null;
  }[];
  createdAt: string;
};

const FILTERS = [
  { key: "pending", label: "계약·대기" },
  { key: "in_progress", label: "진행중" },
  { key: "closed", label: "마감" },
  { key: "all", label: "전체" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

function statusGroup(status: WorkOrder["status"]): Exclude<FilterKey, "all"> {
  if (status === "in_progress") return "in_progress";
  if (status === "pending") return "pending";
  return "closed";
}

export default function CustomerPageGrid({ cards, origin }: { cards: ProjectCard[]; origin: string }) {
  const [filter, setFilter] = useState<FilterKey>("pending");
  const [search, setSearch] = useState("");

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { pending: 0, in_progress: 0, closed: 0, all: cards.length };
    cards.forEach((card) => {
      c[statusGroup(card.status)] += 1;
    });
    return c;
  }, [cards]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cards.filter((card) => {
      if (filter !== "all" && statusGroup(card.status) !== filter) return false;
      if (!q) return true;
      return (
        card.title.toLowerCase().includes(q) ||
        card.customerLabel.toLowerCase().includes(q) ||
        (card.customerPhone ?? "").includes(q) ||
        (card.siteAddress ?? "").toLowerCase().includes(q)
      );
    });
  }, [cards, filter, search]);

  return (
    <div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-full border border-nude/60 bg-white p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                filter === f.key ? "bg-charcoal text-cream" : "text-charcoal/60 hover:bg-beige/60"
              }`}
            >
              {f.label} {counts[f.key]}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="현장·고객·연락처 검색"
          className="w-full max-w-xs rounded-full border border-nude/60 bg-white px-4 py-2 text-sm outline-none focus:border-orange-400"
        />
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        {filtered.map((card) => {
          const publicUrl = `${origin}/project/${card.id}`;

          return (
            <div key={card.id} className="rounded-sm border border-nude/60 bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs ${
                        card.status === "completed"
                          ? "text-emerald-700"
                          : card.status === "in_progress"
                            ? "text-orange-600"
                            : "text-charcoal/60"
                      }`}
                    >
                      {STATUS_LABEL[card.status]}
                    </span>
                    {card.isManual && (
                      <span className="rounded-sm bg-stone-100 px-1.5 py-0.5 text-[10px] text-charcoal/50">
                        직접등록
                      </span>
                    )}
                  </div>
                  <h2 className="font-serif text-lg font-semibold text-charcoal">{card.title}</h2>
                  <p className="text-sm text-charcoal/60">
                    {card.customerLabel}
                    {card.customerPhone && ` · ${card.customerPhone}`}
                  </p>
                  {card.siteAddress && <p className="text-xs text-charcoal/40">{card.siteAddress}</p>}
                </div>
                {card.isManual && (
                  <form action={deleteManualProject.bind(null, card.id)}>
                    <button type="submit" className="text-xs text-charcoal/40 hover:text-red-600">
                      삭제
                    </button>
                  </form>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-charcoal px-4 py-1.5 text-xs text-cream hover:bg-orange-400"
                >
                  고객페이지 열기 ↗
                </a>
                <CopyLinkButton url={publicUrl} />
              </div>

              <div className="mt-4">
                <p className="text-xs text-charcoal/50">현장 사진 · {card.photos.length}</p>
                {card.photos.length > 0 && (
                  <div className="mt-2 flex gap-2 overflow-x-auto">
                    {card.photos.map((photo) => (
                      <div key={photo.id} className="relative shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.image_url}
                          alt={photo.caption ?? ""}
                          title={
                            [
                              photo.period_start &&
                                `${photo.period_start} ~ ${photo.period_end ?? photo.period_start}`,
                              photo.caption,
                            ]
                              .filter(Boolean)
                              .join(" · ") || undefined
                          }
                          className="h-16 w-16 rounded-sm border border-nude/60 object-cover"
                        />
                        <form
                          action={(card.isManual ? deleteManualProjectPhoto : deleteProjectPhoto).bind(
                            null,
                            photo.id
                          )}
                        >
                          <button
                            type="submit"
                            className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-charcoal text-[10px] text-cream"
                          >
                            ×
                          </button>
                        </form>
                      </div>
                    ))}
                  </div>
                )}

                <form
                  key={card.photos.length}
                  action={(card.isManual ? addManualProjectPhoto : addProjectPhoto).bind(null, card.id)}
                  className="mt-3 flex flex-col gap-2"
                >
                  <input
                    type="file"
                    name="photo"
                    accept="image/*"
                    capture="environment"
                    required
                    className="text-xs file:mr-2 file:rounded-full file:border file:border-charcoal/30 file:bg-white file:px-3 file:py-1 file:text-xs file:text-charcoal hover:file:border-charcoal"
                  />
                  <textarea
                    name="caption"
                    placeholder="담당자 코멘트 (선택) — 오늘 진행한 작업을 남겨주세요"
                    rows={2}
                    className="resize-none rounded-sm border border-nude bg-transparent p-2 text-xs outline-none focus:border-orange-400"
                  />
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-charcoal/50">진행 공정 시작일 (선택)</label>
                      <input
                        type="date"
                        name="period_start"
                        className="w-full border-b border-nude bg-transparent py-1 text-xs outline-none focus:border-orange-400"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-charcoal/50">종료일 (선택)</label>
                      <input
                        type="date"
                        name="period_end"
                        className="w-full border-b border-nude bg-transparent py-1 text-xs outline-none focus:border-orange-400"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="self-start rounded-full border border-charcoal/30 px-4 py-1 text-xs text-charcoal hover:border-charcoal"
                  >
                    + 사진 등록
                  </button>
                </form>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-sm text-charcoal/50">조건에 맞는 프로젝트가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
