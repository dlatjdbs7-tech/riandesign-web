import type { WorkOrderStatus, WorkOrderTask } from "./types";

// auto_status가 true면 날짜 기준으로 상태를 자동 계산한다.
// 종료일이 지났으면 완료, 오늘이 시작~종료일 사이면 진행중, 그 외엔 대기.
// 특이사항으로 수기 고정한 경우(auto_status=false)에는 저장된 status를 그대로 쓴다.
export function getTaskDisplayStatus(
  task: Pick<WorkOrderTask, "start_date" | "end_date" | "status" | "auto_status">,
  todayDateString: string
): WorkOrderStatus {
  if (!task.auto_status || !task.end_date) return task.status;

  if (task.end_date < todayDateString) return "completed";
  if ((!task.start_date || task.start_date <= todayDateString) && todayDateString <= task.end_date) {
    return "in_progress";
  }
  return "pending";
}
