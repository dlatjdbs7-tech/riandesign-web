import { createClient } from "@/utils/supabase/server";
import type { WorkSite } from "@/lib/types";
import WorkSiteForm from "@/components/admin/WorkSiteForm";
import { deleteWorkSite } from "./actions";

export default async function WorkSitesPage() {
  const supabase = await createClient();
  const { data: workSites } = await supabase
    .from("work_sites")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<WorkSite[]>();

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-charcoal">근무지 관리</h1>
      <p className="mt-2 text-sm text-charcoal/60">
        등록된 근무지 반경 안에서만 직원들이 출퇴근을 기록할 수 있습니다. 현장에 직접 가서
        &quot;현재 위치 사용&quot;을 누르면 정확하게 등록됩니다.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="overflow-x-auto rounded-sm border border-nude/60 bg-white">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="border-b border-nude/60 text-xs tracking-wide text-charcoal/60">
              <tr>
                <th className="px-4 py-3">이름</th>
                <th className="px-4 py-3">주소</th>
                <th className="px-4 py-3">반경(m)</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {workSites?.map((site) => (
                <tr key={site.id} className="border-b border-nude/30 last:border-0">
                  <td className="px-4 py-3">{site.name}</td>
                  <td className="px-4 py-3 text-charcoal/70">{site.address ?? "-"}</td>
                  <td className="px-4 py-3 text-charcoal/70">{site.radius_meters}</td>
                  <td className="px-4 py-3">
                    <form action={deleteWorkSite.bind(null, site.id)}>
                      <button
                        type="submit"
                        className="text-xs text-red-700 underline hover:no-underline"
                      >
                        삭제
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {(!workSites || workSites.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-charcoal/50">
                    등록된 근무지가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <WorkSiteForm />
      </div>
    </div>
  );
}
