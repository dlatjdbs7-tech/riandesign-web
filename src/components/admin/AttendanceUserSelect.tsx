"use client";

import { useRouter } from "next/navigation";

export default function AttendanceUserSelect({
  employees,
  selectedUserId,
  year,
  month,
}: {
  employees: { id: string; full_name: string }[];
  selectedUserId: string;
  year: number;
  month: number;
}) {
  const router = useRouter();

  return (
    <select
      defaultValue={selectedUserId}
      onChange={(event) => {
        router.push(`/admin/attendance?year=${year}&month=${month}&user=${event.target.value}`);
      }}
      className="border-b border-nude bg-transparent py-1 text-sm outline-none focus:border-orange-400"
    >
      {employees.map((employee) => (
        <option key={employee.id} value={employee.id}>
          {employee.full_name}
        </option>
      ))}
    </select>
  );
}
