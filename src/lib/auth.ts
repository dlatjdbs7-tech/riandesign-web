// Supabase Auth는 이메일 기반이라, "아이디"를 내부적으로 가짜 이메일로 변환해서 사용한다.
// 이 도메인으로는 실제 메일이 발송되지 않는다 (이메일 인증을 사용하지 않기 때문).
const USERNAME_EMAIL_DOMAIN = "reandesign.local";

export const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

export function toAuthEmail(username: string) {
  return `${username.trim().toLowerCase()}@${USERNAME_EMAIL_DOMAIN}`;
}
