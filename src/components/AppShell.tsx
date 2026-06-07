import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Package, ArrowDownToLine, ArrowUpFromLine, ClipboardEdit, BarChart3, LogOut, Languages, Boxes, Bell } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function AppShell() {
  const { t, lang, setLang } = useI18n();
  const { nama, role, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: s => s.location.pathname });
  const [open, setOpen] = useState(false);

  const items = [
    { to: "/dashboard", icon: LayoutDashboard, label: t("dashboard") },
    { to: "/products", icon: Package, label: t("products") },
    { to: "/incoming", icon: ArrowDownToLine, label: t("incoming") },
    { to: "/outgoing", icon: ArrowUpFromLine, label: t("outgoing") },
    { to: "/adjustments", icon: ClipboardEdit, label: t("adjustments") },
    { to: "/stock", icon: Boxes, label: t("stock") },
    { to: "/reports", icon: BarChart3, label: t("reports") },
  ];

  const handleLogout = async () => { await signOut(); navigate({ to: "/auth" }); };
  const roleLabel = role === "admin" ? t("role_admin") : role === "gudang" ? t("role_gudang") : t("role_kasir");

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-xl bg-primary text-primary-foreground grid place-items-center font-bold shadow-sm">SI</div>
            <div>
              <div className="font-bold text-sidebar-foreground tracking-tight">{t("app_name")}</div>
              <div className="text-[11px] text-muted-foreground leading-tight">{t("app_tagline")}</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map(({ to, icon: Icon, label }) => {
            const active = path === to || (to !== "/dashboard" && path.startsWith(to));
            return (
              <Link key={to} to={to} onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}>
                <Icon className="size-4" /> {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 rounded-lg bg-muted/40 mb-2">
            <div className="text-sm font-medium truncate">{nama || "User"}</div>
            <div className="text-xs text-muted-foreground">{roleLabel}</div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors">
            <LogOut className="size-4" /> {t("logout")}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-14 bg-background/80 backdrop-blur border-b flex items-center justify-between px-4 lg:px-6">
          <button className="lg:hidden p-2 -ml-2" onClick={() => setOpen(true)} aria-label="Menu">
            <span className="block w-5 h-0.5 bg-foreground mb-1" />
            <span className="block w-5 h-0.5 bg-foreground mb-1" />
            <span className="block w-5 h-0.5 bg-foreground" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button onClick={() => setLang(lang === "id" ? "en" : "id")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium hover:bg-accent transition">
              <Languages className="size-3.5" /> {lang.toUpperCase()}
            </button>
            <button className="p-1.5 rounded-lg border hover:bg-accent transition" aria-label="Notifications">
              <Bell className="size-4" />
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
