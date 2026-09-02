"use client";

import { CalendarDays, CircleDot, History, Settings } from "lucide-react";
import { usePathname } from "next/navigation";

const links = [
  { href: "/today", label: "Сегодня", icon: CircleDot },
  { href: "/week", label: "Неделя", icon: CalendarDays },
  { href: "/history", label: "История", icon: History },
  { href: "/settings", label: "Настройки", icon: Settings },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="nav" aria-label="Основная навигация">
      {links.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(`${link.href}/`);
        const Icon = link.icon;
        return (
          <a
            className={`nav-item ${active ? "active" : ""}`}
            href={link.href}
            aria-current={active ? "page" : undefined}
            key={link.href}
          >
            <span className="nav-icon">
              <Icon size={14} />
            </span>
            <span>{link.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
