"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Search, X } from "lucide-react";
import { GROUP_LABELS_KO, PRIMARY_SECTIONS, type MenuGroup } from "@/lib/menu";
import { MENU_ICONS } from "./menu-icons";

type NavItem = { href: string; label: string; group: string; alsoActive?: string[] };

const CHOSUNG = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";

// "현장관리" → "ㅎㅈㄱㄹ" (초성 검색용)
function toChosung(text: string) {
  return Array.from(text)
    .map((ch) => {
      const code = ch.charCodeAt(0) - 0xac00;
      return code >= 0 && code <= 11171 ? CHOSUNG[Math.floor(code / 588)] : ch;
    })
    .join("");
}

function matches(label: string, query: string) {
  const q = query.replace(/\s/g, "");
  if (!q) return false;
  const l = label.replace(/\s/g, "");
  return l.includes(q) || toChosung(l).includes(q);
}

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  badge,
  size = "md",
  hint,
  highlighted,
  alsoActive,
  onNavigate,
}: {
  href: string;
  label: string;
  badge?: number;
  size?: "md" | "sm";
  hint?: string;
  highlighted?: boolean;
  alsoActive?: string[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive = [href, ...(alsoActive ?? [])].some((h) => isActivePath(pathname, h));
  const Icon = MENU_ICONS[href];

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-lg px-3 transition-colors ${
        size === "md" ? "py-2 text-[15px]" : "py-1.5 text-sm"
      } ${
        isActive
          ? "bg-orange-100 font-semibold text-orange-800"
          : highlighted
            ? "bg-stone-100 font-medium text-charcoal"
            : "font-medium text-charcoal/75 hover:bg-stone-100 hover:text-charcoal"
      }`}
    >
      {Icon && <Icon size={size === "md" ? 18 : 16} strokeWidth={2} className="shrink-0" />}
      <span className="truncate">{label}</span>
      {hint && <span className="ml-auto shrink-0 text-[11px] text-charcoal/35">{hint}</span>}
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
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);

  // 권한상 볼 수 있는 메뉴 전체 (key → 이름)
  const visible = new Map<string, string>();
  for (const group of groups) for (const item of group.items) visible.set(item.key, item.label);
  const canSee = (permKey: string) => permKey === "always" || visible.has(permKey);

  const primarySections = PRIMARY_SECTIONS.map((section) => ({
    label: section.label,
    items: section.items
      .filter((item) => canSee(item.permKey ?? item.href))
      .map((item) => ({
        href: item.href,
        label: item.label ?? visible.get(item.permKey ?? item.href) ?? item.href,
        group: section.label ?? "기본",
        alsoActive: item.alsoActive,
      })),
  })).filter((s) => s.items.length > 0);

  const primaryHrefs = new Set(
    PRIMARY_SECTIONS.flatMap((s) => s.items.flatMap((i) => [i.href, ...(i.alsoActive ?? [])]))
  );

  // 메인에 없는 나머지 = 보관 메뉴
  const archiveGroups = groups
    .map((group) => {
      const label = group.label ? (GROUP_LABELS_KO[group.label] ?? group.label) : "기타";
      const items: NavItem[] = group.items
        .filter((item) => !item.hidden && !primaryHrefs.has(item.key))
        .map((item) => ({ href: item.key, label: item.label, group: label }));
      if (group.label === "PEOPLE" && isOwner) {
        items.push({ href: "/admin/team-permissions", label: "임직원권한", group: label });
      }
      return { label, items };
    })
    .filter((g) => g.items.length > 0);

  const allItems: NavItem[] = [
    ...primarySections.flatMap((s) => s.items),
    ...archiveGroups.flatMap((g) => g.items),
    { href: "/admin/trash", label: "휴지통", group: "설정" },
    { href: "/admin/settings", label: "내정보", group: "설정" },
  ];
  const results = query.trim() ? allItems.filter((item) => matches(item.label, query.trim())) : [];

  const archiveHrefs = archiveGroups.flatMap((g) => g.items.map((i) => i.href));
  const archiveBadgeTotal = archiveHrefs.reduce((sum, href) => sum + (badges?.[href] ?? 0), 0);
  const isInArchive = archiveHrefs.some((href) => isActivePath(pathname, href));
  const showArchive = archiveOpen || isInArchive;

  // Ctrl+K 또는 / 로 메뉴 검색 칸으로 이동 (화면에 보이는 사이드바에서만)
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const input = searchRef.current;
      if (!input || input.offsetParent === null) return;
      const target = event.target as HTMLElement;
      const typing = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        input.focus();
      } else if (event.key === "/" && !typing) {
        event.preventDefault();
        input.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function go(href: string) {
    setQuery("");
    onNavigate?.();
    router.push(href);
  }

  return (
    <nav className="mt-6 flex flex-col">
      {/* 메뉴 검색 */}
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/35" />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results[0]) go(results[0].href);
            if (e.key === "Escape") {
              setQuery("");
              e.currentTarget.blur();
            }
          }}
          placeholder="메뉴 검색"
          title="메뉴 이름이나 초성으로 찾기 (예: 현장, ㅎㅈ)"
          className="w-full rounded-lg border border-nude/70 bg-stone-50 py-2 pl-9 pr-14 text-sm outline-none placeholder:text-charcoal/35 focus:border-orange-300 focus:bg-white"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="검색 지우기"
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-charcoal/40 hover:text-charcoal"
          >
            <X size={14} />
          </button>
        ) : (
          <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-nude bg-white px-1.5 text-[10px] text-charcoal/40 lg:block">
            Ctrl K
          </kbd>
        )}
      </div>

      {query.trim() ? (
        <div className="mt-3 flex flex-col gap-0.5">
          {results.map((item, i) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              hint={item.group}
              highlighted={i === 0}
              onNavigate={() => {
                setQuery("");
                onNavigate?.();
              }}
            />
          ))}
          {results.length === 0 && <p className="px-3 py-4 text-sm text-charcoal/40">찾는 메뉴가 없습니다.</p>}
          {results.length > 0 && (
            <p className="px-3 pt-2 text-[11px] text-charcoal/35">Enter를 누르면 첫 번째 메뉴로 이동</p>
          )}
        </div>
      ) : (
        <>
          {primarySections.map((section, index) => (
            <div key={section.label ?? "top"} className={index > 0 ? "mt-3 border-t border-nude/70 pt-3" : "mt-4"}>
              {section.label && (
                <p className="mb-1 px-3 text-[11px] font-semibold tracking-wide text-charcoal/40">{section.label}</p>
              )}
              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    badge={badges?.[item.href]}
                    alsoActive={item.alsoActive}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </div>
          ))}

          {archiveGroups.length > 0 && (
            <div className="mt-3 border-t border-nude/70 pt-3">
              <button
                type="button"
                onClick={() => setArchiveOpen(!showArchive)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-charcoal/45 hover:bg-stone-100 hover:text-charcoal"
              >
                <span>보관 메뉴</span>
                {archiveBadgeTotal > 0 && !showArchive && (
                  <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-orange-500 px-1.5 text-[11px] font-bold text-white">
                    {archiveBadgeTotal}
                  </span>
                )}
                <ChevronDown size={16} className={`ml-auto transition-transform ${showArchive ? "rotate-180" : ""}`} />
              </button>

              {showArchive && (
                <div className="mt-2 flex flex-col gap-3">
                  {archiveGroups.map((group) => (
                    <div key={group.label}>
                      <p className="mb-1 px-3 text-[11px] font-semibold text-charcoal/35">{group.label}</p>
                      <div className="flex flex-col gap-0.5">
                        {group.items.map((item) => (
                          <NavLink
                            key={item.href}
                            href={item.href}
                            label={item.label}
                            badge={badges?.[item.href]}
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

          <div className="mt-3 flex flex-col gap-0.5 border-t border-nude/70 pt-3">
            <NavLink href="/admin/trash" label="휴지통" size="sm" onNavigate={onNavigate} />
            <NavLink href="/admin/settings" label="내정보" size="sm" onNavigate={onNavigate} />
          </div>
        </>
      )}
    </nav>
  );
}
