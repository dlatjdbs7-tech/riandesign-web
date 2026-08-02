import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { Profile } from "@/lib/types";
import LogoutButton from "@/components/admin/LogoutButton";

const MANAGE_ROLES = new Set(["owner", "manager"]);

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

  const canManage = MANAGE_ROLES.has(profile.role);

  return (
    <div className="flex min-h-screen bg-cream">
      <aside className="flex w-56 flex-col justify-between bg-charcoal px-6 py-8 text-cream">
        <div>
          <p className="text-xs tracking-[0.3em] text-nude">REAN DESIGN</p>
          <p className="mt-1 text-xs text-cream/60">관리자 시스템</p>

          <nav className="mt-10 flex flex-col gap-4 text-sm">
            <Link href="/admin" className="hover:text-gold">
              대시보드
            </Link>
            <Link href="/admin/attendance" className="hover:text-gold">
              근태 관리
            </Link>
            {canManage && (
              <>
                <Link href="/admin/employees" className="hover:text-gold">
                  직원 관리
                </Link>
                <Link href="/admin/work-sites" className="hover:text-gold">
                  근무지 관리
                </Link>
              </>
            )}
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

      <main className="flex-1 px-10 py-10">{children}</main>
    </div>
  );
}
