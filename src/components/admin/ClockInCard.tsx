"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, LogIn, LogOut, MapPin } from "lucide-react";
import { checkIn, checkOut } from "@/app/admin/attendance/actions";

function getLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("이 브라우저는 위치 확인을 지원하지 않습니다."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error("위치 권한을 허용해 주세요.")), {
      enableHighAccuracy: true,
      timeout: 15000,
    });
  });
}

function toTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" });
}

// 대시보드 맨 위 출근도장 카드.
// 출근 전: 큰 "출근 도장" 버튼 → 출근 후: 출근 시각 + "퇴근하기" → 퇴근 후: 오늘 근무 요약
export default function ClockInCard({
  userName,
  todayLabel,
  checkInAt,
  checkOutAt,
  siteName,
  isLate,
}: {
  userName: string;
  todayLabel: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  siteName: string | null;
  isLate: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const state = !checkInAt ? "before" : !checkOutAt ? "working" : "done";

  async function stamp(action: "in" | "out") {
    setMessage(null);
    setIsLoading(true);
    try {
      const { latitude, longitude } = (await getLocation()).coords;
      const result = action === "in" ? await checkIn(latitude, longitude) : await checkOut(latitude, longitude);
      if (result.error) setMessage(result.error);
      else router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-nude/60 bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-charcoal/50">{todayLabel}</p>
          <p className="mt-1 text-xl font-semibold text-charcoal">
            {state === "before" && `${userName}님, 좋은 아침이에요`}
            {state === "working" && `${userName}님, 오늘도 화이팅!`}
            {state === "done" && `${userName}님, 오늘 수고하셨어요`}
          </p>
          {checkInAt && (
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-charcoal/70">
              <span className="flex items-center gap-1">
                <Clock size={14} /> 출근 {toTime(checkInAt)}
              </span>
              {isLate && <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">지각</span>}
              {checkOutAt && <span>퇴근 {toTime(checkOutAt)}</span>}
              {siteName && (
                <span className="flex items-center gap-1 text-charcoal/50">
                  <MapPin size={14} /> {siteName}
                </span>
              )}
            </p>
          )}
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          {state === "before" && (
            <button
              type="button"
              onClick={() => stamp("in")}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-8 py-4 text-lg font-bold text-white shadow-sm transition-colors hover:bg-orange-600 disabled:opacity-60"
            >
              <LogIn size={22} />
              {isLoading ? "위치 확인 중..." : "출근 도장 찍기"}
            </button>
          )}
          {state === "working" && (
            <button
              type="button"
              onClick={() => stamp("out")}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 rounded-xl bg-charcoal px-8 py-4 text-lg font-bold text-cream transition-colors hover:bg-charcoal/85 disabled:opacity-60"
            >
              <LogOut size={22} />
              {isLoading ? "위치 확인 중..." : "퇴근하기"}
            </button>
          )}
          {state === "done" && (
            <span className="rounded-xl bg-stone-100 px-6 py-3 text-center text-sm font-medium text-charcoal/60">
              오늘 근무 완료
            </span>
          )}
          <Link href="/admin/attendance" className="text-center text-xs text-charcoal/45 hover:text-orange-600 sm:text-right">
            근태·휴무 보기 →
          </Link>
        </div>
      </div>
      {message && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>}
    </section>
  );
}
