"use client";

import { useEffect, type ReactNode } from "react";

// 고객 견적서: 인쇄·저장·복사·우클릭을 막는다 (화면 캡처까지 막을 수는 없음)
export default function NoCopy({ children, watermark }: { children: ReactNode; watermark: string }) {
  useEffect(() => {
    const block = (e: Event) => e.preventDefault();
    const keys = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["p", "s", "c", "a"].includes(k)) e.preventDefault();
    };
    document.addEventListener("contextmenu", block);
    document.addEventListener("copy", block);
    document.addEventListener("dragstart", block);
    document.addEventListener("keydown", keys);
    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("copy", block);
      document.removeEventListener("dragstart", block);
      document.removeEventListener("keydown", keys);
    };
  }, []);

  return (
    <div className="relative select-none" style={{ WebkitTouchCallout: "none" }}>
      <style>{`@media print { body { display: none !important; } }`}</style>
      {children}
      {/* 옅은 워터마크: 캡처해서 돌려도 누구 견적서인지 보이게 */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-40 overflow-hidden opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(
            `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'><text x='0' y='100' transform='rotate(-20 160 90)' font-size='18' font-family='sans-serif' fill='black'>${watermark}</text></svg>`
          )}")`,
        }}
      />
    </div>
  );
}
