export function formatKST(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

// 한국은 서머타임이 없어서 고정 9시간 오프셋으로 안전하게 계산 가능
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function getKSTDateBounds() {
  const kstNow = new Date(Date.now() + KST_OFFSET_MS);
  const y = kstNow.getUTCFullYear();
  const m = kstNow.getUTCMonth();
  const d = kstNow.getUTCDate();

  const startOfDay = new Date(Date.UTC(y, m, d) - KST_OFFSET_MS);
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(Date.UTC(y, m, 1) - KST_OFFSET_MS);

  return {
    startOfDay: startOfDay.toISOString(),
    endOfDay: endOfDay.toISOString(),
    startOfMonth: startOfMonth.toISOString(),
  };
}
