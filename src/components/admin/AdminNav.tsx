"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MenuGroup } from "@/lib/menu";
import { MENU_ICONS } from "./menu-icons";

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);
  const Icon = MENU_ICONS[href];

  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
        isActive
          ? "bg-orange-200/80 text-orange-800"
          : "text-charcoal/70 hover:bg-orange-100 hover:text-orange-700"
      }`}
    >
      {Icon && <Icon size={16} strokeWidth={2} className="shrink-0" />}
      <span>{label}</span>
    </Link>
  );
}

export default function AdminNav({
  groups,
  isOwner,
}: {
  groups: MenuGroup[];
  isOwner: boolean;
}) {
  return (
    <nav className="mt-8 flex flex-col gap-5 text-sm">
      <NavLink href="/admin" label="대시보드" />

      {groups.map((group) => {
        if (group.items.length === 0 && !(group.label === "OPERATIONS" && isOwner)) return null;

        return (
          <div key={group.label ?? "top"}>
            {group.label && (
              <p className="mb-2 px-3 text-[10px] tracking-[0.2em] text-taupe/70">{group.label}</p>
            )}
            <div className="flex flex-col gap-1">
              {group.label === "OPERATIONS" && isOwner && (
                <NavLink href="/admin/team-permissions" label="팀원권한" />
              )}
              {group.items.map((item) => (
                <div key={item.key}>
                  {item.dividerBefore && <hr className="my-1 border-t border-dashed border-nude" />}
                  <NavLink href={item.key} label={item.label} />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <NavLink href="/admin/settings" label="내정보" />
    </nav>
  );
}
