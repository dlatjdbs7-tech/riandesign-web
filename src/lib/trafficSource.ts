// 방문/문의가 어느 채널에서 왔는지 리안디자인 채널 기준으로 분류한다.
//
// 가장 정확한 방법은 채널마다 다른 "추적 링크"(?utm_source=...)를 쓰는 것이다.
// 블로그·인스타는 메인/개인 계정이 같은 사이트(blog.naver.com, instagram.com)라
// 링크 없이는 어느 계정인지 알 수 없다. 블로그는 주소에 블로그 아이디가 남는 경우가 있어
// PageViewTracker가 "blog:<아이디>"로 보내 주면 그것으로도 구분한다.

export const SITE_URL = "https://www.reandesign.co.kr";

export type Channel = {
  key: string;
  label: string;
  group: "블로그" | "인스타" | "쓰레드" | "유튜브";
  account?: string; // 화면에 보여줄 계정 이름
  profileUrl?: string; // 채널 주소 (관리자 화면에서 눌러 바로 가기)
  where?: string; // 추적 링크를 어디에 넣는지
  blogId?: string;
};

// 리안디자인이 운영하는 채널 (2026-11-15 대표가 준 주소로 정리).
// 각 채널 소개란·게시물에 아래 추적 링크를 넣는다.
// label은 문의(inquiries.auto_source)에 글자 그대로 저장되므로 바꾸지 않는다.
export const CHANNELS: Channel[] = [
  { key: "blog_main", label: "블로그(메인)", group: "블로그", account: "reandesign_", profileUrl: "https://blog.naver.com/reandesign_", where: "글 본문·프로필 소개 링크", blogId: "reandesign_" },
  { key: "blog_personal", label: "블로그(개인)", group: "블로그", account: "redvgt", profileUrl: "https://blog.naver.com/redvgt", where: "글 본문·프로필 소개 링크", blogId: "redvgt" },
  { key: "insta_main", label: "인스타(메인)", group: "인스타", account: "@rean.interior", profileUrl: "https://www.instagram.com/rean.interior/", where: "프로필 웹사이트 칸" },
  { key: "insta_personal", label: "인스타(개인)", group: "인스타", account: "@reandesign.hyuk", profileUrl: "https://www.instagram.com/reandesign.hyuk/", where: "프로필 웹사이트 칸" },
  { key: "threads", label: "쓰레드", group: "쓰레드", account: "@reandesign.hyuk (개인)", profileUrl: "https://www.threads.com/@reandesign.hyuk", where: "프로필 링크·게시물" },
  { key: "youtube", label: "유튜브", group: "유튜브", account: "@rean.interior", profileUrl: "https://youtube.com/@rean.interior", where: "채널 링크·영상 설명란" },
];

// 지금 운영 중인 홈페이지(카페24). 유입분석은 이 사이트 방문을 세지 못한다 (새 홈페이지 reandesign.co.kr만 셈)
export const MAIN_HOMEPAGE = "https://reandesign.kr/";

// 유입분석 표에 나오는 순서 (채널 → 검색 → 직접 → 기타)
export const SOURCE_ORDER = [
  ...CHANNELS.map((c) => c.label),
  "블로그(계정 모름)",
  "인스타(계정 모름)",
  "네이버 검색",
  "구글 검색",
  "카카오·다음",
  "기존 홈페이지",
  "직접 방문",
  "기타",
];

export function channelLink(key: string) {
  return `${SITE_URL}/?utm_source=${key}`;
}

// 기존 홈페이지(카페24)에서 보낸 방문 기록은 path 앞에 이 표시를 붙여 새 홈페이지 기록과 나눈다.
// (public/rean-track.js → /api/track) — 표를 새로 만들지 않으려고 path에 표시한다.
export const OLD_SITE_PREFIX = "kr:";
export function isOldSitePath(path: string) {
  return path.startsWith(OLD_SITE_PREFIX);
}

const OWN_HOSTS = ["reandesign.co.kr", "www.reandesign.co.kr"];
// 카페24 홈페이지(reandesign.kr)에서 새 홈페이지로 넘어온 방문 (예전엔 "직접 방문"에 섞여 있었음)
const OLD_SITE_HOSTS = ["reandesign.kr", "www.reandesign.kr"];

export function classifyTrafficSource(pv: { referrer_host: string | null; utm_source: string | null }) {
  const utm = pv.utm_source?.trim().toLowerCase() ?? "";

  if (utm) {
    const channel = CHANNELS.find((c) => c.key === utm);
    if (channel) return channel.label;
    // PageViewTracker가 블로그 주소에서 읽은 아이디 ("blog:redvgt")
    if (utm.startsWith("blog:")) {
      const id = utm.slice(5);
      return CHANNELS.find((c) => c.blogId?.toLowerCase() === id)?.label ?? "블로그(계정 모름)";
    }
    // 예전 링크·다른 이름의 utm
    if (utm.includes("thread")) return "쓰레드";
    if (utm.includes("youtube")) return "유튜브";
    if (utm.includes("insta")) return "인스타(계정 모름)";
    if (utm.includes("blog")) return "블로그(계정 모름)";
    if (utm.includes("naver")) return "네이버 검색";
    if (utm.includes("google")) return "구글 검색";
    if (utm.includes("kakao")) return "카카오·다음";
    return "기타";
  }

  const host = pv.referrer_host?.toLowerCase() ?? "";
  if (!host || OWN_HOSTS.includes(host)) return "직접 방문";
  if (OLD_SITE_HOSTS.includes(host)) return "기존 홈페이지";
  if (host.includes("blog.naver") || host.includes("naverblogwidget")) return "블로그(계정 모름)";
  if (host.includes("naver")) return "네이버 검색";
  if (host.includes("instagram")) return "인스타(계정 모름)";
  if (host.includes("threads")) return "쓰레드";
  if (host === "youtube.com" || host === "youtu.be" || host.endsWith(".youtube.com")) return "유튜브";
  if (host.includes("google")) return "구글 검색";
  if (host.includes("daum") || host.includes("kakao")) return "카카오·다음";
  return "기타";
}

// 유입분석·대시보드 집계 시작일 (2026-11-01 리셋). 이전 기록은 지우지 않고 집계에서만 뺀다.
export const INFLOW_START_DATE = "2026-11-01";
export const INFLOW_START_ISO = "2026-11-01T00:00:00+09:00";

// 예전 방식으로 저장된 문의 유입 이름을 새 이름으로 맞춘다.
const LEGACY_LABEL: Record<string, string> = {
  블로그: "블로그(계정 모름)",
  인스타그램: "인스타(계정 모름)",
  홈페이지: "직접 방문",
  네이버: "네이버 검색",
  구글: "구글 검색",
  카카오: "카카오·다음",
  메타: "기타",
  페이스북: "기타",
};

// 문의 1건이 어디서 왔는지: 홈페이지 문의는 자동 감지값, 직원이 넣은 문의는 고른 경로(전화·방문 등)
export function inquirySourceLabel(inquiry: { auto_source: string | null; referral_source: string | null }) {
  const auto = inquiry.auto_source?.trim();
  if (auto) return LEGACY_LABEL[auto] ?? auto;
  const picked = inquiry.referral_source?.trim();
  return picked ? `${picked} (직접 접수)` : "미확인";
}

export function isOnlineInquiry(inquiry: { auto_source: string | null }) {
  return !!inquiry.auto_source?.trim();
}
