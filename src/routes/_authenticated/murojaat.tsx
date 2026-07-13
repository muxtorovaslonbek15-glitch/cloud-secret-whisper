import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { MessageSquare, Phone, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/murojaat")({
  component: ContactPage,
});

function ContactPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [form, setForm] = useState({ full_name: "", phone: "", subject: "", message: "", kind: "murojaat" });

  const { data: myMessages } = useQuery({
    queryKey: ["contact_messages", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("contact_messages").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("contact_messages").insert({
        user_id: user.id,
        full_name: form.full_name,
        phone: form.phone,
        subject: form.subject,
        message: form.message,
        kind: form.kind,
      });
      if (error) throw error;

      const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (admins && admins.length > 0) {
        await supabase.from("notifications").insert(
          admins.map((a) => ({
            user_id: a.user_id,
            title: `📩 Yangi ${form.kind === "taklif" ? "taklif" : form.kind === "mahsulot" ? "mahsulot" : "murojaat"}`,
            body: `${form.full_name} (${form.phone}) — ${form.subject}`,
            type: "contact",
            link: "/admin",
          })),
        );
      }
    },
    onSuccess: () => {
      toast.success("Xabaringiz adminga yuborildi. Tez orada javob beramiz.");
      setForm({ full_name: "", phone: "", subject: "", message: "", kind: "murojaat" });
      qc.invalidateQueries({ queryKey: ["contact_messages", user.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="Murojaat / Aloqa">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
          <MessageSquare className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Admin bilan bog'lanish</h2>
          <p className="text-sm text-muted-foreground">Taklif, mahsulot yoki savolingizni yuboring — admin siz bilan bog'lanadi</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h3 className="mb-4 font-semibold">Yangi xabar</h3>
          <div className="space-y-3">
            <div className="flex gap-2">
              {[
                { v: "murojaat", label: "Murojaat" },
                { v: "taklif", label: "Taklif" },
                { v: "mahsulot", label: "Mahsulot taklif" },
              ].map((k) => (
                <button
                  key={k.v}
                  onClick={() => setForm({ ...form, kind: k.v })}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                    form.kind === k.v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {k.label}
                </button>
              ))}
            </div>
            <input placeholder="Ism sharifingiz *" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            <input type="tel" placeholder="Telefon raqamingiz * (+998 ...)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            <input placeholder="Mavzu *" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            <textarea rows={5} placeholder="Xabaringiz batafsil..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            <button
              disabled={!form.full_name || !form.phone || !form.subject || !form.message || send.isPending}
              onClick={() => send.mutate()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-50"
            >
              {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Yuborish
            </button>
          </div>

          <div className="mt-6 rounded-lg bg-secondary/50 p-4 text-sm">
            <div className="mb-2 font-semibold">To'g'ridan-to'g'ri aloqa:</div>
            <div className="flex flex-col gap-1 text-muted-foreground">
              <a href="tel:+998957935357" className="flex items-center gap-2 hover:text-foreground"><Phone className="h-3 w-3" /> +998 95 793 53 57</a>
              <a href="tel:+998505109501" className="flex items-center gap-2 hover:text-foreground"><Phone className="h-3 w-3" /> +998 50 510 95 01</a>
              <div>📍 Navoiy, O'zbekiston</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h3 className="mb-4 font-semibold">Sizning xabarlaringiz</h3>
          {!myMessages || myMessages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Hozircha xabar yo'q</p>
          ) : (
            <div className="space-y-3">
              {myMessages.map((m) => (
                <div key={m.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{m.subject}</div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${m.status === "yangi" ? "bg-primary/10 text-primary" : "bg-green-500/10 text-green-600"}`}>{m.status}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{m.kind}</div>
                  <p className="mt-2 whitespace-pre-wrap text-xs">{m.message}</p>
                  <div className="mt-2 text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString("uz-UZ")}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}