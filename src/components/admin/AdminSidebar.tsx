"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import type { MenuGroup } from "@/lib/menu";
import AdminNav from "./AdminNav";
import LogoutButton from "./LogoutButton";

function Brand() {
  return (
    <Link href="/admin" className="block px-1 text-center">
      <p className="text-[15px] font-bold tracking-[0.22em] text-charcoal">REAN NETWORKS</p>
      <p className="mt-1 text-xs font-medium text-orange-600">리안네트웍스</p>
    </Link>
  );
}

// PC: 왼쪽 고정 사이드바 / 모바일: 상단 바 + 햄버거로 여는 메뉴
export default function AdminSidebar({
  groups,
  isOwner,
  badges,
  userName,
  roleLabel,
}: {
  groups: MenuGroup[];
  isOwner: boolean;
  badges: Record<string, number>;
  userName: string;
  roleLabel: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const totalBadge = Object.values(badges).reduce((a, b) => a + b, 0);

  const panel = (onNavigate?: () => void) => (
    <>
      <div>
        <Brand />
        <AdminNav groups={groups} isOwner={isOwner} badges={badges} onNavigate={onNavigate} />
      </div>
      <div className="mt-8 flex flex-col gap-3 border-t border-nude/50 pt-4">
        <div>
          <p className="text-sm font-medium text-charcoal">{userName}</p>
          <p className="text-xs text-charcoal/50">{roleLabel}</p>
        </div>
        <LogoutButton />
      </div>
    </>
  );

  return (
    <>
      {/* PC 사이드바 */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between overflow-y-auto border-r border-nude/50 bg-white px-4 py-8 lg:flex">
        {panel()}
      </aside>

      {/* 모바일 상단 바 */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-nude/50 bg-white px-4 py-3 lg:hidden">
        <p className="text-sm font-bold text-charcoal">리안네트웍스</p>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="메뉴 열기"
          className="relative flex h-11 w-11 items-center justify-center rounded-lg text-charcoal hover:bg-stone-100"
        >
          <Menu size={22} />
          {totalBadge > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-orange-500" />
          )}
        </button>
      </header>

      {/* 모바일 메뉴 */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col justify-between overflow-y-auto bg-white px-4 py-6">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="메뉴 닫기"
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-lg text-charcoal/60 hover:bg-stone-100"
            >
              <X size={20} />
            </button>
            {panel(() => setMobileOpen(false))}
          </div>
        </div>
      )}
    </>
  );
}
