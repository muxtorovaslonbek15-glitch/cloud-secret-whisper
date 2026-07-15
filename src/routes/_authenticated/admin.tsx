import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getAdminStats,
  listAllUsers,
  setUserRole,
  deleteUser,
  sendUserNotification,
  broadcastNotification,
} from "@/lib/telegram.functions";
import { AppShell } from "@/components/app-shell";
import {
  Users, Tractor, Wrench, ShoppingBag, ShoppingBasket, Bot, Bell, Send,
  Loader2, ShieldCheck, MessageSquare, Truck, Check, Trash2, X, Megaphone, UserCog, Package,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin panel — AGRO YORDAMCHI" }] }),
  component: AdminPage,
});

const STAT_META: Record<string, { label: string; icon: any; color: string }> = {
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

const ROLES = ["fermer", "usta", "texnika_egasi", "admin"] as const;

function AdminPage() {
  const navigate = useNavigate();
  const fetchStats = useServerFn(getAdminStats);
  const fetchUsers = useServerFn(listAllUsers);
  const changeRole = useServerFn(setUserRole);
  const removeUser = useServerFn(deleteUser);
  const sendMsg = useServerFn(sendUserNotification);
  const broadcast = useServerFn(broadcastNotification);
  const qc = useQueryClient();

  const [tab, setTab] = useState<"overview" | "users" | "content" | "broadcast">("overview");
  const [msgTarget, setMsgTarget] = useState<null | { id: string; name: string }>(null);
  const [msgForm, setMsgForm] = useState({ title: "", body: "" });
  const [bcForm, setBcForm] = useState({ title: "", body: "" });
  const [userSearch, setUserSearch] = useState("");

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

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetchUsers(),
    enabled: tab === "users",
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("market_orders").update({ status }).eq("id", id);
      if (error) throw error;
      // Notify the customer
      const order = data?.recentMarketOrders.find((o: any) => o.id === id);
      if (order?.customer_id) {
        await supabase.from("notifications").insert({
          user_id: order.customer_id,
          title: "📦 Buyurtma holati yangilandi",
          body: `Sizning buyurtmangiz: "${status}"`,
          type: "order",
          link: "/buyurtmalar",
        });
      }
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

  const roleMut = useMutation({
    mutationFn: (v: { user_id: string; role: any }) => changeRole({ data: v }),
    onSuccess: () => { toast.success("Rol yangilandi"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (user_id: string) => removeUser({ data: { user_id } }),
    onSuccess: () => { toast.success("Foydalanuvchi o'chirildi"); qc.invalidateQueries({ queryKey: ["admin-users"] }); qc.invalidateQueries({ queryKey: ["admin-stats"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendMsgMut = useMutation({
    mutationFn: (v: { user_id: string; title: string; body: string }) => sendMsg({ data: v }),
    onSuccess: () => { toast.success("Xabar yuborildi"); setMsgTarget(null); setMsgForm({ title: "", body: "" }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const broadcastMut = useMutation({
    mutationFn: (v: { title: string; body: string }) => broadcast({ data: v }),
    onSuccess: (r: any) => { toast.success(`${r.count ?? 0} foydalanuvchiga yuborildi`); setBcForm({ title: "", body: "" }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filteredUsers = (users ?? []).filter((u: any) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return (u.full_name ?? "").toLowerCase().includes(q) || (u.phone ?? "").toLowerCase().includes(q);
  });

  return (
    <AppShell title="Admin panel">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
          <ShieldCheck className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Boshqaruv paneli</h2>
          <p className="text-sm text-muted-foreground">Statistika, foydalanuvchilar va xabarlar</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { id: "overview", label: "Umumiy", icon: ShieldCheck },
          { id: "users", label: "Foydalanuvchilar", icon: UserCog },
          { id: "content", label: "Kontent", icon: Package },
          { id: "broadcast", label: "Ommaviy xabar", icon: Megaphone },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-gradient-primary text-primary-foreground shadow-soft"
                : "border border-border bg-card hover:bg-secondary"
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {isLoading && tab === "overview" && (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Yuklanmoqda...</div>
      )}
      {error && <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">Xatolik: {String((error as Error).message)}</div>}

      {tab === "overview" && data && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {Object.entries(STAT_META).map(([key, meta]) => {
              const Icon = meta.icon;
              return (
                <div key={key} className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-transform hover:scale-[1.02] animate-fade-in">
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
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Truck className="h-5 w-5" /> Market buyurtmalari</h3>
            {data.recentMarketOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Buyurtma yo'q</p>
            ) : (
              <div className="space-y-2">
                {data.recentMarketOrders.map((o: any) => (
                  <div key={o.id} className="rounded-lg border border-border bg-secondary/30 p-3 text-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold">{o.market_products?.name ?? "Mahsulot"} × {o.quantity}</div>
                        <div className="text-xs text-muted-foreground">📞 <a href={`tel:${o.phone}`} className="hover:text-primary">{o.phone}</a> · 📍 {o.address}</div>
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
                    <div className="mt-2 flex gap-2">
                      {m.user_id && (
                        <button
                          onClick={() => { setMsgTarget({ id: m.user_id, name: m.full_name || m.phone }); setMsgForm({ title: `Re: ${m.subject}`, body: "" }); }}
                          className="flex items-center gap-1 rounded-full border border-primary/40 px-2 py-0.5 text-[10px] text-primary hover:bg-primary/10"
                        >
                          <Send className="h-3 w-3" /> Javob yozish
                        </button>
                      )}
                      {m.status === "yangi" && (
                        <button
                          onClick={() => updateMsgStatus.mutate({ id: m.id, status: "korildi" })}
                          className="flex items-center gap-1 rounded-full border border-primary/40 px-2 py-0.5 text-[10px] text-primary hover:bg-primary/10"
                        >
                          <Check className="h-3 w-3" /> Ko'rildi
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === "users" && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h3 className="flex items-center gap-2 text-lg font-semibold"><Users className="h-5 w-5" /> Foydalanuvchilar ({users?.length ?? 0})</h3>
            <input
              placeholder="Ism yoki telefon bo'yicha izlash..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="ml-auto w-full max-w-xs rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          {usersLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Yuklanmoqda...</div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((u: any) => (
                <div key={u.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground">
                    {u.avatar_url ? <img src={u.avatar_url} alt="" className="h-full w-full rounded-full object-cover" /> : <span className="text-sm font-bold">{(u.full_name || "?").charAt(0).toUpperCase()}</span>}
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <div className="font-medium">{u.full_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {u.phone ? <a href={`tel:${u.phone}`} className="hover:text-primary">{u.phone}</a> : "telefon yo'q"}
                      {(u.viloyat || u.tuman) && ` · ${[u.viloyat, u.tuman].filter(Boolean).join(", ")}`}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(u.roles as string[]).map((r) => (
                        <span key={r} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase text-primary">{r}</span>
                      ))}
                    </div>
                  </div>
                  <select
                    defaultValue={u.roles[0] ?? "fermer"}
                    onChange={(e) => roleMut.mutate({ user_id: u.id, role: e.target.value as any })}
                    className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => { setMsgTarget({ id: u.id, name: u.full_name || u.phone || "user" }); setMsgForm({ title: "", body: "" }); }}
                    className="rounded-lg border border-primary/40 px-3 py-1.5 text-xs text-primary hover:bg-primary/10"
                  >
                    <Send className="mr-1 inline h-3 w-3" /> Xabar
                  </button>
                  <button
                    onClick={() => { if (confirm(`"${u.full_name || u.phone}" foydalanuvchisini o'chirasizmi?`)) delMut.mutate(u.id); }}
                    className="rounded-lg border border-destructive/40 px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {filteredUsers.length === 0 && <p className="text-sm text-muted-foreground">Foydalanuvchi topilmadi</p>}
            </div>
          )}
        </div>
      )}

      {tab === "content" && <ContentTab />}


      {tab === "broadcast" && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Megaphone className="h-5 w-5" /> Barcha foydalanuvchilarga ommaviy xabar</h3>
          <p className="mb-4 text-sm text-muted-foreground">Xabar bildirishnoma sifatida barcha ro'yxatdan o'tgan foydalanuvchilarga yuboriladi.</p>
          <div className="space-y-3">
            <input
              placeholder="Sarlavha"
              value={bcForm.title}
              onChange={(e) => setBcForm({ ...bcForm, title: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
            <textarea
              placeholder="Xabar matni..."
              rows={5}
              value={bcForm.body}
              onChange={(e) => setBcForm({ ...bcForm, body: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
            <button
              disabled={!bcForm.title || !bcForm.body || broadcastMut.isPending}
              onClick={() => broadcastMut.mutate(bcForm)}
              className="flex items-center gap-2 rounded-lg bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-50"
            >
              {broadcastMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
              Yuborish
            </button>
          </div>
        </div>
      )}

      {/* Send-to-user modal */}
      {msgTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in" onClick={() => setMsgTarget(null)}>
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-lift animate-slide-up-fade" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Xabar → {msgTarget.name}</h3>
              <button onClick={() => setMsgTarget(null)}><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 space-y-3">
              <input
                placeholder="Sarlavha"
                value={msgForm.title}
                onChange={(e) => setMsgForm({ ...msgForm, title: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
              <textarea
                placeholder="Xabar matni..."
                rows={5}
                value={msgForm.body}
                onChange={(e) => setMsgForm({ ...msgForm, body: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
              <p className="text-xs text-muted-foreground">Xabar sayt bildirishnomasi va agar bog'langan bo'lsa Telegramga ham yetkaziladi.</p>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setMsgTarget(null)} className="flex-1 rounded-lg border border-border py-2 text-sm">Bekor</button>
              <button
                disabled={!msgForm.title || !msgForm.body || sendMsgMut.isPending}
                onClick={() => sendMsgMut.mutate({ user_id: msgTarget.id, ...msgForm })}
                className="flex-1 rounded-lg bg-gradient-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {sendMsgMut.isPending ? "Yuborilmoqda..." : "Yuborish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
