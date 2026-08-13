"use client";

import { useId, useMemo, useState } from "react";

function niceCeil(n: number) {
  if (n <= 5) return Math.max(1, Math.ceil(n));
  const magnitude = Math.pow(10, Math.floor(Math.log10(n)));
  const residual = n / magnitude;
  let niceResidual: number;
  if (residual <= 1) niceResidual = 1;
  else if (residual <= 2) niceResidual = 2;
  else if (residual <= 5) niceResidual = 5;
  else niceResidual = 10;
  return niceResidual * magnitude;
}

export default function TrendLineChart({
  points,
  labelEvery = 1,
}: {
  points: { key: string; label: string; value: number }[];
  labelEvery?: number;
}) {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const width = 800;
  const height = 200;
  const padTop = 12;
  const padBottom = 28;
  const padLeft = 4;
  const padRight = 4;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxValue = niceCeil(Math.max(...points.map((p) => p.value), 1));

  const coords = useMemo(
    () =>
      points.map((p, i) => {
        const x = points.length > 1 ? padLeft + (i / (points.length - 1)) * plotW : padLeft + plotW / 2;
        const y = padTop + plotH - (p.value / maxValue) * plotH;
        return { x, y, ...p };
      }),
    [points, maxValue, plotW, plotH]
  );

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1]?.x.toFixed(1) ?? 0} ${padTop + plotH} L ${coords[0]?.x.toFixed(1) ?? 0} ${padTop + plotH} Z`;

  const gridLines = [0, 0.5, 1].map((f) => padTop + plotH * (1 - f));
  const gridValues = [0, 0.5, 1].map((f) => Math.round(maxValue * f));

  const hovered = hoverIndex !== null ? coords[hoverIndex] : null;
  const last = coords[coords.length - 1];

  function handleMove(event: React.PointerEvent<SVGRectElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const relX = ((event.clientX - rect.left) / rect.width) * width;
    let nearest = 0;
    let nearestDist = Infinity;
    coords.forEach((c, i) => {
      const dist = Math.abs(c.x - relX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height: "auto" }}
        role="img"
        aria-label="기간별 문의 건수 추이"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ea580c" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridLines.map((y, i) => (
          <g key={i}>
            <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#e7e5e4" strokeWidth={1} />
            <text x={padLeft} y={y - 4} fontSize={10} fill="#a8a29e">
              {gridValues[i]}
            </text>
          </g>
        ))}

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path d={linePath} fill="none" stroke="#ea580c" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {last && (
          <>
            <circle cx={last.x} cy={last.y} r={4} fill="#ea580c" stroke="#fff" strokeWidth={2} />
            <text
              x={Math.min(last.x, width - 30)}
              y={last.y - 10}
              fontSize={11}
              fontWeight={600}
              fill="#c2410c"
              textAnchor="end"
            >
              {last.value}
            </text>
          </>
        )}

        {coords.map((c, i) =>
          labelEvery === 1 || i % labelEvery === 0 || i === coords.length - 1 ? (
            <text key={c.key} x={c.x} y={height - 8} fontSize={9} fill="#a8a29e" textAnchor="middle">
              {c.label}
            </text>
          ) : null
        )}

        {hovered && (
          <>
            <line
              x1={hovered.x}
              y1={padTop}
              x2={hovered.x}
              y2={padTop + plotH}
              stroke="#d6d3d1"
              strokeWidth={1}
            />
            <circle cx={hovered.x} cy={hovered.y} r={5} fill="#ea580c" stroke="#fff" strokeWidth={2} />
          </>
        )}

        <rect
          x={padLeft}
          y={0}
          width={plotW}
          height={height}
          fill="transparent"
          onPointerMove={handleMove}
          onPointerLeave={() => setHoverIndex(null)}
        />
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-sm border border-nude/60 bg-white px-2.5 py-1.5 text-xs shadow-sm"
          style={{ left: `${(hovered.x / width) * 100}%` }}
        >
          <p className="font-semibold text-charcoal">{hovered.value}건</p>
          <p className="text-charcoal/50">{hovered.label}</p>
        </div>
      )}

      <details className="mt-2">
        <summary className="cursor-pointer text-[11px] text-charcoal/40 hover:text-charcoal/60">
          표로 보기
        </summary>
        <div className="mt-2 max-h-40 overflow-y-auto rounded-sm border border-nude/40">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-nude/40 text-charcoal/50">
              <tr>
                <th className="px-2 py-1">날짜</th>
                <th className="px-2 py-1 text-right">건수</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.key} className="border-b border-nude/20 last:border-0">
                  <td className="px-2 py-1 text-charcoal/70">{p.label}</td>
                  <td className="px-2 py-1 text-right text-charcoal">{p.value}건</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
