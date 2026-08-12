"use client";

import { useRouter } from "next/navigation";
import { updateWorkOrderField } from "@/app/admin/work-orders/actions";

export default function WorkOrderTitleCell({ id, title }: { id: string; title: string }) {
  const router = useRouter();

  return (
    <input
      key={title}
      defaultValue={title}
      onBlur={async (event) => {
        const value = event.target.value.trim();
        if (!value || value === title) {
          event.target.value = title;
          return;
        }
        await updateWorkOrderField(id, "title", value);
        router.refresh();
      }}
      className="w-full border-b border-nude bg-transparent py-1 text-sm text-charcoal outline-none focus:border-gold"
    />
  );
}
