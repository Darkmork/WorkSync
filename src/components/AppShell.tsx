import { CalendarDays, Home, LogOut, Moon, Sparkles, Sun, Users, Vote } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAppData } from "../services/AppDataContext";
import { logout } from "../services/auth";
import { Logo } from "./Logo";
import { NotificationsBell } from "./NotificationsBell";
import { useState, useEffect } from "react";

const navItems = [
  { to: "/", label: "Inicio", icon: Home },
  { to: "/horario", label: "Mi horario", icon: CalendarDays },
  { to: "/grupos", label: "Mis grupos", icon: Users },
  { to: "/recomendaciones", label: "Recomendaciones", icon: Sparkles },
  { to: "/votaciones", label: "Votaciones", icon: Vote },
];

export function AppShell() {
  const { currentUser } = useAppData();
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("worksync-dark-mode") === "true";
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("worksync-dark-mode", "true");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("worksync-dark-mode", "false");
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  return (
    <div className="min-h-screen bg-background text-on-surface dark:bg-[#191c1d] dark:text-[#e1e3e4]">
      <header className="sticky top-0 z-50 w-full border-b border-border-subtle bg-surface-container-lowest/95 shadow-sm backdrop-blur dark:border-[#424754] dark:bg-[#191c1d]/95">
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
                        : "border-transparent text-on-surface-variant hover:text-primary dark:text-[#e1e3e4]"
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
            <button
              type="button"
              onClick={toggleDarkMode}
              className="rounded-lg p-2 text-outline transition-colors hover:bg-surface-container dark:text-[#e1e3e4] dark:hover:bg-[#424754]"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <NavLink
              to="/recomendaciones"
              className="hidden rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-transform active:scale-95 md:inline-flex"
            >
              Buscar momento
            </NavLink>
            <NotificationsBell />
            <img
              className="h-10 w-10 rounded-full border border-border-subtle bg-primary-fixed object-cover"
              src={currentUser?.avatarUrl}
              alt={currentUser?.name ?? "Usuario"}
            />
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-lg p-2 text-outline transition-colors hover:bg-surface-container dark:text-[#e1e3e4] dark:hover:bg-[#424754]"
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

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-around border-t border-border-subtle bg-white px-3 py-2 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] dark:border-[#424754] dark:bg-[#191c1d] lg:hidden">
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
