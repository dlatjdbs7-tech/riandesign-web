import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { Profile } from "@/lib/types";
import { createTeam } from "./actions";
import { RoleSelect, TeamSelect } from "@/components/admin/EmployeeRoleTeamSelects";

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
    </div>
  );
}
