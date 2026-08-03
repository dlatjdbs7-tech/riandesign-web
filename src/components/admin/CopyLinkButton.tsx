"use client";

import { useState } from "react";

export default function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded-full border border-charcoal/30 px-4 py-1.5 text-xs text-charcoal hover:border-charcoal"
    >
      {copied ? "복사됨" : "링크 복사"}
    </button>
  );
}
