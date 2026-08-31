"use client";

import { useState } from "react";
import { createScheduleItem } from "@/app/admin/calendar/actions";

const CATEGORIES = ["미팅", "A/S", "수금", "행사", "촬영", "할일"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_ACTIVE_CLASS: Record<Category, string> = {
  "미팅": "border-rose-400 bg-rose-400 text-white",
  "A/S": "border-red-500 bg-red-500 text-white",
  "수금": "border-amber-400 bg-amber-400 text-white",
  "행사": "border-sky-500 bg-sky-500 text-white",
  "촬영": "border-violet-500 bg-violet-500 text-white",
  "할일": "border-orange-400 bg-orange-400 text-white",
};

const MEETING_TYPES = ["레이아웃 미팅", "디자인 미팅", "마감재 미팅", "견적 미팅", "계약 미팅", "방문상담"];
const TEAMS = ["전체", "총괄", "디자인팀", "시공팀", "영업팀"];

export default function AddEventModal({ defaultDate }: { defaultDate: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("미팅");
  const [meetingType, setMeetingType] = useState(MEETING_TYPES[5]);

  const showMeetingType = category === "미팅";
  const showTime = category === "미팅" || category === "수금" || category === "행사" || category === "촬영";
  const showSite = category !== "할일";
  const showTeam = category === "미팅" || category === "수금" || category === "행사" || category === "촬영";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-orange-300 px-4 py-2 text-xs font-medium text-orange-900 hover:bg-orange-400"
      >
        + 일정 추가
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold text-charcoal">일정 추가 · {defaultDate}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-charcoal/40 hover:text-charcoal"
              >
                ✕
              </button>
            </div>

            <form
              action={async (formData) => {
                await createScheduleItem(formData);
                setOpen(false);
              }}
              className="mt-4 flex flex-col gap-4"
            >
              <input type="hidden" name="category" value={category} />
              {showMeetingType && <input type="hidden" name="meeting_type" value={meetingType} />}

              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                      category === c
                        ? CATEGORY_ACTIVE_CLASS[c]
                        : "border-nude text-charcoal/60 hover:border-charcoal"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <input
                name="title"
                required
                placeholder="예) 청라 자이 방문상담"
                className="rounded-sm border border-nude px-3 py-2 text-sm outline-none focus:border-orange-400"
              />

              {showMeetingType && (
                <div>
                  <p className="mb-1.5 text-xs text-charcoal/50">미팅 종류</p>
                  <div className="flex flex-wrap gap-1.5">
                    {MEETING_TYPES.map((mt) => (
                      <button
                        key={mt}
                        type="button"
                        onClick={() => setMeetingType(mt)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                          meetingType === mt
                            ? "border-orange-400 bg-orange-100 text-orange-700"
                            : "border-nude text-charcoal/60 hover:border-charcoal"
                        }`}
                      >
                        {mt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <div className="flex-1">
                  <p className="mb-1 text-xs text-charcoal/50">날짜</p>
                  <input
                    name="event_date"
                    type="date"
                    defaultValue={defaultDate}
                    required
                    className="w-full rounded-sm border border-nude px-3 py-2 text-sm outline-none focus:border-orange-400"
                  />
                </div>
                {showTime && (
                  <div className="flex-1">
                    <p className="mb-1 text-xs text-charcoal/50">시간 (선택)</p>
                    <input
                      name="event_time"
                      type="time"
                      className="w-full rounded-sm border border-nude px-3 py-2 text-sm outline-none focus:border-orange-400"
                    />
                  </div>
                )}
              </div>

              {showSite && (
                <input
                  name="site_name"
                  placeholder="현장명 (선택)"
                  className="rounded-sm border border-nude px-3 py-2 text-sm outline-none focus:border-orange-400"
                />
              )}

              {showTeam && (
                <select
                  name="team"
                  defaultValue="전체"
                  className="rounded-sm border border-nude px-3 py-2 text-sm outline-none focus:border-orange-400"
                >
                  {TEAMS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              )}

              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-nude px-5 py-2 text-sm text-charcoal hover:border-charcoal"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-orange-500 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600"
                >
                  추가
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
