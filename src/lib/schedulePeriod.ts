import type { SupabaseClient } from "@supabase/supabase-js";

// 진행중인 현장의 "마감" 공정 마지막 종료일을 work_order_id별로 반환한다.
// 위험도 판정 등에서 (수기 입력된) work_date 대신 실제 공정표 기준 마감일을 쓰기 위함.
export async function getFinishEndDates(
  supabase: SupabaseClient,
  workOrderIds: string[]
): Promise<Map<string, string>> {
  if (!workOrderIds.length) return new Map();

  const { data: tasks } = await supabase
    .from("work_order_tasks")
    .select("work_order_id, end_date")
    .in("work_order_id", workOrderIds)
    .eq("title", "마감");

  const finishEndByOrder = new Map<string, string>();
  for (const task of tasks ?? []) {
    if (!task.end_date) continue;
    const current = finishEndByOrder.get(task.work_order_id);
    if (!current || task.end_date > current) finishEndByOrder.set(task.work_order_id, task.end_date);
  }
  return finishEndByOrder;
}
