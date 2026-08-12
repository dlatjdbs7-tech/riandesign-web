"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createWorkOrderTask } from "@/app/admin/field-management/schedule/actions";

export default function ScheduleQuickAddChip({ workOrderId, date }: { workOrderId: string; date: string }) {
  const [value, setValue] = useState("");
  const router = useRouter();

  async function submit() {
    const title = value.trim();
    if (!title) return;
    setValue("");

    const formData = new FormData();
    formData.set("work_order_id", workOrderId);
    formData.set("title", title);
    formData.set("start_date", date);
    formData.set("end_date", date);
    await createWorkOrderTask(formData);
    router.refresh();
  }

  return (
    <input
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.nativeEvent.isComposing) {
          event.preventDefault();
          submit();
        }
      }}
      onBlur={submit}
      placeholder="+ 공정 추가"
      className="w-full truncate rounded-sm border border-dashed border-stone-300 bg-transparent px-1 py-0.5 text-[10px] text-charcoal/40 opacity-0 outline-none transition-opacity focus:opacity-100 focus:border-orange-400 group-hover:opacity-100"
    />
  );
}
