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
  const todayDateString = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return {
    startOfDay: startOfDay.toISOString(),
    endOfDay: endOfDay.toISOString(),
    startOfMonth: startOfMonth.toISOString(),
    todayDateString,
  };
}

export function daysBetweenDateStrings(fromDateStr: string, toDateStr: string) {
  const from = new Date(`${fromDateStr}T00:00:00Z`);
  const to = new Date(`${toDateStr}T00:00:00Z`);
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export function getKSTCurrentYearMonth() {
  const kstNow = new Date(Date.now() + KST_OFFSET_MS);
  return { year: kstNow.getUTCFullYear(), month: kstNow.getUTCMonth() + 1 };
}

const toDateStr = (dt: Date) =>
  `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;

// year/month(1-12) 기준 달력 그리드를 일요일 시작 주 단위로 반환한다.
export function getMonthGridWeeks(year: number, month: number) {
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const startWeekday = firstOfMonth.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

  const days = Array.from({ length: totalCells }, (_, i) => {
    const cellDate = new Date(Date.UTC(year, month - 1, 1 + (i - startWeekday)));
    return {
      dateString: toDateStr(cellDate),
      day: cellDate.getUTCDate(),
      isCurrentMonth: cellDate.getUTCMonth() === month - 1,
    };
  });

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

export function getKSTWeekBounds() {
  const kstNow = new Date(Date.now() + KST_OFFSET_MS);
  const y = kstNow.getUTCFullYear();
  const m = kstNow.getUTCMonth();
  const d = kstNow.getUTCDate();
  const dayOfWeek = kstNow.getUTCDay(); // 0 = 일요일
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(Date.UTC(y, m, d + diffToMonday));
  const sunday = new Date(Date.UTC(y, m, d + diffToMonday + 6));

  const toDateStr = (dt: Date) =>
    `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;

  return { weekStartDate: toDateStr(monday), weekEndDate: toDateStr(sunday) };
}
