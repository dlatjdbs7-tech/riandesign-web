import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { AttendanceLeave, AttendanceRecord, Profile } from "@/lib/types";
import { formatKST, getKSTCurrentYearMonth, getKSTDateBounds, getMonthGridWeeks } from "@/lib/date";
import AttendanceCheckInOut from "@/components/admin/AttendanceCheckInOut";
import AttendanceUserSelect from "@/components/admin/AttendanceUserSelect";
import AttendanceDayActions from "@/components/admin/AttendanceDayActions";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const LATE_HOUR = 9;
const LATE_MINUTE = 10;

type RecordWithRelations = AttendanceRecord & {
  profiles: Pick<Profile, "full_name" | "department"> | null;
  work_sites: { name: string } | null;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function toKSTDateString(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(iso));
}

function toKSTTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function isLateCheckIn(iso: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(new Date(iso));
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour > LATE_HOUR || (hour === LATE_HOUR && minute > LATE_MINUTE);
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; user?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();

  const canManage = me?.role === "owner" || me?.role === "manager";

  const { data: employees } = canManage
    ? await supabase
        .from("profiles")
        .select("id, full_name, team_id")
        .eq("status", "approved")
        .order("full_name")
        .returns<(Pick<Profile, "id" | "full_name" | "team_id">)[]>()
    : { data: null };

  const visibleEmployees =
    me?.role === "owner"
      ? (employees ?? [])
      : (employees ?? []).filter((e) => e.id === user!.id || e.team_id === me?.team_id);

  const viewingUserId = canManage && params.user ? params.user : user!.id;

  const current = getKSTCurrentYearMonth();
  const { todayDateString } = getKSTDateBounds();
  const year = Number(params.year) || current.year;
  const month = Number(params.month) || current.month;

  const monthStart = `${year}-${pad(month)}-01`;
  const monthEnd = `${year}-${pad(month)}-${pad(lastDayOfMonth(year, month))}`;

  let prevYear = year;
  let prevMonth = month - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }
  let nextYear = year;
  let nextMonth = month + 1;
  if (nextMonth === 13) {
    nextMonth = 1;
    nextYear += 1;
  }

  const { data: openRecord } = await supabase
    .from("attendance_records")
    .select("id")
    .eq("user_id", user!.id)
    .is("check_out_at", null)
    .maybeSingle();

  const nextMonthStart = `${nextYear}-${pad(nextMonth)}-01`;

  const { data: monthRecords } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("user_id", viewingUserId)
    .gte("check_in_at", `${monthStart}T00:00:00+09:00`)
    .lt("check_in_at", `${nextMonthStart}T00:00:00+09:00`)
    .returns<AttendanceRecord[]>();

  const { data: monthLeaves } = await supabase
    .from("attendance_leaves")
    .select("*")
    .eq("user_id", viewingUserId)
    .gte("leave_date", monthStart)
    .lte("leave_date", monthEnd)
    .returns<AttendanceLeave[]>();

  const recordsByDate = new Map<string, AttendanceRecord>();
  monthRecords?.forEach((record) => {
    if (record.check_in_at) recordsByDate.set(toKSTDateString(record.check_in_at), record);
  });
  const leaveByDate = new Map<string, AttendanceLeave["leave_type"]>();
  monthLeaves?.forEach((leave) => leaveByDate.set(leave.leave_date, leave.leave_type));

  const { data: records } = await supabase
    .from("attendance_records")
    .select("*, profiles(full_name, department), work_sites(name)")
    .order("check_in_at", { ascending: false })
    .limit(50)
    .returns<RecordWithRelations[]>();

  const weeks = getMonthGridWeeks(year, month);
  const canEditLeave = canManage || viewingUserId === user!.id;
  const viewingName =
    viewingUserId === user!.id
      ? "내"
      : (visibleEmployees.find((e) => e.id === viewingUserId)?.full_name ?? "");

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-charcoal">근태 관리</h1>

      <div className="mt-6 rounded-sm border border-nude/60 bg-white p-6">
        <AttendanceCheckInOut isCheckedIn={!!openRecord} />
      </div>

      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-lg font-semibold text-charcoal">{viewingName} 월간 근태</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-xs text-charcoal/60">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-100 ring-1 ring-red-400" />
                지각
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-orange-200" />
                반차
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-stone-300" />
                휴무
              </span>
            </div>
            {canManage && visibleEmployees.length > 0 && (
              <AttendanceUserSelect
                employees={visibleEmployees}
                selectedUserId={viewingUserId}
                year={year}
                month={month}
              />
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Link
            href={`/admin/attendance?year=${prevYear}&month=${prevMonth}&user=${viewingUserId}`}
            className="rounded-full border border-nude px-4 py-1.5 text-sm text-charcoal hover:border-charcoal"
          >
            ← 이전
          </Link>
          <div className="flex items-center gap-3">
            <h3 className="font-serif text-xl text-charcoal">
              {year}년 {month}월
            </h3>
            <Link
              href={`/admin/attendance?user=${viewingUserId}`}
              className="text-xs text-taupe hover:text-gold"
            >
              오늘
            </Link>
          </div>
          <Link
            href={`/admin/attendance?year=${nextYear}&month=${nextMonth}&user=${viewingUserId}`}
            className="rounded-full border border-nude px-4 py-1.5 text-sm text-charcoal hover:border-charcoal"
          >
            다음 →
          </Link>
        </div>

        <div className="mt-4 overflow-hidden rounded-sm border border-nude/60 bg-white">
          <div className="grid grid-cols-7 border-b border-nude/60 bg-beige/40 text-center text-xs tracking-wide text-charcoal/60">
            {WEEKDAYS.map((day, i) => (
              <div key={day} className={`py-2 ${i === 0 ? "text-red-600" : i === 6 ? "text-blue-600" : ""}`}>
                {day}
              </div>
            ))}
          </div>

          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 border-b border-nude/30 last:border-0">
              {week.map((cell, dayIndex) => {
                const record = recordsByDate.get(cell.dateString);
                const leaveType = leaveByDate.get(cell.dateString) ?? null;
                const isToday = cell.dateString === todayDateString;
                const late = record?.check_in_at ? isLateCheckIn(record.check_in_at) : false;

                return (
                  <div
                    key={cell.dateString}
                    className={`group flex min-h-[92px] flex-col gap-1 border-r border-nude/20 p-1.5 last:border-r-0 ${
                      !cell.isCurrentMonth ? "bg-cream/40" : ""
                    } ${late ? "bg-red-50/60" : ""}`}
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                        isToday
                          ? "bg-charcoal text-cream"
                          : !cell.isCurrentMonth
                            ? "text-charcoal/30"
                            : dayIndex === 0
                              ? "text-red-600"
                              : dayIndex === 6
                                ? "text-blue-600"
                                : "text-charcoal"
                      }`}
                    >
                      {cell.day}
                    </span>

                    {leaveType && (
                      <span
                        className={`self-start rounded-sm px-1.5 py-0.5 text-[10px] ${
                          leaveType === "반차" ? "bg-orange-200 text-orange-900" : "bg-stone-300 text-charcoal/80"
                        }`}
                      >
                        {leaveType}
                      </span>
                    )}

                    {record?.check_in_at && (
                      <div className="text-[10px] leading-tight text-charcoal/70">
                        <span>출근 {toKSTTime(record.check_in_at)}</span>
                        {late && <span className="ml-1 rounded-sm bg-red-100 px-1 text-red-700">지각</span>}
                      </div>
                    )}
                    {record?.check_out_at && (
                      <div className="text-[10px] leading-tight text-charcoal/50">
                        퇴근 {toKSTTime(record.check_out_at)}
                      </div>
                    )}

                    {canEditLeave && cell.isCurrentMonth && (
                      <AttendanceDayActions
                        userId={viewingUserId}
                        dateString={cell.dateString}
                        leaveType={leaveType}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-charcoal/40">
          출근 {LATE_HOUR}시 {LATE_MINUTE}분 이후 체크인은 지각으로 표시됩니다. 칸에 마우스를 올리면 반차/휴무를
          등록할 수 있습니다.
        </p>
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
                <td className="px-4 py-3 text-charcoal/70">{formatKST(record.check_in_at)}</td>
                <td className="px-4 py-3 text-charcoal/70">{formatKST(record.check_out_at)}</td>
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
