"use client";

import { useRouter } from "next/navigation";
import { updateAllMenuPermissions } from "@/app/admin/team-permissions/actions";

export default function AllMenuPermissionCheckbox({
  jobRanks,
  menuKeys,
  allChecked,
}: {
  jobRanks: string[];
  menuKeys: string[];
  allChecked: boolean;
}) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] text-charcoal/50">
      <input
        type="checkbox"
        checked={allChecked}
        onChange={async (event) => {
          await updateAllMenuPermissions(jobRanks, menuKeys, event.target.checked);
          router.refresh();
        }}
        className="h-4 w-4 accent-charcoal"
      />
      전체 선택
    </label>
  );
}
