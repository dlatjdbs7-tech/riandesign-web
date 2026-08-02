import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { Profile, WorkLog, WorkOrder } from "@/lib/types";
import { formatKST } from "@/lib/date";
import { addWorkLog } from "@/app/admin/work-orders/actions";

type WorkLogRow = WorkLog & {
  profiles: Pick<Profile, "full_name" | "department"> | null;
  work_orders: Pick<WorkOrder, "id" | "title"> | null;
};

export default async function WorkLogsPage() {
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("work_logs")
    .select("*, profiles(full_name, department), work_orders(id, title)")
    .order("log_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<WorkLogRow[]>();

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-charcoal">업무일지</h1>
      <p className="mt-2 text-sm text-charcoal/60">
        특정 작업지시서와 관련 없는 일반 업무 내용은 여기에 기록합니다.
      </p>

      <form
        action={addWorkLog.bind(null, null)}
        className="mt-6 flex flex-col gap-3 rounded-sm border border-nude/60 bg-white p-4"
      >
        <input
          name="log_date"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="w-40 border-b border-nude bg-transparent py-1 text-sm outline-none focus:border-gold"
        />
        <textarea
          name="content"
          rows={3}
          required
          placeholder="오늘의 업무 내용을 기록하세요."
          className="resize-none border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold"
        />
        <button
          type="submit"
          className="self-start rounded-full bg-charcoal px-5 py-2 text-xs tracking-wide text-cream hover:bg-gold"
        >
          업무일지 작성
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-3">
        {logs?.map((log) => (
          <div key={log.id} className="rounded-sm border border-nude/60 bg-white p-4 text-sm">
            <div className="flex justify-between text-xs text-charcoal/50">
              <span>
                {log.profiles?.full_name ?? "-"} · {log.profiles?.department ?? "-"}
              </span>
              <span>{formatKST(log.created_at)}</span>
            </div>
            {log.work_orders && (
              <Link
                href={`/admin/work-orders/${log.work_orders.id}`}
                className="mt-1 inline-block text-xs text-gold hover:underline"
              >
                관련 작업지시서: {log.work_orders.title}
              </Link>
            )}
            <p className="mt-2 whitespace-pre-line text-charcoal/80">{log.content}</p>
          </div>
        ))}
        {(!logs || logs.length === 0) && (
          <p className="text-sm text-charcoal/50">등록된 업무일지가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
