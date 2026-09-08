"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/home", label: "Home", icon: "🏠" },
  { href: "/discover", label: "Discover", icon: "🔍" },
  { href: "/requests/mine", label: "My Requests", icon: "📋" },
  { href: "/messages", label: "Messages", icon: "💬" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border flex justify-around items-stretch z-40"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Primary"
      >
        {TABS.map((tab) => {
          const active = pathname?.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-0.5 py-2.5 px-2 flex-1 min-h-[56px] text-xs font-medium transition-colors ${
                active ? "text-primary" : "text-text-secondary"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span aria-hidden="true" className="text-lg">{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Desktop sidebar */}
      <nav
        className="hidden md:flex md:flex-col md:w-60 md:border-r md:border-border md:bg-surface md:min-h-screen md:sticky md:top-0 md:py-6 md:px-3 gap-1"
        aria-label="Primary"
      >
        <div className="px-3 mb-6">
          <span className="font-bold text-lg text-primary">CampusConnect</span>
        </div>
        {TABS.map((tab) => {
          const active = pathname?.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active ? "bg-primary-light text-primary" : "text-text-secondary hover:bg-background"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span aria-hidden="true">{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
