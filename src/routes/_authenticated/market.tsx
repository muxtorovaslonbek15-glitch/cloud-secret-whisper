import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { notifyAdmin } from "@/lib/telegram.functions";
import { AppShell } from "@/components/app-shell";
import { ShoppingBasket, Plus, Trash2, Package, Upload, X, Loader2, Tag } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/market")({
  component: MarketPage,
});

function MarketPage() {
  const { t } = useI18n();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const notify = useServerFn(notifyAdmin);
  const [openAdd, setOpenAdd] = useState(false);
  const [buyProduct, setBuyProduct] = useState<null | { id: string; name: string; price: number }>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "", discount_price: "", category: "", stock: "0", image_url: "" });
  const [buyForm, setBuyForm] = useState({ quantity: "1", phone: "", address: "", notes: "" });

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      return !!data;
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["market_products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("market_products").select("*").eq("is_active", true).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("Rasm hajmi 5MB dan oshmasin");
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("market-images").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data: signed, error: signErr } = await supabase.storage
        .from("market-images")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signErr || !signed?.signedUrl) throw signErr ?? new Error("Signed URL yaratilmadi");
      setForm((f) => ({ ...f, image_url: signed.signedUrl }));
      toast.success("Rasm yuklandi");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const add = useMutation({
    mutationFn: async () => {
      const price = Number(form.price) || 0;
      const discount = form.discount_price ? Number(form.discount_price) : null;
      const { error } = await supabase.from("market_products").insert({
        name: form.name,
        description: form.description || null,
        price,
        discount_price: discount && discount > 0 && discount < price ? discount : null,
        category: form.category || null,
        stock: Number(form.stock) || 0,
        image_url: form.image_url || null,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mahsulot qo'shildi");
      setOpenAdd(false);
      setForm({ name: "", description: "", price: "", discount_price: "", category: "", stock: "0", image_url: "" });
      qc.invalidateQueries({ queryKey: ["market_products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("market_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["market_products"] }),
  });

  const buy = useMutation({
    mutationFn: async () => {
      if (!buyProduct) return;
      const qty = Math.max(1, Number(buyForm.quantity) || 1);
      const total = qty * buyProduct.price;
      const { data: order, error } = await supabase.from("market_orders").insert({
        customer_id: user.id,
        product_id: buyProduct.id,
        quantity: qty,
        total_price: total,
        phone: buyForm.phone,
        address: buyForm.address,
        notes: buyForm.notes || null,
      }).select("id").single();
      if (error) throw error;

      const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (admins && admins.length > 0) {
        await supabase.from("notifications").insert(
          admins.map((a) => ({
            user_id: a.user_id,
            title: "🛒 Yangi market buyurtmasi",
            body: `${buyProduct.name} × ${qty} — ${total.toLocaleString()} so'm. Tel: ${buyForm.phone}`,
            type: "order",
            link: "/admin",
          })),
        );
      }
      try {
        await notify({ data: { text: `🛒 Yangi market buyurtmasi!\n${buyProduct.name} × ${qty}\n${total.toLocaleString()} so'm\nTel: ${buyForm.phone}\nManzil: ${buyForm.address}` } });
      } catch {}
      return order;
    },
    onSuccess: () => {
      toast.success("Buyurtma qabul qilindi! Admin siz bilan bog'lanadi.");
      setBuyProduct(null);
      setBuyForm({ quantity: "1", phone: "", address: "", notes: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title={t("market.title")}>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-accent shadow-glow">
            <ShoppingBasket className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{t("market.title")}</h2>
            <p className="text-sm text-muted-foreground">Urug', o'g'it, ehtiyot qismlar</p>
          </div>
        </div>
        {isAdmin && (
          <button onClick={() => setOpenAdd(true)} className="flex items-center gap-2 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft">
            <Plus className="h-4 w-4" /> {t("market.add")}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">...</div>
      ) : !products || products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">{t("market.empty")}</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => {
            const hasDiscount = p.discount_price != null && Number(p.discount_price) > 0 && Number(p.discount_price) < Number(p.price);
            const discountPercent = hasDiscount ? Math.round((1 - Number(p.discount_price) / Number(p.price)) * 100) : 0;
            const effectivePrice = hasDiscount ? Number(p.discount_price) : Number(p.price);
            return (
              <div key={p.id} className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift">
                {hasDiscount && (
                  <div className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-destructive px-2.5 py-1 text-xs font-bold text-destructive-foreground shadow-md">
                    <Tag className="h-3 w-3" /> -{discountPercent}%
                  </div>
                )}
                <div className="aspect-square overflow-hidden bg-secondary">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center"><Package className="h-16 w-16 text-muted-foreground/30" /></div>
                  )}
                </div>
                <div className="p-4">
                  {p.category && <div className="text-[10px] uppercase font-semibold text-primary">{p.category}</div>}
                  <h3 className="mt-1 font-semibold line-clamp-1">{p.name}</h3>
                  {p.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>}
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      {hasDiscount && (
                        <div className="text-xs text-muted-foreground line-through">{Number(p.price).toLocaleString("uz-UZ")} so'm</div>
                      )}
                      <div className={`text-lg font-bold ${hasDiscount ? "text-destructive" : ""}`}>
                        {effectivePrice.toLocaleString("uz-UZ")} <span className="text-xs font-normal text-muted-foreground">{p.currency}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setBuyProduct({ id: p.id, name: p.name, price: effectivePrice })}
                      className="rounded-lg bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                    >
                      {t("market.buy")}
                    </button>
                  </div>
                  {isAdmin && (
                    <button onClick={() => del.mutate(p.id)} className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-destructive/40 py-1 text-xs text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3 w-3" /> O'chirish
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add product modal (admin) */}
      {openAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpenAdd(false)}>
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-lift animate-slide-up-fade" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t("market.add")}</h3>
              <button onClick={() => setOpenAdd(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 space-y-3">
              <input placeholder={t("market.name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              <textarea rows={3} placeholder={t("market.desc")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              <input type="number" placeholder={t("market.price")} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground"><Tag className="h-3 w-3" /> Chegirmali narx (ixtiyoriy)</label>
                <input type="number" placeholder="Masalan: 45000 (asl narxdan kichik bo'lsin)" value={form.discount_price} onChange={(e) => setForm({ ...form, discount_price: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <input placeholder={t("market.category")} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              <input type="number" placeholder={t("market.stock")} value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />

              <div className="rounded-lg border border-dashed border-border p-3">
                <label className="flex cursor-pointer items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? "Yuklanmoqda..." : "Rasm yuklash (fayldan tanlash)"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />
                </label>
                {form.image_url && <img src={form.image_url} alt="preview" className="mt-2 h-24 w-full rounded object-cover" />}
              </div>
              <input placeholder="Yoki rasm URL manzili" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setOpenAdd(false)} className="flex-1 rounded-lg border border-border py-2 text-sm">Bekor</button>
              <button disabled={!form.name || add.isPending} onClick={() => add.mutate()} className="flex-1 rounded-lg bg-gradient-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{t("market.save")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Buy modal */}
      {buyProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setBuyProduct(null)}>
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-lift animate-slide-up-fade" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Buyurtma: {buyProduct.name}</h3>
              <button onClick={() => setBuyProduct(null)}><X className="h-5 w-5" /></button>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Narxi: <b>{buyProduct.price.toLocaleString()} so'm</b></p>
            <div className="mt-4 space-y-3">
              <label className="text-xs text-muted-foreground">Miqdor</label>
              <input type="number" min={1} value={buyForm.quantity} onChange={(e) => setBuyForm({ ...buyForm, quantity: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              <label className="text-xs text-muted-foreground">Telefon raqamingiz *</label>
              <input type="tel" placeholder="+998 90 123 45 67" value={buyForm.phone} onChange={(e) => setBuyForm({ ...buyForm, phone: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              <label className="text-xs text-muted-foreground">Yetkazish manzili *</label>
              <textarea rows={2} placeholder="Viloyat, tuman, ko'cha, uy" value={buyForm.address} onChange={(e) => setBuyForm({ ...buyForm, address: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              <label className="text-xs text-muted-foreground">Qo'shimcha izoh</label>
              <textarea rows={2} value={buyForm.notes} onChange={(e) => setBuyForm({ ...buyForm, notes: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              <div className="rounded-lg bg-secondary p-3 text-sm">
                Jami: <b>{((Number(buyForm.quantity) || 1) * buyProduct.price).toLocaleString()} so'm</b>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setBuyProduct(null)} className="flex-1 rounded-lg border border-border py-2 text-sm">Bekor</button>
              <button
                disabled={!buyForm.phone || !buyForm.address || buy.isPending}
                onClick={() => buy.mutate()}
                className="flex-1 rounded-lg bg-gradient-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {buy.isPending ? "Yuborilmoqda..." : "Buyurtmani tasdiqlash"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
