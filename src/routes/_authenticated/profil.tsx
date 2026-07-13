import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { User, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profil")({
  component: ProfilPage,
});

function ProfilPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()).data,
  });

  const [form, setForm] = useState({ full_name: "", phone: "", viloyat: "", tuman: "", bio: "" });

  useEffect(() => {
    if (profile) setForm({
      full_name: profile.full_name ?? "",
      phone: profile.phone ?? "",
      viloyat: profile.viloyat ?? "",
      tuman: profile.tuman ?? "",
      bio: profile.bio ?? "",
    });
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profil saqlandi!");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <AppShell title="Profil">
      <div className="max-w-2xl">
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary text-2xl font-bold text-primary-foreground">
            {form.full_name?.[0] || <User />}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{form.full_name || "Foydalanuvchi"}</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
          className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium">To'liq ism</label>
            <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Telefon</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+998 90 123 45 67" className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Viloyat</label>
              <select value={form.viloyat} onChange={(e) => setForm({ ...form, viloyat: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm">
                <option value="">Tanlang</option>
                {["Toshkent", "Samarqand", "Farg'ona", "Andijon", "Namangan", "Buxoro", "Xorazm", "Qashqadaryo", "Surxondaryo", "Jizzax", "Sirdaryo", "Navoiy", "Qoraqalpog'iston"].map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Tuman</label>
              <input value={form.tuman} onChange={(e) => setForm({ ...form, tuman: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Bio</label>
            <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
          </div>
          <button disabled={save.isPending} type="submit" className="flex items-center gap-2 rounded-lg bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-50">
            <Save className="h-4 w-4" /> {save.isPending ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}