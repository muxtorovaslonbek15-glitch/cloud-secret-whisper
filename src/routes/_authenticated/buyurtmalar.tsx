import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { ShoppingBag, Clock, CheckCircle2, XCircle, Truck, ShoppingBasket, Package } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/buyurtmalar")({
  component: BuyurtmalarPage,
});

const statusMap: Record<string, { label: string; icon: any; color: string }> = {
  yaratildi: { label: "Yaratildi", icon: Clock, color: "text-chart-4 bg-chart-4/10" },
  jarayonda: { label: "Jarayonda", icon: Clock, color: "text-primary bg-primary/10" },
  yolda: { label: "Yo'lda", icon: Truck, color: "text-chart-2 bg-chart-2/10" },
  bajarildi: { label: "Bajarildi", icon: CheckCircle2, color: "text-primary bg-primary/10" },
  bekor: { label: "Bekor qilindi", icon: XCircle, color: "text-destructive bg-destructive/10" },
  yangi: { label: "Yangi", icon: Clock, color: "text-chart-4 bg-chart-4/10" },
  tayyorlanmoqda: { label: "Tayyorlanmoqda", icon: Package, color: "text-primary bg-primary/10" },
  yetkazilmoqda: { label: "Yetkazilmoqda", icon: Truck, color: "text-chart-2 bg-chart-2/10" },
  yetkazildi: { label: "Yetkazildi", icon: CheckCircle2, color: "text-primary bg-primary/10" },
};

function BuyurtmalarPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, technique:techniques(name, image_url), master:masters(specialty)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: marketOrders, isLoading: mLoading } = useQuery({
    queryKey: ["market_orders_mine", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("market_orders")
        .select("*, market_products(name, image_url, currency, category)")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orders").update({ status: "bekor" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Buyurtma bekor qilindi");
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const cancelMarket = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("market_orders").update({ status: "bekor" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Buyurtma bekor qilindi");
      qc.invalidateQueries({ queryKey: ["market_orders_mine"] });
    },
  });

  const hasAny = (orders && orders.length > 0) || (marketOrders && marketOrders.length > 0);

  return (
    <AppShell title="Buyurtmalarim">
      {(isLoading || mLoading) ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-card" />)}</div>
      ) : !hasAny ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 font-semibold">Hozircha buyurtmalar yo'q</h3>
          <p className="mt-1 text-sm text-muted-foreground">Market, texnika yoki usta bo'limlaridan buyurtma bering.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {marketOrders && marketOrders.length > 0 && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <ShoppingBasket className="h-4 w-4" /> Market buyurtmalari ({marketOrders.length})
              </h3>
              <div className="space-y-3">
                {marketOrders.map((o: any) => {
                  const s = statusMap[o.status] ?? statusMap.yangi;
                  return (
                    <div key={o.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft sm:flex-row sm:items-center">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
                        {o.market_products?.image_url ? (
                          <img src={o.market_products.image_url} alt={o.market_products?.name ?? ""} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center"><Package className="h-6 w-6 text-muted-foreground/50" /></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{o.market_products?.name ?? "Mahsulot"}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.color}`}>{s.label}</span>
                          {o.market_products?.category && (
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase text-primary">{o.market_products.category}</span>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          Miqdor: <b>{o.quantity}</b> · Jami: <b className="text-primary">{Number(o.total_price).toLocaleString("uz-UZ")} {o.market_products?.currency ?? "so'm"}</b>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          📞 {o.phone} · 📍 {o.address}
                          {o.notes && ` · ✏️ ${o.notes}`}
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">#{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleString("uz-UZ")}</div>
                      </div>
                      {(o.status === "yangi" || o.status === "tayyorlanmoqda") && (
                        <button onClick={() => cancelMarket.mutate(o.id)} className="rounded-lg border border-destructive/30 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10">
                          Bekor qilish
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {orders && orders.length > 0 && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Truck className="h-4 w-4" /> Texnika / Usta buyurtmalari ({orders.length})
              </h3>
              <div className="space-y-3">
                {orders.map((o) => {
                  const s = statusMap[o.status] ?? statusMap.yaratildi;
                  const title = o.type === "texnika_ijarasi"
                    ? (o.technique?.name || "Texnika buyurtmasi")
                    : (o.master?.specialty ? `${o.master.specialty} ustasi` : "Usta chaqiruvi");
                  return (
                    <div key={o.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-soft sm:flex-row sm:items-center">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${s.color}`}>
                        <s.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{title}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.color}`}>{s.label}</span>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          #{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString("uz-UZ")}
                          {o.price && ` · ${Number(o.price).toLocaleString("uz-UZ")} so'm`}
                        </div>
                        {o.problem_description && <p className="mt-1 text-sm">{o.problem_description}</p>}
                      </div>
                      {o.status === "yaratildi" && o.customer_id === user.id && (
                        <button onClick={() => cancel.mutate(o.id)} className="rounded-lg border border-destructive/30 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10">
                          Bekor qilish
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </AppShell>
  );
}
