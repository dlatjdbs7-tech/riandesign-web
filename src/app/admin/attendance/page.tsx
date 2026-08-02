import { createClient } from "@/utils/supabase/server";
import type { AttendanceRecord, Profile } from "@/lib/types";
import AttendanceCheckInOut from "@/components/admin/AttendanceCheckInOut";

type RecordWithRelations = AttendanceRecord & {
  profiles: Pick<Profile, "full_name" | "department"> | null;
  work_sites: { name: string } | null;
};

export default async function AttendancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: openRecord } = await supabase
    .from("attendance_records")
    .select("id")
    .eq("user_id", user!.id)
    .is("check_out_at", null)
    .maybeSingle();

  const { data: records } = await supabase
    .from("attendance_records")
    .select("*, profiles(full_name, department), work_sites(name)")
    .order("check_in_at", { ascending: false })
    .limit(50)
    .returns<RecordWithRelations[]>();

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-charcoal">근태 관리</h1>

      <div className="mt-6 rounded-sm border border-nude/60 bg-white p-6">
        <AttendanceCheckInOut isCheckedIn={!!openRecord} />
      </div>

      <div className="mt-8 overflow-x-auto rounded-sm border border-nude/60 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-nude/60 text-xs tracking-wide text-charcoal/60">
            <tr>
              <th className="px-4 py-3">이름</th>
              <th className="px-4 py-3">부서</th>
              <th className="px-4 py-3">근무지</th>
              <th className="px-4 py-3">출근</th>
              <th className="px-4 py-3">퇴근</th>
            </tr>
          </thead>
          <tbody>
            {records?.map((record) => (
              <tr key={record.id} className="border-b border-nude/30 last:border-0">
                <td className="px-4 py-3">{record.profiles?.full_name ?? "-"}</td>
                <td className="px-4 py-3 text-charcoal/70">{record.profiles?.department ?? "-"}</td>
                <td className="px-4 py-3 text-charcoal/70">{record.work_sites?.name ?? "-"}</td>
                <td className="px-4 py-3 text-charcoal/70">
                  {record.check_in_at ? new Date(record.check_in_at).toLocaleString("ko-KR") : "-"}
                </td>
                <td className="px-4 py-3 text-charcoal/70">
                  {record.check_out_at
                    ? new Date(record.check_out_at).toLocaleString("ko-KR")
                    : "-"}
                </td>
              </tr>
            ))}
            {(!records || records.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-charcoal/50">
                  근태 기록이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
