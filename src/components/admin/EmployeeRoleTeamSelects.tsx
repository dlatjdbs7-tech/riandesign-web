"use client";

import { useRouter } from "next/navigation";
import { updateEmployeeRole, updateEmployeeTeam } from "@/app/admin/team-permissions/actions";
import type { UserRole } from "@/lib/types";

const ROLE_LABEL: Record<UserRole, string> = {
  owner: "대표",
  manager: "팀장",
  employee: "직원",
};

export function RoleSelect({ id, role }: { id: string; role: UserRole }) {
  const router = useRouter();

  return (
    <select
      defaultValue={role}
      onChange={async (event) => {
        await updateEmployeeRole(id, event.target.value as UserRole);
        router.refresh();
      }}
      className="border-b border-nude bg-transparent py-1 text-xs outline-none"
    >
      {Object.entries(ROLE_LABEL).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}

export function TeamSelect({
  id,
  teamId,
  teams,
}: {
  id: string;
  teamId: string | null;
  teams: { id: string; name: string }[];
}) {
  const router = useRouter();

  return (
    <select
      defaultValue={teamId ?? ""}
      onChange={async (event) => {
        await updateEmployeeTeam(id, event.target.value);
        router.refresh();
      }}
      className="border-b border-nude bg-transparent py-1 text-xs outline-none"
    >
      <option value="">미배정</option>
      {teams.map((team) => (
        <option key={team.id} value={team.id}>
          {team.name}
        </option>
      ))}
    </select>
  );
}
