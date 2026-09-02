import {
  CalendarDays,
  CircleDot,
  History,
  LogOut,
  Settings,
} from "lucide-react";
import { logoutAction } from "@/app/(app)/actions";

export function AppShell({
  username,
  children,
}: {
  username: string;
  children: React.ReactNode;
}) {
  const initials = username.slice(0, 2).toUpperCase();

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">W</span>
          <span>Weekly System</span>
        </div>
        <nav className="nav" aria-label="Основная навигация">
          <a className="nav-item active" href="/today">
            <span className="nav-icon">
              <CircleDot size={14} />
            </span>
            <span>Сегодня</span>
          </a>
          <a className="nav-item" href="/week">
            <span className="nav-icon">
              <CalendarDays size={14} />
            </span>
            <span>Неделя</span>
          </a>
          <a className="nav-item" href="/history">
            <span className="nav-icon">
              <History size={14} />
            </span>
            <span>История</span>
          </a>
          <a className="nav-item" href="/settings">
            <span className="nav-icon">
              <Settings size={14} />
            </span>
            <span>Настройки</span>
          </a>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <strong>Главное правило</strong>Успех — выполнить план выбранного
            режима, а не максимум возможного.
          </div>
          <form action={logoutAction}>
            <button className="logout-button" type="submit">
              <LogOut size={15} />
              <span>Выйти</span>
            </button>
          </form>
        </div>
      </aside>
      <main className="main">
        <div className="mobile-account">
          <span className="avatar">{initials}</span>
        </div>
        {children}
      </main>
    </div>
  );
}
