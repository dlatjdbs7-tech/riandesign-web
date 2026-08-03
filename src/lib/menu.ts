// 관리자 메뉴의 단일 기준 정의. 사이드바 렌더링, 팀원권한 설정 화면,
// 그리고 proxy.ts의 접근 제어가 전부 이 목록을 참조한다.

export type MenuGroup = {
  label: string | null;
  items: { key: string; label: string }[];
};

export const MENU_GROUPS: MenuGroup[] = [
  {
    label: "PROJECTS",
    items: [
      { key: "/admin/quotes", label: "견적서" },
      { key: "/admin/work-orders", label: "작업지시서" },
      { key: "/admin/customer-pages", label: "고객페이지" },
      { key: "/admin/transactions", label: "거래명세서" },
      { key: "/admin/customers", label: "고객관리" },
      { key: "/admin/as-requests", label: "AS관리" },
    ],
  },
  {
    label: "DAILY",
    items: [
      { key: "/admin/attendance", label: "근태관리" },
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
      { key: "/admin/employees", label: "임직원" },
      { key: "/admin/vendors", label: "견적처" },
      { key: "/admin/categories", label: "카테고리" },
    ],
  },
  {
    label: "MARKETING",
    items: [
      { key: "/admin/site-management", label: "사이트관리" },
      { key: "/admin/inquiries", label: "접수관리" },
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

export const CONFIGURABLE_MENU_KEYS = MENU_GROUPS.flatMap((group) =>
  group.items.map((item) => item.key)
);

// 항상 접근 가능 (권한 설정 대상 아님, 대표 외에도 팀장/직원 전부 고정 허용)
export const ALWAYS_ALLOWED_KEYS = ["/admin", "/admin/settings"];

// 대표만 접근 가능한 고정 메뉴 (설정 화면 자체를 다른 역할이 못 만지게)
export const OWNER_ONLY_KEYS = ["/admin/team-permissions"];

export const CONFIGURABLE_ROLES = ["manager", "employee"] as const;
export type ConfigurableRole = (typeof CONFIGURABLE_ROLES)[number];

export function findMenuKeyForPath(pathname: string): string | null {
  const candidates = [...CONFIGURABLE_MENU_KEYS, ...ALWAYS_ALLOWED_KEYS, ...OWNER_ONLY_KEYS];
  const matches = candidates.filter(
    (key) => pathname === key || pathname.startsWith(`${key}/`)
  );
  if (matches.length === 0) return null;
  // 가장 구체적인(긴) 경로를 우선한다.
  return matches.reduce((longest, key) => (key.length > longest.length ? key : longest));
}
