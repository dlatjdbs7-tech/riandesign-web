import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { Profile } from "@/lib/types";
import { MENU_GROUPS } from "@/lib/menu";
import LogoutButton from "@/components/admin/LogoutButton";

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

  return (
    <div className="flex min-h-screen bg-cream">
      <aside className="flex w-60 flex-col justify-between overflow-y-auto bg-charcoal px-6 py-8 text-cream">
        <div>
          <p className="text-xs tracking-[0.3em] text-nude">REAN DESIGN</p>
          <p className="mt-1 text-xs text-cream/60">관리자 시스템</p>

          <nav className="mt-8 flex flex-col gap-5 text-sm">
            <Link href="/admin" className="hover:text-gold">
              대시보드
            </Link>

            {MENU_GROUPS.map((group) => {
              const items = group.items.filter((item) => canView(item.key));
              const showOperationsExtra = group.label === "OPERATIONS" && isOwner;
              if (items.length === 0 && !showOperationsExtra) return null;

              return (
                <div key={group.label ?? "top"}>
                  {group.label && (
                    <p className="mb-2 text-[10px] tracking-[0.2em] text-cream/40">{group.label}</p>
                  )}
                  <div className="flex flex-col gap-2">
                    {group.label === "OPERATIONS" && isOwner && (
                      <Link href="/admin/team-permissions" className="hover:text-gold">
                        팀원권한
                      </Link>
                    )}
                    {items.map((item) => (
                      <Link key={item.key} href={item.key} className="hover:text-gold">
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}

            <Link href="/admin/settings" className="hover:text-gold">
              내정보
            </Link>
          </nav>
        </div>

        <div className="flex flex-col gap-3">
          <div className="text-xs text-cream/60">
            <p className="text-cream">{profile.full_name}</p>
            <p>{profile.role === "owner" ? "대표" : profile.role === "manager" ? "팀장" : "직원"}</p>
          </div>
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto px-10 py-10">{children}</main>
    </div>
  );
}
