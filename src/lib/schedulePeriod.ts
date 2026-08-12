import type { SupabaseClient } from "@supabase/supabase-js";
import { daysBetweenDateStrings } from "./date";
import { getTaskDisplayStatus } from "./taskStatus";
import type { WorkOrderTask } from "./types";

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

// 공정률 = 완료 공정 ÷ 전체 공정. 공정표가 없는 현장은 결과에 포함되지 않는다.
export async function getTaskCompletionProgress(
  supabase: SupabaseClient,
  workOrderIds: string[],
  todayDateString: string
): Promise<Map<string, number>> {
  if (!workOrderIds.length) return new Map();

  const { data: tasks } = await supabase
    .from("work_order_tasks")
    .select("work_order_id, start_date, end_date, status, auto_status")
    .in("work_order_id", workOrderIds)
    .returns<
      Pick<WorkOrderTask, "work_order_id" | "start_date" | "end_date" | "status" | "auto_status">[]
    >();

  const totalByOrder = new Map<string, number>();
  const completedByOrder = new Map<string, number>();
  for (const task of tasks ?? []) {
    totalByOrder.set(task.work_order_id, (totalByOrder.get(task.work_order_id) ?? 0) + 1);
    if (getTaskDisplayStatus(task, todayDateString) === "completed") {
      completedByOrder.set(task.work_order_id, (completedByOrder.get(task.work_order_id) ?? 0) + 1);
    }
  }

  const progressByOrder = new Map<string, number>();
  for (const [id, total] of totalByOrder) {
    if (total === 0) continue;
    progressByOrder.set(id, Math.round(((completedByOrder.get(id) ?? 0) / total) * 100));
  }
  return progressByOrder;
}
