"use client";

import { useMemo, useState } from "react";
import PlaceholderBlock from "./PlaceholderBlock";
import type { PortfolioItem } from "@/lib/types";
import { logPortfolioView } from "@/app/(marketing)/actions";

const FILTERS = ["All", "30PY", "40PY", "50PY"] as const;
type Filter = (typeof FILTERS)[number];

function bucketOf(sizePy: string | null): Filter | null {
  const match = sizePy?.match(/(\d+)/);
  if (!match) return null;
  const n = Number(match[1]);
  if (n < 40) return "30PY";
  if (n < 50) return "40PY";
  return "50PY";
}

export default function ProjectFilterGrid({ items }: { items: PortfolioItem[] }) {
  const [filter, setFilter] = useState<Filter>("All");
  const [selected, setSelected] = useState<PortfolioItem | null>(null);

  const filtered = useMemo(
    () => (filter === "All" ? items : items.filter((item) => bucketOf(item.size_py) === filter)),
    [items, filter]
  );

  function openItem(item: PortfolioItem) {
    setSelected(item);
    logPortfolioView(item.id).catch(() => {});
  }

  return (
    <div>
      <div className="mb-10 flex flex-wrap justify-center gap-3">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full border px-6 py-2 text-sm tracking-wide transition-colors ${
              filter === f
                ? "border-charcoal bg-charcoal text-cream"
                : "border-charcoal/30 text-charcoal hover:border-charcoal"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-charcoal/50">
          해당 평형대의 프로젝트가 아직 없습니다.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item, index) => (
            <button
              key={item.id ?? index}
              type="button"
              onClick={() => openItem(item)}
              className="group block w-full text-left"
            >
              {item.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="aspect-[4/3] w-full rounded-sm object-cover transition-opacity group-hover:opacity-90"
                />
              ) : (
                <PlaceholderBlock label={item.title} className="aspect-[4/3] w-full rounded-sm" />
              )}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm font-medium text-charcoal">{item.title}</span>
                <span className="text-xs tracking-wide text-taupe">{item.size_py ?? item.category ?? ""}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelected(null)}
        >
          <div className="max-h-[90vh] w-full max-w-3xl" onClick={(event) => event.stopPropagation()}>
            {selected.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selected.image_url}
                alt={selected.title}
                className="max-h-[70vh] w-full rounded-sm bg-black object-contain"
              />
            ) : (
              <PlaceholderBlock label={selected.title} className="aspect-[4/3] w-full rounded-sm" />
            )}
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-lg font-medium text-white">{selected.title}</p>
                <p className="text-sm text-white/60">
                  {[selected.size_py, selected.category].filter(Boolean).join(" · ")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-full border border-white/40 px-4 py-1.5 text-sm text-white hover:bg-white/10"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
