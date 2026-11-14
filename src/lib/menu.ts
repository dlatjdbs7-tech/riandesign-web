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

// 리안네트웍스 사이드바 메인 메뉴. 묶음(섹션) 사이에는 구분선이 들어간다.
// 여기 없는 메뉴는 사이드바 아래 "보관 메뉴"에 접혀서 남아 있다.
// - href: 이동할 주소
// - permKey: 권한 판단에 쓰는 MENU_GROUPS key (생략하면 href와 같음, "always"는 누구나)
// - label: 사이드바에 보일 이름 (생략하면 MENU_GROUPS의 이름)
// - alsoActive: 이 메뉴에 포함된 다른 화면 (그 화면에 있어도 이 메뉴가 선택되고, 보관 메뉴에서는 빠짐)
export type PrimaryItem = { href: string; permKey?: string; label?: string; alsoActive?: string[] };
export const PRIMARY_SECTIONS: { label: string | null; items: PrimaryItem[] }[] = [
  {
    label: null,
    items: [
      { href: "/admin", permKey: "always", label: "대시보드" },
      { href: "/admin/analytics" },
      { href: "/admin/inquiries" },
    ],
  },
  {
    label: "현장",
    items: [
      { href: "/admin/calendar" },
      { href: "/admin/sites" },
      { href: "/admin/customer-pages" },
      { href: "/admin/as-requests" },
    ],
  },
  {
    label: "오늘 업무",
    items: [
      { href: "/admin/todos", label: "오늘의 할일" },
      { href: "/admin/attendance", label: "근태·출근도장" },
      { href: "/admin/work-logs" },
    ],
  },
  {
    label: "견적·발주·결재",
    items: [
      { href: "/admin/estimates", permKey: "/admin/quotes", label: "견적서" },
      {
        href: "/admin/field-management/purchase-orders",
        permKey: "/admin/field-management",
        label: "발주·업체",
        alsoActive: ["/admin/vendors"],
      },
      { href: "/admin/approvals" },
    ],
  },
  {
    label: "사람",
    items: [{ href: "/admin/employees" }],
  },
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
export const ALWAYS_ALLOWED_KEYS = ["/admin", "/admin/settings", "/admin/trash"];

// 대표만 접근 가능한 고정 메뉴 (설정 화면 자체를 다른 역할이 못 만지게)
export const OWNER_ONLY_KEYS = ["/admin/team-permissions"];

// 새 화면을 기존 메뉴 권한에 묶는다 (견적서 = 예전 견적서 메뉴 권한)
const PATH_ALIASES: Record<string, string> = { "/admin/estimates": "/admin/quotes" };

export function findMenuKeyForPath(pathname: string): string | null {
  for (const [prefix, key] of Object.entries(PATH_ALIASES)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return key;
  }
  const candidates = [...CONFIGURABLE_MENU_KEYS, ...ALWAYS_ALLOWED_KEYS, ...OWNER_ONLY_KEYS];
  const matches = candidates.filter(
    (key) => pathname === key || pathname.startsWith(`${key}/`)
  );
  if (matches.length === 0) return null;
  // 가장 구체적인(긴) 경로를 우선한다.
  return matches.reduce((longest, key) => (key.length > longest.length ? key : longest));
}
