"use client";

import { useRouter } from "next/navigation";
import { updateWorkOrderAssignee } from "@/app/admin/work-orders/actions";

export default function AssigneeSelect({
  workOrderId,
  assigneeId,
  employees,
}: {
  workOrderId: string;
  assigneeId: string | null;
  employees: { id: string; full_name: string }[];
}) {
  const router = useRouter();

  return (
    <select
      defaultValue={assigneeId ?? ""}
      onChange={async (event) => {
        const formData = new FormData();
        formData.set("assignee_id", event.target.value);
        await updateWorkOrderAssignee(workOrderId, formData);
        router.refresh();
      }}
      className="border-b border-nude bg-transparent py-0.5 text-sm text-charcoal outline-none focus:border-orange-400"
    >
      <option value="">미지정</option>
      {employees.map((employee) => (
        <option key={employee.id} value={employee.id}>
          {employee.full_name}
        </option>
      ))}
    </select>
  );
}
