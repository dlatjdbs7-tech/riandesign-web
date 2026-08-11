import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { Profile } from "@/lib/types";
import { MENU_GROUPS } from "@/lib/menu";
import AdminNav from "@/components/admin/AdminNav";
import LogoutButton from "@/components/admin/LogoutButton";
import ChatWidget from "@/components/admin/chat/ChatWidget";

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
  if (!isOwner) {
    const { data: permissions } = await supabase
      .from("role_menu_permissions")
      .select("menu_key, can_view")
      .eq("role", profile.role);
    permissionMap = new Map((permissions ?? []).map((p) => [p.menu_key, p.can_view]));
  }

  const canView = (key: string) => isOwner || permissionMap?.get(key) !== false;

  const visibleGroups = MENU_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canView(item.key)),
  }));

  return (
    <div className="flex min-h-screen bg-stone-100 font-admin">
      <aside className="flex w-64 flex-col justify-between overflow-y-auto border-r border-nude/50 bg-white px-5 py-8">
        <div>
          <div className="text-center">
            <p className="text-base font-semibold tracking-[0.25em] text-charcoal">REAN DESIGN</p>
            <p className="mt-3 flex justify-center gap-3 text-[10px] tracking-wide text-taupe/70">
              <span>
                <span className="font-semibold">RE-</span>ANALYZE
              </span>
              <span>
                <span className="font-semibold">RE-</span>DESIGN
              </span>
            </p>
          </div>

          <AdminNav groups={visibleGroups} isOwner={isOwner} />
        </div>

        <div className="flex flex-col gap-3 border-t border-nude/50 pt-4">
          <div className="text-xs text-charcoal/50">
            <p className="text-sm font-medium text-charcoal">{profile.full_name}</p>
            <p>{profile.role === "owner" ? "대표" : profile.role === "manager" ? "팀장" : "직원"}</p>
          </div>
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto px-10 py-10">{children}</main>

      <ChatWidget currentUserId={user.id} />
    </div>
  );
}
