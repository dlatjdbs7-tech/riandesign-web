"use client";

import { useRouter } from "next/navigation";
import { updateQuoteStatus } from "@/app/admin/quotes/actions";
import type { QuoteStatus } from "@/lib/types";

const STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: "초안",
  sent: "발송됨",
  accepted: "수락됨",
  rejected: "거절됨",
};

export default function QuoteStatusSelect({ id, status }: { id: string; status: QuoteStatus }) {
  const router = useRouter();

  return (
    <select
      defaultValue={status}
      onChange={async (event) => {
        await updateQuoteStatus(id, event.target.value as QuoteStatus);
        router.refresh();
      }}
      className="border-b border-nude bg-transparent py-1 text-xs outline-none"
    >
      {Object.entries(STATUS_LABEL).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
