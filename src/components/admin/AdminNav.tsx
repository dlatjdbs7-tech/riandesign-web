"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MenuGroup } from "@/lib/menu";
import { MENU_ICONS } from "./menu-icons";

function NavLink({ href, label, badge }: { href: string; label: string; badge?: number }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);
  const Icon = MENU_ICONS[href];
  const isNotificationCenter = href === "/admin/notification-center";

  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        isNotificationCenter
          ? isActive
            ? "bg-red-200/80 text-red-800"
            : "bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
          : isActive
            ? "bg-orange-200/80 text-orange-800"
            : "text-charcoal/70 hover:bg-orange-100 hover:text-orange-700"
      }`}
    >
      {Icon && <Icon size={16} strokeWidth={2} className="shrink-0" />}
      <span>{label}</span>
      {!!badge && (
        <span className="ml-auto flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-orange-500 px-1 text-[11px] font-bold text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}

export default function AdminNav({
  groups,
  isOwner,
  badges,
}: {
  groups: MenuGroup[];
  isOwner: boolean;
  badges?: Record<string, number>;
}) {
  return (
    <nav className="mt-8 flex flex-col gap-5 text-sm">
      <NavLink href="/admin" label="대시보드" />

      {groups.map((group) => {
        if (group.items.length === 0 && !(group.label === "PEOPLE" && isOwner)) return null;

        return (
          <div key={group.label ?? "top"}>
            {group.label && (
              <p className="mb-2 px-3 text-[10px] tracking-[0.2em] text-taupe/70">{group.label}</p>
            )}
            <div className="flex flex-col gap-1">
              {group.items
                .filter((item) => !item.hidden)
                .map((item) => (
                  <div key={item.key}>
                    {item.dividerBefore && <hr className="my-1 border-t border-dashed border-nude" />}
                    <NavLink href={item.key} label={item.label} badge={badges?.[item.key]} />
                  </div>
                ))}
              {group.label === "PEOPLE" && isOwner && (
                <NavLink href="/admin/team-permissions" label="임직원권한" />
              )}
            </div>
          </div>
        );
      })}

      <NavLink href="/admin/settings" label="내정보" />
    </nav>
  );
}
