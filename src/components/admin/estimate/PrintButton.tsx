"use client";

import { Printer } from "lucide-react";

export default function PrintButton({ label = "인쇄 · PDF 저장" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex items-center gap-1.5 rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600"
    >
      <Printer size={15} /> {label}
    </button>
  );
}
