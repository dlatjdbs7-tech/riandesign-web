import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { Profile } from "@/lib/types";
import LogoutButton from "@/components/admin/LogoutButton";

const MANAGE_ROLES = new Set(["owner", "manager"]);

const NAV_GROUPS: { label: string | null; items: { href: string; label: string; managedOnly?: boolean }[] }[] = [
  { label: null, items: [{ href: "/admin", label: "대시보드" }] },
  {
    label: "PROJECTS",
    items: [
      { href: "/admin/quotes", label: "견적서" },
      { href: "/admin/work-orders", label: "작업지시서" },
      { href: "/admin/transactions", label: "거래명세서" },
      { href: "/admin/customers", label: "고객관리" },
      { href: "/admin/as-requests", label: "AS관리" },
    ],
  },
  {
    label: "DAILY",
    items: [
      { href: "/admin/attendance", label: "근태관리" },
      { href: "/admin/work-logs", label: "업무일지" },
    ],
  },
  {
    label: "LIBRARY",
    items: [
      { href: "/admin/materials", label: "자재리스트" },
      { href: "/admin/templates", label: "템플릿 목록" },
      { href: "/admin/quick-phrases", label: "자주 쓰는 문구" },
    ],
  },
  {
    label: "PEOPLE",
    items: [
      { href: "/admin/employees", label: "임직원", managedOnly: true },
      { href: "/admin/vendors", label: "견적처" },
      { href: "/admin/categories", label: "카테고리" },
    ],
  },
  {
    label: "MARKETING",
    items: [
      { href: "/admin/site-management", label: "사이트관리", managedOnly: true },
      { href: "/admin/inquiries", label: "접수관리", managedOnly: true },
      { href: "/admin/portfolio", label: "포트폴리오" },
    ],
  },
  { label: "FINANCE", items: [{ href: "/admin/finance", label: "정산", managedOnly: true }] },
  {
    label: "OPERATIONS",
    items: [
      { href: "/admin/team-permissions", label: "팀원권한", managedOnly: true },
      { href: "/admin/approvals", label: "결재관리", managedOnly: true },
      { href: "/admin/work-sites", label: "근무지 관리", managedOnly: true },
    ],
  },
  {
    label: "SETTINGS",
    items: [
      { href: "/admin/settings", label: "내정보" },
      { href: "/admin/company-settings", label: "회사설정" },
      { href: "/admin/notifications", label: "알림설정", managedOnly: true },
      { href: "/admin/billing", label: "결제관리", managedOnly: true },
    ],
  },
];

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
      <aside className="flex w-60 flex-col justify-between overflow-y-auto bg-charcoal px-6 py-8 text-cream">
        <div>
          <p className="text-xs tracking-[0.3em] text-nude">REAN DESIGN</p>
          <p className="mt-1 text-xs text-cream/60">관리자 시스템</p>

          <nav className="mt-8 flex flex-col gap-5 text-sm">
            {NAV_GROUPS.map((group) => {
              const items = group.items.filter((item) => !item.managedOnly || canManage);
              if (items.length === 0) return null;

              return (
                <div key={group.label ?? "top"}>
                  {group.label && (
                    <p className="mb-2 text-[10px] tracking-[0.2em] text-cream/40">{group.label}</p>
                  )}
                  <div className="flex flex-col gap-2">
                    {items.map((item) => (
                      <Link key={item.href} href={item.href} className="hover:text-gold">
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
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
