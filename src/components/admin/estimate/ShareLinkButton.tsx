"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";

// 고객에게 보낼 견적서 링크 복사 (카톡·문자에 붙여넣기)
export default function ShareLinkButton({ token, beforeCopy }: { token: string; beforeCopy?: () => Promise<void> }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        if (beforeCopy) await beforeCopy();
        await navigator.clipboard.writeText(`${window.location.origin}/estimate/${token}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-1.5 rounded-full border border-orange-300 bg-white px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50"
    >
      <Link2 size={15} /> {copied ? "링크 복사됨 · 카톡에 붙여넣기" : "고객 링크 복사"}
    </button>
  );
}
