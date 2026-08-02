"use client";

import { useRouter } from "next/navigation";
import { updateTransactionStatus } from "@/app/admin/transactions/actions";
import type { TransactionStatus } from "@/lib/types";

const STATUS_LABEL: Record<TransactionStatus, string> = {
  unpaid: "미수금",
  partial: "부분입금",
  paid: "완납",
};

export default function TransactionStatusSelect({
  id,
  status,
}: {
  id: string;
  status: TransactionStatus;
}) {
  const router = useRouter();

  return (
    <select
      defaultValue={status}
      onChange={async (event) => {
        await updateTransactionStatus(id, event.target.value as TransactionStatus);
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
