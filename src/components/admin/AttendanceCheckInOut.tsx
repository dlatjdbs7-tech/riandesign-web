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

  async function handleClick() {
    setMessage(null);
    setIsLoading(true);

    try {
      const position = await getLocation();
      const { latitude, longitude } = position.coords;
      const result = isCheckedIn
        ? await checkOut(latitude, longitude)
        : await checkIn(latitude, longitude);

      if (result.error) {
        setMessage(result.error);
      } else {
        const siteName = "siteName" in result ? result.siteName : undefined;
        setMessage(isCheckedIn ? "퇴근 처리되었습니다." : `출근 처리되었습니다 (${siteName ?? ""})`);
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
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className={`rounded-full px-8 py-3 text-sm tracking-wide text-cream transition-colors disabled:opacity-50 ${
          isCheckedIn ? "bg-taupe hover:bg-charcoal" : "bg-charcoal hover:bg-gold"
        }`}
      >
        {isLoading ? "처리 중..." : isCheckedIn ? "퇴근하기" : "출근하기"}
      </button>
      {message && <p className="mt-3 text-sm text-charcoal/70">{message}</p>}
    </div>
  );
}
