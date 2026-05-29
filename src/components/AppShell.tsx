import { CalendarDays, Home, LogOut, Sparkles, Users } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAppData } from "../services/AppDataContext";
import { logout } from "../services/auth";
import { Logo } from "./Logo";

const navItems = [
  { to: "/", label: "Inicio", icon: Home },
  { to: "/horario", label: "Mi horario", icon: CalendarDays },
  { to: "/grupos", label: "Mis grupos", icon: Users },
  { to: "/recomendaciones", label: "Recomendaciones", icon: Sparkles },
];

export function AppShell() {
  const { currentUser } = useAppData();

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <header className="sticky top-0 z-50 w-full border-b border-border-subtle bg-surface-container-lowest/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 md:px-6">
          <Logo />
          <nav className="hidden items-center gap-6 lg:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 border-b-2 pb-1 text-sm font-semibold transition-colors ${
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-on-surface-variant hover:text-primary"
                    }`
                  }
                >
                  <Icon size={17} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
          <div className="flex items-center gap-3">
            <NavLink
              to="/recomendaciones"
              className="hidden rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-transform active:scale-95 md:inline-flex"
            >
              Buscar momento
            </NavLink>
            <img
              className="h-10 w-10 rounded-full border border-border-subtle bg-primary-fixed object-cover"
              src={currentUser?.avatarUrl}
              alt={currentUser?.name ?? "Usuario"}
            />
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-lg p-2 text-outline transition-colors hover:bg-surface-container"
              aria-label="Cerrar sesion"
            >
              <LogOut size={19} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] px-4 py-8 md:px-6">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-around border-t border-border-subtle bg-white px-3 py-2 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] lg:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex min-w-14 flex-col items-center rounded-full px-3 py-1 text-[11px] font-semibold ${
                  isActive ? "bg-primary text-white" : "text-on-surface-variant"
                }`
              }
            >
              <Icon size={18} />
              <span className="max-w-20 truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
