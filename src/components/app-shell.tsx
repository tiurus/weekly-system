import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/(app)/actions";
import { NavLinks } from "@/components/nav-links";

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
        <NavLinks />
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
