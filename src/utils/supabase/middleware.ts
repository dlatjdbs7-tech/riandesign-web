import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { ALWAYS_ALLOWED_KEYS, OWNER_ONLY_KEYS, findMenuKeyForPath } from "@/lib/menu";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // createServerClient와 getUser() 사이에는 다른 로직을 넣지 않아야 합니다.
  // 세션 갱신이 꼬여서 사용자가 임의로 로그아웃되는 문제가 생길 수 있습니다.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // 메뉴 접근 권한: 사이드바에서 숨긴 메뉴를 주소창으로 직접 쳐서 들어가는 것도 막는다.
  if (user && pathname.startsWith("/admin")) {
    const menuKey = findMenuKeyForPath(pathname);

    if (menuKey && !ALWAYS_ALLOWED_KEYS.includes(menuKey)) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const role = profile?.role;

      if (role && role !== "owner") {
        if (OWNER_ONLY_KEYS.includes(menuKey)) {
          const url = request.nextUrl.clone();
          url.pathname = "/admin";
          return NextResponse.redirect(url);
        }

        const { data: permission } = await supabase
          .from("role_menu_permissions")
          .select("can_view")
          .eq("role", role)
          .eq("menu_key", menuKey)
          .maybeSingle();

        if (permission?.can_view === false) {
          const url = request.nextUrl.clone();
          url.pathname = "/admin";
          return NextResponse.redirect(url);
        }
      }
    }
  }

  return supabaseResponse;
}
