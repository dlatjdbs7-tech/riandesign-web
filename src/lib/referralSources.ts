// 직원이 문의를 수기로 등록할 때 고르는 유입경로. 전화·방문은 홈페이지를 거치지 않고
// 바로 들어오는 "직접상담신청" 경로라, 유입분석에서 온라인 채널과 따로 집계한다.
export const STAFF_REFERRAL_SOURCES = [
  "전화",
  "방문",
  "블로그",
  "인스타그램",
  "유튜브",
  "인터넷 검색",
  "지인 소개",
  "기타",
] as const;

export const DIRECT_INQUIRY_SOURCES = ["전화", "방문"] as const;
