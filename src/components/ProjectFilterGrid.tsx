"use client";

import { useMemo, useState } from "react";
import PlaceholderBlock from "./PlaceholderBlock";
import type { PortfolioItem } from "@/lib/types";

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

  const filtered = useMemo(
    () => (filter === "All" ? items : items.filter((item) => bucketOf(item.size_py) === filter)),
    [items, filter]
  );

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
            <div key={item.id ?? index} className="group">
              {item.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="aspect-[4/3] w-full rounded-sm object-cover"
                />
              ) : (
                <PlaceholderBlock label={item.title} className="aspect-[4/3] w-full rounded-sm" />
              )}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm font-medium text-charcoal">{item.title}</span>
                <span className="text-xs tracking-wide text-taupe">{item.size_py ?? item.category ?? ""}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
