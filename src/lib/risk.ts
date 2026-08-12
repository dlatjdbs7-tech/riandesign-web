import { daysBetweenDateStrings } from "./date";
import type { WorkOrder } from "./types";

export type RiskLevel = "danger" | "caution" | "normal";

// 진행중인 작업지시서만 대상. 공정표에 "마감" 공정이 있으면 그 종료일을, 없으면 work_date를
// 기준으로 이미 지났으면 위험, 3일 이내면 주의로 판정한다.
export function getWorkOrderRisk(
  order: Pick<WorkOrder, "work_date" | "status">,
  todayDateString: string,
  scheduleFinishDate?: string | null
): RiskLevel {
  if (order.status !== "in_progress") return "normal";

  const referenceDate = scheduleFinishDate ?? order.work_date;
  if (!referenceDate) return "normal";

  const diffDays = daysBetweenDateStrings(todayDateString, referenceDate);
  if (diffDays < 0) return "danger";
  if (diffDays <= 3) return "caution";
  return "normal";
}
