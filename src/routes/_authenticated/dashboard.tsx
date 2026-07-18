import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Tractor, Wrench, ShoppingBag, Bot, TrendingUp, Clock, Sprout, CloudSun, Leaf, Sparkles, ShoppingBasket, Calendar } from "lucide-react";
import heroBg from "@/assets/hero-agrousta.jpg";
import bgSunset from "@/assets/sunset-field.jpg";
import bgRows from "@/assets/rows-field.jpg";
import bgWheat from "@/assets/golden-wheat.jpg";
import bgTractor from "@/assets/tractor-work.jpg";
import bgMeadow from "@/assets/green-meadow.jpg";
import { useI18n } from "@/lib/i18n";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

const bgImageMap: Record<string, string> = {
  agro: heroBg,
  sunset: bgSunset,
  rows: bgRows,
  wheat: bgWheat,
  tractor: bgTractor,
  meadow: bgMeadow,
};

function DashboardPage() {
  const { user } = Route.useRouteContext();
  const { t, lang } = useI18n();
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()).data,
  });

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", user.id],
    queryFn: async () => {
      const [techniques, masters, orders, marketOrders] = await Promise.all([
        supabase.from("techniques").select("id", { count: "exact", head: true }).eq("moderation_status", "tasdiqlangan"),
        supabase.from("masters").select("id", { count: "exact", head: true }).eq("moderation_status", "tasdiqlangan"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("customer_id", user.id),
        supabase.from("market_orders").select("id", { count: "exact", head: true }).eq("customer_id", user.id),
      ]);
      return {
        techniques: techniques.count ?? 0,
        masters: masters.count ?? 0,
        myOrders: orders.count ?? 0,
        myMarketOrders: marketOrders.count ?? 0,
      };
    },
  });

  const bg = ((profile as any)?.bg_choice as string) || "agro";
  const localeMap: Record<string, string> = { uz: "uz-UZ", ru: "ru-RU", en: "en-US" };
  const locale = localeMap[lang] || "uz-UZ";

  const quickActions = [
    { to: "/texnika", icon: Tractor, label: t("app.technique"), color: "from-primary to-primary/70" },
    { to: "/ustalar", icon: Wrench, label: t("app.masters"), color: "from-accent to-accent/70" },
    { to: "/diagnostika", icon: Bot, label: t("app.diag"), color: "from-chart-3 to-chart-3/70" },
    { to: "/buyurtmalar", icon: ShoppingBag, label: t("app.orders"), color: "from-chart-2 to-chart-2/70" },
  ] as const;

  return (
    <AppShell title={t("app.dashboard")}>
      {/* Animated background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        {bg !== "minimal" && (
          <div
            className="absolute inset-0 animate-bg-pan"
            style={{
              backgroundImage: bg !== "field" ? `url(${bgImageMap[bg] || heroBg})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundColor: bg === "field" ? "oklch(0.95 0.05 140)" : undefined,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-background/85 via-background/75 to-primary/20 backdrop-blur-[2px]" />
        {bg !== "minimal" && (
          <div
            className="absolute inset-0 animate-bg-pan opacity-60 mix-blend-soft-light"
            style={{
              backgroundImage:
                "radial-gradient(ellipse at 20% 20%, oklch(0.85 0.15 140 / 0.55), transparent 55%), radial-gradient(ellipse at 80% 30%, oklch(0.85 0.16 85 / 0.45), transparent 55%), radial-gradient(ellipse at 50% 90%, oklch(0.7 0.15 200 / 0.4), transparent 60%)",
            }}
          />
        )}
        <Tractor className="absolute left-[8%] top-[15%] h-16 w-16 text-primary/25 animate-drift-x" />
        <Leaf className="absolute right-[12%] top-[10%] h-14 w-14 text-primary/30 animate-float" style={{ animationDelay: "1s" }} />
        <Sprout className="absolute left-[15%] bottom-[18%] h-20 w-20 text-primary/25 animate-float" style={{ animationDelay: "2s" }} />
        <CloudSun className="absolute right-[8%] bottom-[22%] h-20 w-20 text-accent/35 animate-drift-x" style={{ animationDelay: "3s" }} />
        <Wrench className="absolute left-[45%] top-[8%] h-10 w-10 text-accent/30 animate-spin-slow" />
        <Sparkles className="absolute right-[30%] top-[45%] h-8 w-8 text-accent/40 animate-pulse-soft" />
        <Sparkles className="absolute left-[30%] top-[60%] h-6 w-6 text-primary/40 animate-pulse-soft" style={{ animationDelay: "1.5s" }} />
      </div>

      <div className="relative">
        <div className="mb-6 animate-slide-up-fade">
          <h2 className="text-3xl font-bold">{t("dash.hi")}, {profile?.full_name || "Fermer"} 👋</h2>
          <p className="mt-1 text-muted-foreground">{t("dash.today")}</p>
        </div>

        {/* Date/time widget */}
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card/80 p-5 shadow-soft backdrop-blur-sm animate-slide-up-fade">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <Calendar className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <div className="text-2xl font-bold tabular-nums">
              {now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
            <div className="text-sm text-muted-foreground capitalize">
              {now.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
          <div className="hidden text-right sm:block">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">🌤️ AGRO YORDAMCHI</div>
            <div className="text-sm font-semibold text-primary">Kunni yaxshi o'tkazing!</div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Tractor} label={t("dash.stats.tech")} value={stats?.techniques ?? 0} />
          <StatCard icon={Wrench} label={t("dash.stats.masters")} value={stats?.masters ?? 0} />
          <StatCard icon={ShoppingBag} label={t("dash.stats.orders")} value={stats?.myOrders ?? 0} />
          <Link to="/buyurtmalar" className="block">
            <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 to-accent/10 p-6 shadow-soft transition-transform hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                  <ShoppingBasket className="h-5 w-5 text-primary" />
                </div>
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-4 text-3xl font-bold">{stats?.myMarketOrders ?? 0}</div>
              <div className="mt-1 text-sm text-muted-foreground">{t("dash.myOrders")}</div>
            </div>
          </Link>
        </div>

        {/* Quick actions */}
        <h3 className="mb-4 text-lg font-semibold">{t("dash.quick")}</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((a, i) => (
            <Link
              key={a.to}
              to={a.to}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card/80 p-6 shadow-soft backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-lift animate-slide-up-fade"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${a.color} shadow-soft transition-transform group-hover:scale-110 group-hover:rotate-6`}>
                <a.icon className="h-6 w-6 text-white" />
              </div>
              <div className="mt-4 font-semibold">{a.label}</div>
            </Link>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card/80 p-8 text-center shadow-soft backdrop-blur-sm">
          <Clock className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 font-semibold">🌾 AGRO YORDAMCHI</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Fermer, usta va texnika egalarini bog'lovchi platforma.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Tractor; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-6 shadow-soft backdrop-blur-sm transition-transform hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <TrendingUp className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-4 text-3xl font-bold">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
