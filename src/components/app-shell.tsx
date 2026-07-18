import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Tractor, Wrench, ShoppingBag, Bot, User, LogOut, Menu, X, ShoppingBasket, Bell, ShieldCheck, MessageSquare, Settings } from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { ThemeToggle } from "./theme-toggle";
import { LangSwitcher } from "./lang-switcher";
import { NotificationsBell } from "./notifications-bell";

const navItems = [
  { to: "/dashboard", key: "app.dashboard", icon: LayoutDashboard },
  { to: "/texnika", key: "app.technique", icon: Tractor },
  { to: "/ustalar", key: "app.masters", icon: Wrench },
  { to: "/market", key: "app.market", icon: ShoppingBasket },
  { to: "/buyurtmalar", key: "app.orders", icon: ShoppingBag },
  { to: "/diagnostika", key: "app.diag", icon: Bot },
  { to: "/bildirishnomalar", key: "app.notif", icon: Bell },
  { to: "/murojaat", key: "app.contact", icon: MessageSquare },
  { to: "/sozlamalar", key: "app.settings", icon: Settings },
  { to: "/profil", key: "app.profile", icon: User },
] as const;

export function AppShell({ children, title }: { children: ReactNode; title: string }) {
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useI18n();

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
      setIsAdmin(!!data);
    })();
  }, []);

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex min-h-screen bg-secondary/30">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-border bg-card transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Tractor className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold">AGRO YORDAMCHI</span>
        </div>
        <nav className="space-y-1 p-4 pb-24">
          {navItems.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-gradient-primary text-primary-foreground shadow-soft"
                    : "text-foreground/70 hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {t(item.key)}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                pathname === "/admin"
                  ? "bg-gradient-primary text-primary-foreground shadow-soft"
                  : "text-accent hover:bg-accent/10"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              Admin panel
            </Link>
          )}
        </nav>
        <div className="absolute bottom-4 left-4 right-4">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            {t("app.signOut")}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 lg:pl-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-xl lg:px-8">
          <button
            onClick={() => setOpen(!open)}
            className="lg:hidden"
            aria-label="Menyu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <h1 className="text-lg font-semibold flex-1">{title}</h1>
          <div className="flex items-center gap-2">
            <LangSwitcher />
            <ThemeToggle />
            <NotificationsBell />
          </div>
        </header>
        <main className="p-4 lg:p-8 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}