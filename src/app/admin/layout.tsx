import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { Profile } from "@/lib/types";
import { MENU_GROUPS } from "@/lib/menu";
import AdminSidebar from "@/components/admin/AdminSidebar";
import UndoToaster from "@/components/admin/UndoToaster";
import ChatWidget from "@/components/admin/chat/ChatWidget";
import { getNotificationCount } from "@/lib/notifications";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile || profile.status !== "approved") {
    redirect("/pending");
  }

  const isOwner = profile.role === "owner";

  let permissionMap: Map<string, boolean> | null = null;
  let usesJobRankPermissions = false;
  if (!isOwner) {
    if (profile.job_rank) {
      usesJobRankPermissions = true;
      const { data: permissions } = await supabase
        .from("job_rank_menu_permissions")
        .select("menu_key, can_view")
        .eq("job_rank", profile.job_rank);
      permissionMap = new Map((permissions ?? []).map((p) => [p.menu_key, p.can_view]));
    } else {
      const { data: permissions } = await supabase
        .from("role_menu_permissions")
        .select("menu_key, can_view")
        .eq("role", profile.role);
      permissionMap = new Map((permissions ?? []).map((p) => [p.menu_key, p.can_view]));
    }
  }

  // 직급이 있으면 체크한 메뉴만 보임(기본값 숨김), 직급이 없으면 기존처럼 기본값 보임.
  const canView = (key: string) =>
    isOwner || (usesJobRankPermissions ? permissionMap?.get(key) === true : permissionMap?.get(key) !== false);

  const visibleGroups = MENU_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canView(item.key)),
  }));

  const { count: pendingDirectiveCount } = await supabase
    .from("work_directives")
    .select("id", { count: "exact", head: true })
    .neq("status", "completed");

  // 내가 상담접수를 마지막으로 연 시각 이후 새로 들어온 건수 = 카톡처럼 내가 확인하면 사라지는 뱃지.
  const { count: newInquiryCount } = await supabase
    .from("inquiries")
    .select("id", { count: "exact", head: true })
    .gt("created_at", profile.last_viewed_inquiries_at ?? "1970-01-01T00:00:00Z");

  const notificationCount = await getNotificationCount(supabase, { id: profile.id, role: profile.role });

  const badges: Record<string, number> = {
    "/admin/field-management": pendingDirectiveCount ?? 0,
    "/admin/inquiries": newInquiryCount ?? 0,
    "/admin/notification-center": notificationCount,
  };

  return (
    <div className="min-h-screen bg-stone-100 font-admin lg:flex">
      <AdminSidebar
        groups={visibleGroups}
        isOwner={isOwner}
        badges={badges}
        userName={profile.full_name ?? ""}
        roleLabel={profile.role === "owner" ? "대표" : profile.role === "manager" ? "팀장" : "직원"}
      />

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>

      <UndoToaster />
      <ChatWidget currentUserId={user.id} isOwner={isOwner} />
    </div>
  );
}
