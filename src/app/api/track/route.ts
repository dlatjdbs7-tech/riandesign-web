import { createClient } from "@supabase/supabase-js";
import { OLD_SITE_PREFIX } from "@/lib/trafficSource";

// 기존 홈페이지(reandesign.kr, 카페24)의 방문 기록을 받는 곳 (2026-11-15).
// 카페24 화면에 넣은 public/rean-track.js 가 페이지마다 한 번 보낸다.
// 기록은 새 홈페이지와 같은 page_views 표에 path 앞 "kr:" 표시를 붙여 넣는다.

const ALLOWED_ORIGINS = ["https://reandesign.kr", "https://www.reandesign.kr"];

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) return {};
  return { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
}

function cleanText(v: unknown, max: number) {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t || null;
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);
  if (!headers["Access-Control-Allow-Origin"]) return new Response(null, { status: 403 });

  let body: Record<string, unknown> = {};
  try {
    // sendBeacon은 text/plain으로 보내므로 글자로 받아 JSON으로 읽는다 (사전 확인 요청이 생기지 않게)
    body = JSON.parse(await request.text());
  } catch {
    return new Response(null, { status: 400, headers });
  }

  const visitorId = cleanText(body.v, 64);
  const path = cleanText(body.p, 300);
  if (!visitorId || !/^[a-zA-Z0-9_-]+$/.test(visitorId) || !path || !path.startsWith("/")) {
    return new Response(null, { status: 400, headers });
  }
  const referrerHost = cleanText(body.r, 120);
  const utmSource = cleanText(body.u, 80);

  // 쿠키가 필요 없는 공개 기록이라 로그인 없는 기본 키로 넣는다 (page_views는 누구나 넣기 허용)
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
  await supabase.from("page_views").insert({
    visitor_id: `kr-${visitorId}`,
    path: `${OLD_SITE_PREFIX}${path}`,
    referrer_host: referrerHost,
    utm_source: utmSource,
  });

  return new Response(null, { status: 204, headers });
}
