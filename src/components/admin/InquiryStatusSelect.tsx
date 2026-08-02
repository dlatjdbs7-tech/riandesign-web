"use client";

import { useRouter } from "next/navigation";
import { updateInquiryStatus } from "@/app/admin/inquiries/actions";
import type { InquiryStatus } from "@/lib/types";

const STATUS_LABEL: Record<InquiryStatus, string> = {
  new: "신규",
  contacted: "연락완료",
  closed: "종결",
};

export default function InquiryStatusSelect({ id, status }: { id: string; status: InquiryStatus }) {
  const router = useRouter();

  return (
    <select
      defaultValue={status}
      onChange={async (event) => {
        await updateInquiryStatus(id, event.target.value as InquiryStatus);
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
