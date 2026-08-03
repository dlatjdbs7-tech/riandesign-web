import { daysBetweenDateStrings } from "./date";
import type { WorkOrder } from "./types";

export type RiskLevel = "danger" | "caution" | "normal";

// 진행중인 작업지시서만 대상. 작업일이 이미 지났으면 위험, 3일 이내면 주의.
export function getWorkOrderRisk(
  order: Pick<WorkOrder, "work_date" | "status">,
  todayDateString: string
): RiskLevel {
  if (order.status !== "in_progress" || !order.work_date) return "normal";

  const diffDays = daysBetweenDateStrings(todayDateString, order.work_date);
  if (diffDays < 0) return "danger";
  if (diffDays <= 3) return "caution";
  return "normal";
}
