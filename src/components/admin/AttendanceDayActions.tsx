"use client";

import { useRouter } from "next/navigation";
import { setAttendanceLeave, clearAttendanceLeave } from "@/app/admin/attendance/actions";

export default function AttendanceDayActions({
  userId,
  dateString,
  leaveType,
}: {
  userId: string;
  dateString: string;
  leaveType: "반차" | "휴무" | null;
}) {
  const router = useRouter();

  if (leaveType) {
    return (
      <button
        type="button"
        onClick={async () => {
          await clearAttendanceLeave(userId, dateString);
          router.refresh();
        }}
        className="mt-auto self-start text-[9px] text-charcoal/30 opacity-0 hover:text-red-600 group-hover:opacity-100"
      >
        취소
      </button>
    );
  }

  return (
    <div className="mt-auto flex gap-1.5 opacity-0 group-hover:opacity-100">
      <button
        type="button"
        onClick={async () => {
          await setAttendanceLeave(userId, dateString, "반차");
          router.refresh();
        }}
        className="rounded-sm bg-orange-100 px-1 text-[9px] text-orange-800 hover:bg-orange-200"
      >
        반차
      </button>
      <button
        type="button"
        onClick={async () => {
          await setAttendanceLeave(userId, dateString, "휴무");
          router.refresh();
        }}
        className="rounded-sm bg-stone-200 px-1 text-[9px] text-charcoal/70 hover:bg-stone-300"
      >
        휴무
      </button>
    </div>
  );
}
