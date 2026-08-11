"use client";

import { useRouter } from "next/navigation";
import { updateWorkOrderField } from "@/app/admin/work-orders/actions";

export default function ScheduleNotesField({
  workOrderId,
  notes,
}: {
  workOrderId: string;
  notes: string | null;
}) {
  const router = useRouter();

  return (
    <textarea
      key={notes}
      defaultValue={notes ?? ""}
      onBlur={async (event) => {
        if (event.target.value === (notes ?? "")) return;
        await updateWorkOrderField(workOrderId, "schedule_notes", event.target.value);
        router.refresh();
      }}
      rows={4}
      placeholder="수기로 메모를 남겨보세요 (자재 협의, 특이사항 등)"
      className="w-full resize-y rounded-sm border border-nude/50 bg-cream/40 p-3 text-sm text-charcoal outline-none placeholder:text-charcoal/30 focus:border-gold"
    />
  );
}
