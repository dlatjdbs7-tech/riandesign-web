// 리안네트웍스 팀 기준. 캘린더·직원 부서·할일이 모두 이 목록을 쓴다.
export const TEAMS = ["운영팀", "설계팀", "시공팀"] as const;
export type Team = (typeof TEAMS)[number];

// 예전 이름 → 새 팀 이름 (예전 데이터도 그대로 보이게)
const TEAM_ALIAS: Record<string, Team> = {
  운영팀: "운영팀",
  영업팀: "운영팀",
  설계팀: "설계팀",
  디자인팀: "설계팀",
  시공팀: "시공팀",
};

// 팀이 정해지지 않은 값(총괄·전체·빈값)은 null = 공통 일정
export function normalizeTeam(value: string | null | undefined): Team | null {
  if (!value) return null;
  return TEAM_ALIAS[value.trim()] ?? null;
}

export const TEAM_STYLE: Record<Team | "공통", { dot: string; border: string; chip: string; active: string }> = {
  운영팀: { dot: "bg-sky-500", border: "border-l-sky-500", chip: "bg-sky-50 text-sky-700", active: "bg-sky-600 text-white" },
  설계팀: {
    dot: "bg-violet-500",
    border: "border-l-violet-500",
    chip: "bg-violet-50 text-violet-700",
    active: "bg-violet-600 text-white",
  },
  시공팀: { dot: "bg-teal-500", border: "border-l-teal-500", chip: "bg-teal-50 text-teal-700", active: "bg-teal-600 text-white" },
  공통: { dot: "bg-stone-400", border: "border-l-stone-300", chip: "bg-stone-100 text-charcoal/70", active: "bg-charcoal text-cream" },
};
