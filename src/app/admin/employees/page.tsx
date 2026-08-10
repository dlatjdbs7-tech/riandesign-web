import { createClient } from "@/utils/supabase/server";
import type { Profile } from "@/lib/types";
import { approveEmployee, rejectEmployee } from "./actions";
import CategorySection from "@/components/admin/CategorySection";
import DepartmentSelect from "@/components/admin/DepartmentSelect";

const STATUS_LABEL: Record<Profile["status"], string> = {
  pending: "승인대기",
  approved: "승인됨",
  rejected: "거절됨",
};

const ROLE_LABEL: Record<Profile["role"], string> = {
  owner: "대표",
  manager: "팀장",
  employee: "직원",
};

export default async function EmployeesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();

  const { data: employees } = await supabase
    .from("profiles")
    .select("*")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false })
    .returns<Profile[]>();

  const canApprove = me?.role === "owner";
  const canManage = me?.role === "owner" || me?.role === "manager";

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-charcoal">팀원정보</h1>
      <p className="mt-2 text-sm text-charcoal/60">
        새로 가입한 직원은 &quot;승인대기&quot; 상태이며, 승인해야 시스템을 이용할 수 있습니다.
      </p>

      <div className="mt-6 overflow-x-auto rounded-sm border border-nude/60 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-nude/60 text-xs tracking-wide text-charcoal/60">
            <tr>
              <th className="px-4 py-3">이름</th>
              <th className="px-4 py-3">아이디</th>
              <th className="px-4 py-3">부서</th>
              <th className="px-4 py-3">입사일</th>
              <th className="px-4 py-3">권한</th>
              <th className="px-4 py-3">상태</th>
              {canApprove && <th className="px-4 py-3">처리</th>}
            </tr>
          </thead>
          <tbody>
            {employees?.map((employee) => (
              <tr key={employee.id} className="border-b border-nude/30 last:border-0">
                <td className="px-4 py-3">{employee.full_name}</td>
                <td className="px-4 py-3 text-charcoal/70">{employee.username ?? "-"}</td>
                <td className="px-4 py-3 text-charcoal/70">
                  {canApprove ? (
                    <DepartmentSelect employeeId={employee.id} department={employee.department} />
                  ) : (
                    employee.department ?? "-"
                  )}
                </td>
                <td className="px-4 py-3 text-charcoal/70">{employee.hire_date ?? "-"}</td>
                <td className="px-4 py-3 text-charcoal/70">{ROLE_LABEL[employee.role]}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      employee.status === "pending"
                        ? "text-gold"
                        : employee.status === "approved"
                          ? "text-emerald-700"
                          : "text-red-700"
                    }
                  >
                    {STATUS_LABEL[employee.status]}
                  </span>
                </td>
                {canApprove && (
                  <td className="px-4 py-3">
                    {employee.status === "pending" && (
                      <div className="flex gap-2">
                        <form action={approveEmployee.bind(null, employee.id)}>
                          <button
                            type="submit"
                            className="rounded-full bg-charcoal px-3 py-1 text-xs text-cream hover:bg-gold"
                          >
                            승인
                          </button>
                        </form>
                        <form action={rejectEmployee.bind(null, employee.id)}>
                          <button
                            type="submit"
                            className="rounded-full border border-charcoal/30 px-3 py-1 text-xs text-charcoal hover:border-charcoal"
                          >
                            거절
                          </button>
                        </form>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CategorySection type="팀원" canManage={canManage} />
    </div>
  );
}
