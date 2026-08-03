import { Fragment } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { Profile } from "@/lib/types";
import { MENU_GROUPS, CONFIGURABLE_ROLES } from "@/lib/menu";
import { createTeam } from "./actions";
import { RoleSelect, TeamSelect } from "@/components/admin/EmployeeRoleTeamSelects";
import MenuPermissionCheckbox from "@/components/admin/MenuPermissionCheckbox";

const ROLE_LABEL = { manager: "팀장", employee: "직원" } as const;

export default async function TeamPermissionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();

  if (me?.role !== "owner") {
    redirect("/admin");
  }

  const { data: employees } = await supabase
    .from("profiles")
    .select("*")
    .eq("status", "approved")
    .order("full_name")
    .returns<Profile[]>();

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name")
    .order("name")
    .returns<{ id: string; name: string }[]>();

  const { data: permissions } = await supabase
    .from("role_menu_permissions")
    .select("role, menu_key, can_view")
    .returns<{ role: string; menu_key: string; can_view: boolean }[]>();

  const permissionMap = new Map(
    (permissions ?? []).map((p) => [`${p.role}:${p.menu_key}`, p.can_view])
  );

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-charcoal">팀원 권한</h1>
      <p className="mt-2 text-sm text-charcoal/60">직원의 권한(대표/팀장/직원)과 소속 팀을 관리합니다.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="overflow-x-auto rounded-sm border border-nude/60 bg-white">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="border-b border-nude/60 text-xs tracking-wide text-charcoal/60">
              <tr>
                <th className="px-4 py-3">이름</th>
                <th className="px-4 py-3">권한</th>
                <th className="px-4 py-3">소속 팀</th>
              </tr>
            </thead>
            <tbody>
              {employees?.map((employee) => (
                <tr key={employee.id} className="border-b border-nude/30 last:border-0">
                  <td className="px-4 py-3">{employee.full_name}</td>
                  <td className="px-4 py-3">
                    <RoleSelect id={employee.id} role={employee.role} />
                  </td>
                  <td className="px-4 py-3">
                    <TeamSelect id={employee.id} teamId={employee.team_id} teams={teams ?? []} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form action={createTeam} className="flex h-fit flex-col gap-4 rounded-sm border border-nude/60 bg-white p-6">
          <p className="text-xs tracking-wide text-charcoal/70">새 팀 만들기</p>
          <input name="name" placeholder="팀 이름 (예: 시공1팀)" required className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold" />
          <button type="submit" className="self-start rounded-full bg-charcoal px-6 py-2 text-sm tracking-wide text-cream hover:bg-gold">
            팀 등록
          </button>
        </form>
      </div>

      <div className="mt-10">
        <h2 className="font-serif text-lg font-semibold text-charcoal">메뉴 접근 권한</h2>
        <p className="mt-1 text-sm text-charcoal/60">
          팀장/직원이 로그인했을 때 왼쪽 메뉴에 어떤 항목이 보일지 설정합니다. 대표는 항상 전체
          메뉴에 접근할 수 있습니다.
        </p>

        <div className="mt-4 overflow-x-auto rounded-sm border border-nude/60 bg-white">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="border-b border-nude/60 text-xs tracking-wide text-charcoal/60">
              <tr>
                <th className="px-4 py-3">메뉴</th>
                {CONFIGURABLE_ROLES.map((role) => (
                  <th key={role} className="px-4 py-3 text-center">
                    {ROLE_LABEL[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MENU_GROUPS.map((group) => (
                <Fragment key={group.label}>
                  <tr className="bg-beige/40">
                    <td colSpan={1 + CONFIGURABLE_ROLES.length} className="px-4 py-1.5 text-[10px] tracking-[0.2em] text-charcoal/50">
                      {group.label}
                    </td>
                  </tr>
                  {group.items.map((item) => (
                    <tr key={item.key} className="border-b border-nude/30 last:border-0">
                      <td className="px-4 py-2">{item.label}</td>
                      {CONFIGURABLE_ROLES.map((role) => (
                        <td key={role} className="px-4 py-2 text-center">
                          <MenuPermissionCheckbox
                            role={role}
                            menuKey={item.key}
                            canView={permissionMap.get(`${role}:${item.key}`) ?? true}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
