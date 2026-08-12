"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { checkIn, checkOut } from "@/app/admin/attendance/actions";

function getLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("위치 확인을 지원하지 않는 브라우저입니다."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      resolve,
      () => reject(new Error("위치 권한을 확인해주세요.")),
      { enableHighAccuracy: true }
    );
  });
}

export default function AttendanceCheckInOut({ isCheckedIn }: { isCheckedIn: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick(action: "in" | "out") {
    setMessage(null);
    setIsLoading(true);

    try {
      const position = await getLocation();
      const { latitude, longitude } = position.coords;
      const result = action === "out" ? await checkOut(latitude, longitude) : await checkIn(latitude, longitude);

      if (result.error) {
        setMessage(result.error);
      } else {
        const siteName = "siteName" in result ? result.siteName : undefined;
        setMessage(action === "out" ? "퇴근 처리되었습니다." : `출근 처리되었습니다 (${siteName ?? ""})`);
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => handleClick("in")}
          disabled={isLoading || isCheckedIn}
          className={`rounded-sm py-4 text-sm font-medium tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            isCheckedIn
              ? "bg-stone-100 text-charcoal/40"
              : "bg-charcoal text-cream hover:bg-gold"
          }`}
        >
          {isCheckedIn ? "출근 완료" : "출근하기"}
        </button>
        <button
          type="button"
          onClick={() => handleClick("out")}
          disabled={isLoading || !isCheckedIn}
          className={`rounded-sm py-4 text-sm font-medium tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            !isCheckedIn
              ? "bg-stone-100 text-charcoal/40"
              : "bg-taupe text-cream hover:bg-charcoal"
          }`}
        >
          퇴근하기
        </button>
      </div>
      {message && <p className="mt-3 text-sm text-charcoal/70">{message}</p>}
    </div>
  );
}
