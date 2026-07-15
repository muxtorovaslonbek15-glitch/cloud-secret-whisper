import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Tractor, Wrench, ShoppingBag, Bot, TrendingUp, Clock, Sprout, CloudSun, Leaf, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = Route.useRouteContext();

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [techniques, masters, orders] = await Promise.all([
        supabase.from("techniques").select("id", { count: "exact", head: true }),
        supabase.from("masters").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("customer_id", user.id),
      ]);
      return {
        techniques: techniques.count ?? 0,
        masters: masters.count ?? 0,
        myOrders: orders.count ?? 0,
      };
    },
  });

  const quickActions = [
    { to: "/texnika", icon: Tractor, label: "Texnika ijaraga olish", color: "from-primary to-primary/70" },
    { to: "/ustalar", icon: Wrench, label: "Usta chaqirish", color: "from-accent to-accent/70" },
    { to: "/diagnostika", icon: Bot, label: "AI diagnostika", color: "from-chart-3 to-chart-3/70" },
    { to: "/buyurtmalar", icon: ShoppingBag, label: "Buyurtmalarim", color: "from-chart-2 to-chart-2/70" },
  ] as const;

  return (
    <AppShell title="Bosh sahifa">
      {/* Animated background layer */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        {/* Animated gradient wash */}
        <div
          className="absolute inset-0 animate-bg-pan opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 20% 20%, oklch(0.85 0.15 140 / 0.35), transparent 55%), radial-gradient(ellipse at 80% 30%, oklch(0.85 0.16 85 / 0.30), transparent 55%), radial-gradient(ellipse at 50% 90%, oklch(0.7 0.15 200 / 0.25), transparent 60%), linear-gradient(135deg, oklch(0.97 0.03 130), oklch(0.94 0.05 145))",
          }}
        />
        {/* Soft grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(oklch(0.4 0.1 145) 1px, transparent 1px), linear-gradient(90deg, oklch(0.4 0.1 145) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Floating decorative icons */}
        <Tractor className="absolute left-[8%] top-[15%] h-16 w-16 text-primary/15 animate-drift-x" />
        <Leaf className="absolute right-[12%] top-[10%] h-14 w-14 text-primary/20 animate-float" style={{ animationDelay: "1s" }} />
        <Sprout className="absolute left-[15%] bottom-[18%] h-20 w-20 text-primary/15 animate-float" style={{ animationDelay: "2s" }} />
        <CloudSun className="absolute right-[8%] bottom-[22%] h-20 w-20 text-accent/25 animate-drift-x" style={{ animationDelay: "3s" }} />
        <Wrench className="absolute left-[45%] top-[8%] h-10 w-10 text-accent/20 animate-spin-slow" />
        <Sparkles className="absolute right-[30%] top-[45%] h-8 w-8 text-accent/30 animate-pulse-soft" />
        <Sparkles className="absolute left-[30%] top-[60%] h-6 w-6 text-primary/30 animate-pulse-soft" style={{ animationDelay: "1.5s" }} />
      </div>

      <div className="relative">
        <div className="mb-8 animate-slide-up-fade">
          <h2 className="text-3xl font-bold">Salom, {profile?.full_name || "Fermer"} 👋</h2>
          <p className="mt-1 text-muted-foreground">Bugun sizga nima kerak?</p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <StatCard icon={Tractor} label="Mavjud texnikalar" value={stats?.techniques ?? 0} />
          <StatCard icon={Wrench} label="Mavjud ustalar" value={stats?.masters ?? 0} />
          <StatCard icon={ShoppingBag} label="Mening buyurtmalarim" value={stats?.myOrders ?? 0} />
        </div>

        {/* Quick actions */}
        <h3 className="mb-4 text-lg font-semibold">Tez amallar</h3>
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
              <div className="mt-1 text-sm text-muted-foreground">Boshlash uchun bosing</div>
            </Link>
          ))}
        </div>

        {/* Recent activity placeholder */}
        <div className="mt-8 rounded-2xl border border-border bg-card/80 p-8 text-center shadow-soft backdrop-blur-sm">
          <Clock className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 font-semibold">So'nggi faoliyat</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Buyurtma bermagansiz. Yuqoridagi tez amallardan birini tanlang.
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
