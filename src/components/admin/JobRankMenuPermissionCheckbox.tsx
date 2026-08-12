"use client";

import { useRouter } from "next/navigation";
import { updateJobRankMenuPermission } from "@/app/admin/team-permissions/actions";

export default function JobRankMenuPermissionCheckbox({
  jobRank,
  menuKey,
  canView,
}: {
  jobRank: string;
  menuKey: string;
  canView: boolean;
}) {
  const router = useRouter();

  return (
    <input
      type="checkbox"
      defaultChecked={canView}
      onChange={async (event) => {
        await updateJobRankMenuPermission(jobRank, menuKey, event.target.checked);
        router.refresh();
      }}
      className="h-4 w-4 accent-charcoal"
    />
  );
}
