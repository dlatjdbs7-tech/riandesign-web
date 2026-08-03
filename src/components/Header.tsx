"use client";

import { useState } from "react";
import Link from "next/link";

const NAV_ITEMS = [
  { label: "ABOUT", href: "/about" },
  { label: "PROJECT", href: "/project" },
  { label: "PROCESS", href: "/process" },
  { label: "REVIEW", href: "/review" },
];

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-nude/60 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
        <Link
          href="/"
          className="font-serif text-xl font-semibold tracking-[0.2em] text-charcoal"
        >
          REAN DESIGN
        </Link>

        <nav aria-label="주요 메뉴" className="hidden gap-10 sm:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm tracking-wide text-charcoal/80 transition-colors hover:text-gold"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/contact"
          className="hidden rounded-full border border-charcoal px-5 py-2 text-sm tracking-wide text-charcoal transition-colors hover:bg-charcoal hover:text-cream sm:inline-block"
        >
          상담 신청
        </Link>

        <button
          type="button"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
          aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
          className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 sm:hidden"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <span
            className={`h-px w-6 bg-charcoal transition-transform ${
              isMenuOpen ? "translate-y-[3px] rotate-45" : ""
            }`}
          />
          <span
            className={`h-px w-6 bg-charcoal transition-transform ${
              isMenuOpen ? "-translate-y-[3px] -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      {isMenuOpen && (
        <nav
          id="mobile-menu"
          aria-label="모바일 메뉴"
          className="flex flex-col gap-1 border-t border-nude/60 bg-cream px-6 pb-6 sm:hidden"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="py-3 text-sm tracking-wide text-charcoal/80"
              onClick={() => setIsMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/contact"
            className="mt-2 rounded-full border border-charcoal px-5 py-2 text-center text-sm tracking-wide text-charcoal"
            onClick={() => setIsMenuOpen(false)}
          >
            상담 신청
          </Link>
        </nav>
      )}
    </header>
  );
}
