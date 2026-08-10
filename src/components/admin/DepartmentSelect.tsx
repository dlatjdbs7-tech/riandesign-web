"use client";

import { useRouter } from "next/navigation";
import { updateEmployeeDepartment } from "@/app/admin/employees/actions";
import { DEPARTMENTS } from "@/lib/departments";

export default function DepartmentSelect({
  employeeId,
  department,
}: {
  employeeId: string;
  department: string | null;
}) {
  const router = useRouter();

  return (
    <select
      key={department}
      defaultValue={department ?? ""}
      onChange={async (event) => {
        await updateEmployeeDepartment(employeeId, event.target.value);
        router.refresh();
      }}
      className="border-b border-nude bg-transparent py-0.5 text-xs text-charcoal/70 outline-none focus:border-orange-400"
    >
      <option value="" disabled>
        미지정
      </option>
      {DEPARTMENTS.map((dept) => (
        <option key={dept} value={dept}>
          {dept}
        </option>
      ))}
    </select>
  );
}
