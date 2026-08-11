"use client";

import { useRouter } from "next/navigation";
import { updateWorkOrderTaskDetails } from "@/app/admin/field-management/schedule/actions";

export default function ScheduleTaskChip({
  taskId,
  title,
  startDate,
  endDate,
  className,
}: {
  taskId: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  className: string;
}) {
  const router = useRouter();

  return (
    <input
      key={title}
      defaultValue={title}
      onBlur={async (event) => {
        const newTitle = event.target.value.trim();
        if (!newTitle) {
          event.target.value = title;
          return;
        }
        if (newTitle === title) return;

        const formData = new FormData();
        formData.set("title", newTitle);
        formData.set("start_date", startDate ?? "");
        formData.set("end_date", endDate ?? "");
        await updateWorkOrderTaskDetails(taskId, formData);
        router.refresh();
      }}
      title={title}
      className={`w-full truncate outline-none focus:ring-1 focus:ring-orange-400 ${className}`}
    />
  );
}
