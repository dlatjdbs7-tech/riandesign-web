import { createClient } from "@/utils/supabase/server";
import type { Profile, WorkLog } from "@/lib/types";
import { formatKST, getKSTWeekBounds } from "@/lib/date";
import { upsertWeeklyWorkLog } from "./actions";

type WeeklyLogRow = WorkLog & { profiles: Pick<Profile, "full_name" | "department"> | null };

function formatWeekRange(weekStartDate: string) {
  const start = new Date(`${weekStartDate}T00:00:00Z`);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
  return `${fmt(start)} ~ ${fmt(end)}`;
}

export default async function WorkLogsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("*").eq("id", user!.id).single<Profile>();
  const canManage = me?.role === "owner" || me?.role === "manager";

  const { weekStartDate } = getKSTWeekBounds();

  const [{ data: myWeekLog }, { data: logs }] = await Promise.all([
    supabase
      .from("work_logs")
      .select("content")
      .eq("author_id", user!.id)
      .eq("week_start_date", weekStartDate)
      .maybeSingle<Pick<WorkLog, "content">>(),
    supabase
      .from("work_logs")
      .select("*, profiles(full_name, department)")
      .not("week_start_date", "is", null)
      .order("week_start_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<WeeklyLogRow[]>(),
  ]);

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-charcoal">업무일지</h1>
      <p className="mt-2 text-sm text-charcoal/60">
        한 주간 진행한 업무를 정리해서 대표에게 보고합니다. 한 주에 한 건씩 작성하며, 다시 제출하면 이번 주 내용이
        수정됩니다.
      </p>

      <form
        action={upsertWeeklyWorkLog.bind(null, weekStartDate)}
        className="mt-6 flex flex-col gap-3 rounded-sm border border-nude/60 bg-white p-4"
      >
        <span className="text-sm font-medium text-charcoal">이번 주 ({formatWeekRange(weekStartDate)})</span>
        <textarea
          name="content"
          rows={5}
          required
          defaultValue={myWeekLog?.content ?? ""}
          placeholder="이번 주 진행한 업무 내용을 정리해서 기록하세요."
          className="resize-none rounded-sm border border-nude/40 bg-beige/20 p-3 text-sm outline-none focus:border-gold"
        />
        <button
          type="submit"
          className="self-start rounded-full bg-charcoal px-5 py-2 text-xs tracking-wide text-cream hover:bg-gold"
        >
          {myWeekLog ? "이번 주 보고서 수정" : "이번 주 보고서 제출"}
        </button>
      </form>

      <div className="mt-8 overflow-x-auto rounded-sm border border-nude/60 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-nude/60 text-xs tracking-wide text-charcoal/60">
            <tr>
              <th className="w-28 px-4 py-3">주차</th>
              {canManage && <th className="w-24 px-4 py-3">작성자</th>}
              {canManage && <th className="w-24 px-4 py-3">부서</th>}
              <th className="px-4 py-3">내용</th>
              <th className="w-40 px-4 py-3 text-right">제출일</th>
            </tr>
          </thead>
          <tbody>
            {logs?.map((log) => (
              <tr key={log.id} className="border-b border-nude/30 align-top last:border-0">
                <td className="whitespace-nowrap px-4 py-3 text-charcoal/70">
                  {formatWeekRange(log.week_start_date!)}
                </td>
                {canManage && (
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-charcoal">
                    {log.profiles?.full_name ?? "-"}
                  </td>
                )}
                {canManage && (
                  <td className="whitespace-nowrap px-4 py-3 text-charcoal/60">{log.profiles?.department ?? "-"}</td>
                )}
                <td className="whitespace-pre-line px-4 py-3 text-charcoal/80">{log.content}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-charcoal/40">
                  {formatKST(log.created_at)}
                </td>
              </tr>
            ))}
            {(!logs || logs.length === 0) && (
              <tr>
                <td colSpan={canManage ? 5 : 3} className="px-4 py-10 text-center text-sm text-charcoal/40">
                  제출된 업무일지가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
