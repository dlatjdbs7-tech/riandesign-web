"use client";

import { useRouter } from "next/navigation";
import { updateMenuPermission } from "@/app/admin/team-permissions/actions";
import type { ConfigurableRole } from "@/lib/menu";

export default function MenuPermissionCheckbox({
  role,
  menuKey,
  canView,
}: {
  role: ConfigurableRole;
  menuKey: string;
  canView: boolean;
}) {
  const router = useRouter();

  return (
    <input
      type="checkbox"
      defaultChecked={canView}
      onChange={async (event) => {
        await updateMenuPermission(role, menuKey, event.target.checked);
        router.refresh();
      }}
      className="h-4 w-4 accent-charcoal"
    />
  );
}
