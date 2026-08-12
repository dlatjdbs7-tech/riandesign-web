import type { SupabaseClient } from "@supabase/supabase-js";
import { daysBetweenDateStrings } from "./date";

export type FinishTaskInfo = {
  endDate: string;
  updatedAt: string;
  createdAt: string;
};

// 진행중인 현장의 "마감" 공정 마지막 종료일(+수정 이력)을 work_order_id별로 반환한다.
// 위험도 판정 등에서 (수기 입력된) work_date 대신 실제 공정표 기준 마감일을 쓰기 위함.
export async function getFinishTaskInfo(
  supabase: SupabaseClient,
  workOrderIds: string[]
): Promise<Map<string, FinishTaskInfo>> {
  if (!workOrderIds.length) return new Map();

  const { data: tasks } = await supabase
    .from("work_order_tasks")
    .select("work_order_id, end_date, updated_at, created_at")
    .in("work_order_id", workOrderIds)
    .eq("title", "마감");

  const finishByOrder = new Map<string, FinishTaskInfo>();
  for (const task of tasks ?? []) {
    if (!task.end_date) continue;
    const current = finishByOrder.get(task.work_order_id);
    if (!current || task.end_date > current.endDate) {
      finishByOrder.set(task.work_order_id, {
        endDate: task.end_date,
        updatedAt: task.updated_at,
        createdAt: task.created_at,
      });
    }
  }
  return finishByOrder;
}

// "마감" 공정이 등록 이후 실제로 수정됐고, 그 수정이 최근 3일 이내인지.
export function wasScheduleRecentlyUpdated(
  info: FinishTaskInfo | undefined,
  todayDateString: string
): boolean {
  if (!info || info.updatedAt === info.createdAt) return false;
  const updatedDateString = info.updatedAt.slice(0, 10);
  const diffDays = daysBetweenDateStrings(updatedDateString, todayDateString);
  return diffDays >= 0 && diffDays <= 3;
}
