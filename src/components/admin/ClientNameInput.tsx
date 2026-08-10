"use client";

import { useRouter } from "next/navigation";
import { updateWorkOrderClientName } from "@/app/admin/work-orders/actions";

export default function ClientNameInput({
  workOrderId,
  clientName,
}: {
  workOrderId: string;
  clientName: string;
}) {
  const router = useRouter();

  return (
    <input
      key={clientName}
      defaultValue={clientName}
      placeholder="고객명 입력"
      onBlur={async (event) => {
        const value = event.target.value.trim();
        if (value === clientName) return;
        await updateWorkOrderClientName(workOrderId, value);
        router.refresh();
      }}
      className="w-24 border-b border-transparent bg-transparent text-xs font-normal text-charcoal/50 outline-none hover:border-nude focus:border-orange-400 focus:text-charcoal"
    />
  );
}
