"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { GROUP_LABELS_KO, PRIMARY_SECTIONS, type MenuGroup } from "@/lib/menu";
import { MENU_ICONS } from "./menu-icons";

type NavItem = { key: string; label: string };

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  badge,
  size = "md",
  onNavigate,
}: {
  href: string;
  label: string;
  badge?: number;
  size?: "md" | "sm";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive = isActivePath(pathname, href);
  const Icon = MENU_ICONS[href];

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-lg px-3 transition-colors ${
        size === "md" ? "py-2.5 text-[15px]" : "py-2 text-sm"
      } ${
        isActive
          ? "bg-orange-100 font-semibold text-orange-800"
          : "font-medium text-charcoal/75 hover:bg-stone-100 hover:text-charcoal"
      }`}
    >
      {Icon && <Icon size={size === "md" ? 18 : 16} strokeWidth={2} className="shrink-0" />}
      <span>{label}</span>
      {!!badge && (
        <span className="ml-auto flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[11px] font-bold text-white">
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
  onNavigate,
}: {
  groups: MenuGroup[];
  isOwner: boolean;
  badges?: Record<string, number>;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  // 권한상 볼 수 있는 메뉴 전체 (key → label)
  const visible = new Map<string, string>();
  for (const group of groups) for (const item of group.items) visible.set(item.key, item.label);

  const primaryKeys = new Set(PRIMARY_SECTIONS.flatMap((s) => s.keys));
  const primarySections = PRIMARY_SECTIONS.map((section) => ({
    label: section.label,
    items: section.keys
      .filter((key) => visible.has(key))
      .map((key) => ({ key, label: visible.get(key)! })),
  })).filter((s) => s.items.length > 0);

  // 메인에 없는 나머지 = 보관 메뉴
  const archiveGroups: { label: string; items: NavItem[] }[] = groups
    .map((group) => {
      const items: NavItem[] = group.items
        .filter((item) => !item.hidden && !primaryKeys.has(item.key))
        .map((item) => ({ key: item.key, label: item.label }));
      if (group.label === "PEOPLE" && isOwner) {
        items.push({ key: "/admin/team-permissions", label: "임직원권한" });
      }
      return { label: group.label ? (GROUP_LABELS_KO[group.label] ?? group.label) : "기타", items };
    })
    .filter((g) => g.items.length > 0);

  const archiveKeys = archiveGroups.flatMap((g) => g.items.map((i) => i.key));
  const archiveBadgeTotal = archiveKeys.reduce((sum, key) => sum + (badges?.[key] ?? 0), 0);
  const isInArchive = archiveKeys.some((key) => isActivePath(pathname, key));
  const [archiveOpen, setArchiveOpen] = useState(false);
  const showArchive = archiveOpen || isInArchive;

  return (
    <nav className="mt-8 flex flex-col gap-6">
      <NavLink href="/admin" label="대시보드" onNavigate={onNavigate} />

      {primarySections.map((section) => (
        <div key={section.label}>
          <p className="mb-1.5 px-3 text-xs font-semibold text-charcoal/40">{section.label}</p>
          <div className="flex flex-col gap-0.5">
            {section.items.map((item) => (
              <NavLink
                key={item.key}
                href={item.key}
                label={item.label}
                badge={badges?.[item.key]}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}

      {archiveGroups.length > 0 && (
        <div className="border-t border-nude/60 pt-4">
          <button
            type="button"
            onClick={() => setArchiveOpen(!showArchive)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-charcoal/50 hover:bg-stone-100 hover:text-charcoal"
          >
            <span>보관 메뉴</span>
            {archiveBadgeTotal > 0 && !showArchive && (
              <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-orange-500 px-1.5 text-[11px] font-bold text-white">
                {archiveBadgeTotal}
              </span>
            )}
            <ChevronDown
              size={16}
              className={`ml-auto transition-transform ${showArchive ? "rotate-180" : ""}`}
            />
          </button>

          {showArchive && (
            <div className="mt-2 flex flex-col gap-4">
              {archiveGroups.map((group) => (
                <div key={group.label}>
                  <p className="mb-1 px-3 text-[11px] font-semibold text-charcoal/35">{group.label}</p>
                  <div className="flex flex-col gap-0.5">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.key}
                        href={item.key}
                        label={item.label}
                        badge={badges?.[item.key]}
                        size="sm"
                        onNavigate={onNavigate}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="border-t border-nude/60 pt-4">
        <NavLink href="/admin/settings" label="내정보" size="sm" onNavigate={onNavigate} />
      </div>
    </nav>
  );
}
