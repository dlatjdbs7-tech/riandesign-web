// 관리자 메뉴의 단일 기준 정의. 사이드바 렌더링, 팀원권한 설정 화면,
// 그리고 proxy.ts의 접근 제어가 전부 이 목록을 참조한다.

export type MenuGroup = {
  label: string | null;
  items: { key: string; label: string; dividerBefore?: boolean; hidden?: boolean }[];
};

export const MENU_GROUPS: MenuGroup[] = [
  {
    label: null,
    items: [
      { key: "/admin/analytics", label: "유입분석" },
      { key: "/admin/manual", label: "리안메뉴얼" },
    ],
  },
  {
    label: "PROJECTS",
    items: [
      { key: "/admin/calendar", label: "캘린더" },
      { key: "/admin/sites", label: "현장관리" },
      { key: "/admin/field-management", label: "시공관리" },
      { key: "/admin/work-orders", label: "현장상세", hidden: true },
      { key: "/admin/work-directives", label: "작업지시서", hidden: true },
      { key: "/admin/as-requests", label: "AS관리" },
      { key: "/admin/quotes", label: "견적서", hidden: true },
      { key: "/admin/customer-pages", label: "고객페이지", dividerBefore: true },
      { key: "/admin/inquiries", label: "상담접수" },
      { key: "/admin/transactions", label: "거래명세서", hidden: true },
    ],
  },
  {
    label: "DAILY",
    items: [
      { key: "/admin/todos", label: "할일" },
      { key: "/admin/notification-center", label: "알림센터" },
      { key: "/admin/attendance", label: "근태·휴무" },
      { key: "/admin/work-logs", label: "업무일지" },
    ],
  },
  {
    label: "LIBRARY",
    items: [
      { key: "/admin/materials", label: "자재리스트" },
      { key: "/admin/templates", label: "템플릿 목록" },
      { key: "/admin/quick-phrases", label: "자주 쓰는 문구" },
    ],
  },
  {
    label: "PEOPLE",
    items: [
      { key: "/admin/employees", label: "팀원정보" },
      { key: "/admin/vendors", label: "업체정보" },
      { key: "/admin/customers", label: "고객·우수회원" },
      { key: "/admin/categories", label: "카테고리", hidden: true },
    ],
  },
  {
    label: "MARKETING",
    items: [
      { key: "/admin/site-management", label: "사이트관리" },
      { key: "/admin/portfolio", label: "포트폴리오" },
      { key: "/admin/process", label: "시공프로세스" },
      { key: "/admin/reviews", label: "고객후기" },
    ],
  },
  { label: "FINANCE", items: [{ key: "/admin/finance", label: "정산" }] },
  {
    label: "OPERATIONS",
    items: [
      { key: "/admin/approvals", label: "결재관리" },
      { key: "/admin/work-sites", label: "근무지 관리" },
    ],
  },
  {
    label: "SETTINGS",
    items: [
      { key: "/admin/company-settings", label: "회사설정" },
      { key: "/admin/notifications", label: "알림설정" },
      { key: "/admin/billing", label: "결제관리" },
    ],
  },
];

// 사이드바 위쪽에 바로 보이는 메인 메뉴 (작게 시작해서 하나씩 늘린다).
// 여기 없는 메뉴는 사이드바 아래 "보관 메뉴"에 접혀서 남아 있다.
// 메뉴를 메인으로 올리려면 key를 원하는 섹션에 추가하기만 하면 된다. 권한은 MENU_GROUPS 기준 그대로.
export const PRIMARY_SECTIONS: { label: string; keys: string[] }[] = [
  { label: "영업", keys: ["/admin/inquiries", "/admin/customer-pages"] },
  { label: "현장", keys: ["/admin/sites", "/admin/calendar"] },
  { label: "업무", keys: ["/admin/todos", "/admin/attendance"] },
];

// 보관 메뉴 그룹의 한글 이름
export const GROUP_LABELS_KO: Record<string, string> = {
  PROJECTS: "프로젝트",
  DAILY: "일상업무",
  LIBRARY: "자료실",
  PEOPLE: "사람",
  MARKETING: "마케팅",
  FINANCE: "재무",
  OPERATIONS: "운영",
  SETTINGS: "설정",
};

export const CONFIGURABLE_MENU_KEYS = MENU_GROUPS.flatMap((group) =>
  group.items.map((item) => item.key)
);

// 항상 접근 가능 (권한 설정 대상 아님, 대표 외에도 팀장/직원 전부 고정 허용)
export const ALWAYS_ALLOWED_KEYS = ["/admin", "/admin/settings"];

// 대표만 접근 가능한 고정 메뉴 (설정 화면 자체를 다른 역할이 못 만지게)
export const OWNER_ONLY_KEYS = ["/admin/team-permissions"];

export function findMenuKeyForPath(pathname: string): string | null {
  const candidates = [...CONFIGURABLE_MENU_KEYS, ...ALWAYS_ALLOWED_KEYS, ...OWNER_ONLY_KEYS];
  const matches = candidates.filter(
    (key) => pathname === key || pathname.startsWith(`${key}/`)
  );
  if (matches.length === 0) return null;
  // 가장 구체적인(긴) 경로를 우선한다.
  return matches.reduce((longest, key) => (key.length > longest.length ? key : longest));
}
