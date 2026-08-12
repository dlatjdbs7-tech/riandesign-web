import type { SupabaseClient } from "@supabase/supabase-js";
import { getKSTDateBounds } from "./date";
import { getWorkOrderRisk } from "./risk";
import { getFinishTaskInfo } from "./schedulePeriod";
import type { WorkOrder } from "./types";

// 알림센터 페이지가 보여주는 6가지 항목(신규 상담문의/승인 대기 직원/위험 단계 현장/
// 미완료 AS/기한 지난 내 할일/내게 온 작업지시)의 개수 합. 사이드바 배지 숫자로 쓰인다.
export async function getNotificationCount(
  supabase: SupabaseClient,
  profile: { id: string; role: string }
): Promise<number> {
  const canManage = profile.role === "owner" || profile.role === "manager";
  const { todayDateString } = getKSTDateBounds();

  const [
    { count: newInquiryCount },
    { count: pendingEmployeeCount },
    { data: inProgressOrders },
    { count: openAsCount },
    { count: overdueTodoCount },
    { count: myDirectiveCount },
  ] = await Promise.all([
    canManage
      ? supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "new")
      : Promise.resolve({ count: 0 }),
    profile.role === "owner"
      ? supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending")
      : Promise.resolve({ count: 0 }),
    supabase.from("work_orders").select("*").eq("status", "in_progress").returns<WorkOrder[]>(),
    supabase.from("as_requests").select("id", { count: "exact", head: true }).neq("status", "completed"),
    supabase
      .from("todos")
      .select("id", { count: "exact", head: true })
      .neq("status", "done")
      .or(`assignee_id.eq.${profile.id},created_by.eq.${profile.id}`)
      .lt("due_date", todayDateString),
    supabase
      .from("work_directives")
      .select("id", { count: "exact", head: true })
      .or(`assignee_id.eq.${profile.id},created_by.eq.${profile.id}`)
      .neq("status", "completed"),
  ]);

  // 위험 단계 판정은 현장관리/알림센터 목록과 동일하게 공정표(마감 과업) 기준 날짜를 사용한다.
  const finishTaskByOrder = await getFinishTaskInfo(
    supabase,
    (inProgressOrders ?? []).map((order) => order.id)
  );
  const riskOrderCount = (inProgressOrders ?? []).filter(
    (order) => getWorkOrderRisk(order, todayDateString, finishTaskByOrder.get(order.id)?.endDate) === "danger"
  ).length;

  return (
    (newInquiryCount ?? 0) +
    (pendingEmployeeCount ?? 0) +
    riskOrderCount +
    (openAsCount ?? 0) +
    (overdueTodoCount ?? 0) +
    (myDirectiveCount ?? 0)
  );
}
