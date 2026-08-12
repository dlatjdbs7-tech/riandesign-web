"use client";

import { useRouter } from "next/navigation";
import { updateEmployeeJobRank } from "@/app/admin/team-permissions/actions";
import { JOB_RANKS } from "@/lib/jobRanks";

export default function JobRankCheckboxes({
  id,
  jobRank,
}: {
  id: string;
  jobRank: string | null;
}) {
  const router = useRouter();

  return (
    <>
      {JOB_RANKS.map((rank) => (
        <td key={rank} className="px-2 py-2 text-center">
          <input
            type="checkbox"
            checked={jobRank === rank}
            onChange={async (event) => {
              await updateEmployeeJobRank(id, event.target.checked ? rank : "");
              router.refresh();
            }}
            className="h-4 w-4 accent-charcoal"
          />
        </td>
      ))}
    </>
  );
}
