import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Wrench, MapPin, Star, Phone, Plus, X, Award } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/ustalar")({
  component: UstalarPage,
});

function UstalarPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const { data: masters, isLoading } = useQuery({
    queryKey: ["masters"],
    queryFn: async () => {
      const { data: mastersData } = await supabase.from("masters").select("*").order("rating", { ascending: false });
      if (!mastersData || mastersData.length === 0) return [];
      const userIds = mastersData.map((m) => m.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url, phone").in("id", userIds);
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      return mastersData.map((m) => ({ ...m, profile: profileMap.get(m.user_id) ?? null }));
    },
  });

  const callMaster = useMutation({
    mutationFn: async (m: { id: string; user_id: string; hourly_rate: number | null; specialty: string }) => {
      const { error } = await supabase.from("orders").insert({
        customer_id: user.id,
        provider_id: m.user_id,
        master_id: m.id,
        type: "usta_chaqirish",
        status: "yaratildi",
        problem_description: `${m.specialty} mutaxassisi chaqirildi`,
        price: m.hourly_rate,
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Usta chaqirildi! Buyurtmalarim bo'limida ko'ring."),
    onError: (e) => toast.error(e.message),
  });

  return (
    <AppShell title="Ustalar">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-muted-foreground">Sizga eng yaqin va yuqori reytingli ustalar</p>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-lg bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft">
          <Plus className="h-4 w-4" /> Usta bo'lish
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-card" />)}
        </div>
      ) : masters && masters.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {masters.map((m) => (
            <div key={m.id} className="rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary text-lg font-bold text-primary-foreground">
                  {m.profile?.full_name?.[0] || "U"}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{m.profile?.full_name || "Usta"}</h3>
                  <div className="text-sm text-primary">{m.specialty}</div>
                  <div className="mt-1 flex items-center gap-1 text-sm">
                    <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                    {Number(m.rating).toFixed(1)} · {m.completed_jobs} ish
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {m.viloyat}{m.tuman ? `, ${m.tuman}` : ""}</div>
                <div className="flex items-center gap-1"><Award className="h-3.5 w-3.5" /> {m.experience_years} yil tajriba</div>
              </div>
              {m.hourly_rate && (
                <div className="mt-3 text-lg font-bold text-primary">
                  {Number(m.hourly_rate).toLocaleString("uz-UZ")} so'm<span className="text-sm font-normal text-muted-foreground">/soat</span>
                </div>
              )}
              <button
                disabled={!m.is_available || m.user_id === user.id || callMaster.isPending}
                onClick={() => callMaster.mutate({ id: m.id, user_id: m.user_id, hourly_rate: m.hourly_rate, specialty: m.specialty })}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                <Phone className="h-4 w-4" />
                {m.user_id === user.id ? "Bu sizniki" : "Chaqirish"}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <Wrench className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 font-semibold">Hozircha ustalar yo'q</h3>
          <p className="mt-1 text-sm text-muted-foreground">Birinchi usta bo'ling va daromad topishni boshlang.</p>
          <button onClick={() => setShowAdd(true)} className="mt-4 rounded-lg bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Usta bo'lish</button>
        </div>
      )}

      {showAdd && (
        <AddMasterModal userId={user.id} onClose={() => setShowAdd(false)} onCreated={() => {
          setShowAdd(false);
          qc.invalidateQueries({ queryKey: ["masters"] });
        }} />
      )}
    </AppShell>
  );
}

function AddMasterModal({ userId, onClose, onCreated }: { userId: string; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    specialty: "Motor",
    experience_years: 1,
    hourly_rate: "",
    viloyat: "Toshkent",
    tuman: "",
    bio: "",
  });
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("masters").insert({
      user_id: userId,
      specialty: form.specialty,
      experience_years: form.experience_years,
      hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
      viloyat: form.viloyat,
      tuman: form.tuman || null,
      bio: form.bio || null,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Usta profili yaratildi!"); onCreated(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-lift" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Usta profili yaratish</h3>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={save} className="space-y-3">
          <select value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm">
            {["Motor", "Karobka", "Elektr", "Gidravlika", "Shina", "Yoqilg'i tizimi", "Elektronika", "Konditsioner", "Umumiy ta'mir"].map((s) => <option key={s}>{s}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" min={0} placeholder="Tajriba (yil)" value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: Number(e.target.value) })} className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
            <input type="number" placeholder="Soatlik narx (so'm)" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select value={form.viloyat} onChange={(e) => setForm({ ...form, viloyat: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm">
              {["Toshkent", "Samarqand", "Farg'ona", "Andijon", "Namangan", "Buxoro", "Xorazm", "Qashqadaryo", "Surxondaryo", "Jizzax", "Sirdaryo", "Navoiy", "Qoraqalpog'iston"].map((v) => <option key={v}>{v}</option>)}
            </select>
            <input placeholder="Tuman" value={form.tuman} onChange={(e) => setForm({ ...form, tuman: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
          </div>
          <textarea placeholder="O'zingiz haqingizda" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
          <button disabled={saving} type="submit" className="w-full rounded-lg bg-gradient-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </form>
      </div>
    </div>
  );
}