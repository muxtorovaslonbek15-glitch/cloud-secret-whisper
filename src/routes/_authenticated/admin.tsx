import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminStats } from "@/lib/telegram.functions";
import { AppShell } from "@/components/app-shell";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Tractor, Wrench, ShoppingBag, ShoppingBasket, Bot, Bell, Send, Loader2, ShieldCheck, MessageSquare, Truck, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin panel — AGRO YORDAMCHI" }] }),
  component: AdminPage,
});

const STAT_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  profiles: { label: "Foydalanuvchilar", icon: Users, color: "from-blue-500 to-blue-600" },
  techniques: { label: "Texnikalar", icon: Tractor, color: "from-green-500 to-green-600" },
  masters: { label: "Ustalar", icon: Wrench, color: "from-orange-500 to-orange-600" },
  orders: { label: "Buyurtmalar", icon: ShoppingBag, color: "from-purple-500 to-purple-600" },
  market_products: { label: "Market mahsulotlari", icon: ShoppingBasket, color: "from-pink-500 to-pink-600" },
  market_orders: { label: "Market buyurtmalari", icon: Truck, color: "from-emerald-500 to-emerald-600" },
  contact_messages: { label: "Murojaatlar", icon: MessageSquare, color: "from-rose-500 to-rose-600" },
  ai_diagnostics: { label: "AI diagnostikalar", icon: Bot, color: "from-cyan-500 to-cyan-600" },
  notifications: { label: "Bildirishnomalar", icon: Bell, color: "from-yellow-500 to-yellow-600" },
  telegram_links: { label: "Telegram bog'lanishlar", icon: Send, color: "from-sky-500 to-sky-600" },
};

function AdminPage() {
  const navigate = useNavigate();
  const fetchStats = useServerFn(getAdminStats);
  const qc = useQueryClient();

  // client-side role guard: redirect non-admins
  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return navigate({ to: "/auth" });
      const { data } = await supabase.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
      if (!data) navigate({ to: "/dashboard" });
    })();
  }, [navigate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => fetchStats(),
    refetchInterval: 30000,
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("market_orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Holat yangilandi"); qc.invalidateQueries({ queryKey: ["admin-stats"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMsgStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("contact_messages").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Belgilandi"); qc.invalidateQueries({ queryKey: ["admin-stats"] }); },
  });

  return (
    <AppShell title="Admin panel">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
          <ShieldCheck className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Boshqaruv paneli</h2>
          <p className="text-sm text-muted-foreground">Barcha statistikalar va oxirgi harakatlar</p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Yuklanmoqda...</div>
      )}
      {error && <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">Xatolik: {String((error as Error).message)}</div>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {Object.entries(STAT_META).map(([key, meta]) => {
              const Icon = meta.icon;
              return (
                <div key={key} className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-transform hover:scale-[1.02]">
                  <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${meta.color} text-white`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-3xl font-bold">{data.counts[key] ?? 0}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{meta.label}</div>
                </div>
              );
            })}
          </div>

          {/* Market orders */}
          <div className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Truck className="h-5 w-5" /> Market buyurtmalari (yetkazish)</h3>
            {data.recentMarketOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Buyurtma yo'q</p>
            ) : (
              <div className="space-y-2">
                {data.recentMarketOrders.map((o: any) => (
                  <div key={o.id} className="rounded-lg border border-border bg-secondary/30 p-3 text-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold">{o.market_products?.name ?? "Mahsulot"} × {o.quantity}</div>
                        <div className="text-xs text-muted-foreground">📞 {o.phone} · 📍 {o.address}</div>
                        {o.notes && <div className="mt-1 text-xs italic text-muted-foreground">"{o.notes}"</div>}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-primary">{Number(o.total_price).toLocaleString()} so'm</div>
                        <div className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleString("uz-UZ")}</div>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {["yangi", "tayyorlanmoqda", "yetkazilmoqda", "yetkazildi", "bekor"].map((s) => (
                        <button
                          key={s}
                          onClick={() => updateOrderStatus.mutate({ id: o.id, status: s })}
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition ${
                            o.status === s ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-secondary"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contact messages */}
          <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold"><MessageSquare className="h-5 w-5" /> Foydalanuvchi murojaatlari</h3>
            {data.recentMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground">Murojaat yo'q</p>
            ) : (
              <div className="space-y-2">
                {data.recentMessages.map((m: any) => (
                  <div key={m.id} className="rounded-lg border border-border bg-secondary/30 p-3 text-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 font-semibold">
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase text-primary">{m.kind}</span>
                          {m.subject}
                        </div>
                        <div className="text-xs text-muted-foreground">👤 {m.full_name} · 📞 <a href={`tel:${m.phone}`} className="hover:text-primary">{m.phone}</a></div>
                        <p className="mt-2 whitespace-pre-wrap text-xs">{m.message}</p>
                      </div>
                      <div className="text-right">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${m.status === "yangi" ? "bg-yellow-500/20 text-yellow-700" : "bg-green-500/20 text-green-700"}`}>{m.status}</span>
                        <div className="mt-1 text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString("uz-UZ")}</div>
                      </div>
                    </div>
                    {m.status === "yangi" && (
                      <button
                        onClick={() => updateMsgStatus.mutate({ id: m.id, status: "korildi" })}
                        className="mt-2 flex items-center gap-1 rounded-full border border-primary/40 px-2 py-0.5 text-[10px] text-primary hover:bg-primary/10"
                      >
                        <Check className="h-3 w-3" /> Ko'rildi deb belgilash
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <h3 className="mb-4 text-lg font-semibold">👥 Barcha foydalanuvchilar ({data.allProfiles.length})</h3>
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {data.allProfiles.length === 0 && <p className="text-sm text-muted-foreground">Hozircha yo'q</p>}
                {data.allProfiles.map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-sm">
                    <div>
                      <div className="font-medium">{u.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {u.phone ? <a href={`tel:${u.phone}`} className="hover:text-primary">{u.phone}</a> : "telefon yo'q"}
                        {(u.viloyat || u.tuman) && ` · ${[u.viloyat, u.tuman].filter(Boolean).join(", ")}`}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString("uz-UZ")}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <h3 className="mb-4 text-lg font-semibold">📦 Oxirgi buyurtmalar</h3>
              <div className="space-y-2">
                {data.recentOrders.length === 0 && <p className="text-sm text-muted-foreground">Hozircha yo'q</p>}
                {data.recentOrders.map((o: any) => (
                  <div key={o.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-sm">
                    <div>
                      <div className="font-medium">{o.type}</div>
                      <div className="text-xs text-muted-foreground">{o.status}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-primary">{o.price ? `${o.price.toLocaleString()} so'm` : "—"}</div>
                      <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("uz-UZ")}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}