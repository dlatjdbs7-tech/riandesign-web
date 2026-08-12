"use client";

import { useRouter } from "next/navigation";
import { updateAllJobRankMenuPermissions } from "@/app/admin/team-permissions/actions";

export default function JobRankSelectAllCheckbox({
  jobRank,
  menuKeys,
  allChecked,
}: {
  jobRank: string;
  menuKeys: string[];
  allChecked: boolean;
}) {
  const router = useRouter();

  return (
    <input
      type="checkbox"
      checked={allChecked}
      title="전체 선택"
      onChange={async (event) => {
        await updateAllJobRankMenuPermissions(jobRank, menuKeys, event.target.checked);
        router.refresh();
      }}
      className="h-4 w-4 accent-charcoal"
    />
  );
}
