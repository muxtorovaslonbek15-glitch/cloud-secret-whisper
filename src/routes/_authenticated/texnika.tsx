import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Tractor, MapPin, Calendar, Search, Plus, X, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/texnika")({
  component: TexnikaPage,
});

function TexnikaPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [viloyat, setViloyat] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("technique_categories").select("*")).data ?? [],
  });

  const { data: techniques, isLoading } = useQuery({
    queryKey: ["techniques", search, viloyat, user.id],
    queryFn: async () => {
      let q = supabase
        .from("techniques")
        .select("*, category:technique_categories(name)")
        .or(`moderation_status.eq.tasdiqlangan,owner_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      if (search) q = q.ilike("name", `%${search}%`);
      if (viloyat) q = q.eq("viloyat", viloyat);
      return (await q).data ?? [];
    },
  });

  const bookMutation = useMutation({
    mutationFn: async (tech: { id: string; owner_id: string; daily_price: number | null }) => {
      const { error } = await supabase.from("orders").insert({
        customer_id: user.id,
        provider_id: tech.owner_id,
        technique_id: tech.id,
        type: "texnika_ijarasi",
        status: "yaratildi",
        price: tech.daily_price,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Buyurtma yaratildi! Buyurtmalarim bo'limida ko'ring.");
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <AppShell title="Texnika ijarasi">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Traktor, kombayn..."
            className="w-full rounded-lg border border-input bg-card py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={viloyat}
          onChange={(e) => setViloyat(e.target.value)}
          className="rounded-lg border border-input bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Barcha viloyatlar</option>
          {["Toshkent", "Samarqand", "Farg'ona", "Andijon", "Namangan", "Buxoro", "Xorazm", "Qashqadaryo", "Surxondaryo", "Jizzax", "Sirdaryo", "Navoiy", "Qoraqalpog'iston"].map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-lg bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft"
        >
          <Plus className="h-4 w-4" /> Texnika qo'shish
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      ) : techniques && techniques.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {techniques.map((t) => (
            <div key={t.id} className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift">
              {t.moderation_status === "kutilmoqda" && t.owner_id === user.id && (
                <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-yellow-500/90 px-2.5 py-1 text-[10px] font-semibold text-white">
                  <Clock className="h-3 w-3" /> Tekshirilmoqda
                </div>
              )}
              <div className="flex h-40 items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                {t.image_url ? (
                  <img src={t.image_url} alt={t.name} className="h-full w-full object-cover" />
                ) : (
                  <Tractor className="h-16 w-16 text-primary/40" />
                )}
              </div>
              <div className="p-5">
                <div className="text-xs font-medium text-muted-foreground">{t.category?.name || "Texnika"}</div>
                <h3 className="mt-1 font-semibold">{t.name}</h3>
                <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> {t.viloyat}{t.tuman ? `, ${t.tuman}` : ""}
                </div>
                {t.daily_price && (
                  <div className="mt-3 text-lg font-bold text-primary">
                    {Number(t.daily_price).toLocaleString("uz-UZ")} so'm<span className="text-sm font-normal text-muted-foreground">/kun</span>
                  </div>
                )}
                <button
                  disabled={!t.is_available || t.owner_id === user.id || t.moderation_status !== "tasdiqlangan" || bookMutation.isPending}
                  onClick={() => bookMutation.mutate({ id: t.id, owner_id: t.owner_id, daily_price: t.daily_price })}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-50"
                >
                  <Calendar className="h-4 w-4" />
                  {t.owner_id === user.id ? "Bu sizniki" : "Bron qilish"}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState onAdd={() => setShowAdd(true)} />
      )}

      {showAdd && (
        <AddTechniqueModal
          categories={categories ?? []}
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            qc.invalidateQueries({ queryKey: ["techniques"] });
          }}
          userId={user.id}
        />
      )}
    </AppShell>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
      <Tractor className="mx-auto h-12 w-12 text-muted-foreground" />
      <h3 className="mt-4 font-semibold">Hozircha texnika yo'q</h3>
      <p className="mt-1 text-sm text-muted-foreground">Birinchi bo'lib texnikangizni qo'shing.</p>
      <button onClick={onAdd} className="mt-4 rounded-lg bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
        Texnika qo'shish
      </button>
    </div>
  );
}

function AddTechniqueModal({
  categories,
  onClose,
  onCreated,
  userId,
}: {
  categories: Array<{ id: string; name: string }>;
  onClose: () => void;
  onCreated: () => void;
  userId: string;
}) {
  const [form, setForm] = useState({
    name: "",
    category_id: "",
    brand: "",
    year: new Date().getFullYear(),
    daily_price: "",
    viloyat: "Toshkent",
    tuman: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("techniques").insert({
      owner_id: userId,
      name: form.name,
      category_id: form.category_id || null,
      brand: form.brand || null,
      year: form.year,
      daily_price: form.daily_price ? Number(form.daily_price) : null,
      viloyat: form.viloyat,
      tuman: form.tuman || null,
      description: form.description || null,
      moderation_status: "kutilmoqda",
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Arizangiz yuborildi! Admin tasdiqlagach ro'yxatda ko'rinadi.");
      onCreated();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-lift" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Yangi texnika qo'shish</h3>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={save} className="space-y-3">
          <input required placeholder="Nomi (masalan T-28)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
          <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm">
            <option value="">Turkumni tanlang</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Brend (Belarus, John Deere)" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
            <input type="number" placeholder="Yili" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
          </div>
          <input type="number" placeholder="Kunlik narx (so'm)" value={form.daily_price} onChange={(e) => setForm({ ...form, daily_price: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.viloyat} onChange={(e) => setForm({ ...form, viloyat: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm">
              {["Toshkent", "Samarqand", "Farg'ona", "Andijon", "Namangan", "Buxoro", "Xorazm", "Qashqadaryo", "Surxondaryo", "Jizzax", "Sirdaryo", "Navoiy", "Qoraqalpog'iston"].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            <input placeholder="Tuman" value={form.tuman} onChange={(e) => setForm({ ...form, tuman: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
          </div>
          <textarea placeholder="Tavsif" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
          <button disabled={saving} type="submit" className="w-full rounded-lg bg-gradient-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </form>
      </div>
    </div>
  );
}
