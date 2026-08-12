"use client";

import { useRouter } from "next/navigation";
import { updateEmployeeJobRank } from "@/app/admin/employees/actions";
import { JOB_RANKS } from "@/lib/jobRanks";

export default function JobRankSelect({
  employeeId,
  jobRank,
}: {
  employeeId: string;
  jobRank: string | null;
}) {
  const router = useRouter();

  return (
    <select
      key={jobRank}
      defaultValue={jobRank ?? ""}
      onChange={async (event) => {
        await updateEmployeeJobRank(employeeId, event.target.value);
        router.refresh();
      }}
      className="border-b border-nude bg-transparent py-0.5 text-xs text-charcoal/70 outline-none focus:border-orange-400"
    >
      <option value="" disabled>
        미지정
      </option>
      {JOB_RANKS.map((rank) => (
        <option key={rank} value={rank}>
          {rank}
        </option>
      ))}
    </select>
  );
}
