// 방문/문의 시 자동으로 잡힌 referrer·UTM을 리안디자인 공식 채널 기준으로 분류한다.
// 네이버 블로그(blog.naver.com)는 "네이버 검색"과 구분해서 "블로그"로, 우리 홈페이지 도메인은
// "홈페이지"로 표기한다 — 전부 뭉뚱그려 "네이버"/도메인 그대로 보여주면 어느 채널이 실제로
// 효과가 있는지 구분이 안 된다.
export function classifyTrafficSource(pv: { referrer_host: string | null; utm_source: string | null }) {
  const utm = pv.utm_source?.toLowerCase();
  if (utm) {
    if (utm.includes("blog")) return "블로그";
    if (utm.includes("naver")) return "네이버";
    if (utm.includes("google")) return "구글";
    if (utm.includes("meta") || utm.includes("facebook") || utm.includes("fb")) return "메타";
    if (utm.includes("instagram") || utm.includes("insta")) return "인스타그램";
    if (utm.includes("youtube")) return "유튜브";
    if (utm.includes("kakao")) return "카카오";
    return pv.utm_source as string;
  }

  const host = pv.referrer_host?.toLowerCase();
  if (!host) return "직접 방문";
  if (host === "blog.naver.com") return "블로그";
  if (host.includes("naver")) return "네이버";
  if (host.includes("instagram")) return "인스타그램";
  if (host === "youtube.com" || host === "youtu.be" || host.endsWith(".youtube.com")) return "유튜브";
  if (host.includes("facebook")) return "페이스북";
  if (host.includes("daum") || host.includes("kakao")) return "카카오";
  if (host.includes("google")) return "구글";
  if (host === "reandesign.kr" || host === "www.reandesign.kr") return "홈페이지";
  return host;
}
