import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { MessageSquare, Phone, Send, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/murojaat")({
  component: ContactPage,
});

function ContactPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [form, setForm] = useState({ full_name: "", phone: "", subject: "", message: "", kind: "murojaat" });
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: myMessages } = useQuery({
    queryKey: ["contact_messages", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("contact_messages").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: replies } = useQuery({
    queryKey: ["contact_replies", user.id, openId],
    queryFn: async () => {
      if (!openId) return [];
      const { data } = await supabase.from("contact_replies").select("*").eq("message_id", openId).order("created_at", { ascending: true });
      return data ?? [];
    },
    enabled: !!openId,
  });

  // Realtime for replies
  useEffect(() => {
    const ch = supabase
      .channel("contact-replies-user")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "contact_replies" }, () => {
        qc.invalidateQueries({ queryKey: ["contact_replies"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

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
    },
    onSuccess: () => {
      toast.success("Xabaringiz adminga yuborildi. Javob kelganda bildirishnoma olasiz.");
      setForm({ full_name: "", phone: "", subject: "", message: "", kind: "murojaat" });
      qc.invalidateQueries({ queryKey: ["contact_messages", user.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [followUp, setFollowUp] = useState<Record<string, string>>({});
  const sendFollowUp = useMutation({
    mutationFn: async ({ message_id, body }: { message_id: string; body: string }) => {
      const { error } = await supabase.from("contact_replies").insert({
        message_id, sender_id: user.id, sender_role: "user", body,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      setFollowUp({ ...followUp, [v.message_id]: "" });
      qc.invalidateQueries({ queryKey: ["contact_replies"] });
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
          <p className="text-sm text-muted-foreground">Savolingizni yuboring — admin javobi shu yerda ko'rinadi</p>
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
            <input type="tel" placeholder="Telefon *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            <input placeholder="Mavzu *" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            <textarea rows={5} placeholder="Xabaringiz..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
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
          <h3 className="mb-4 font-semibold">Sizning suhbatlaringiz</h3>
          {!myMessages || myMessages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Hozircha xabar yo'q</p>
          ) : (
            <div className="space-y-3">
              {myMessages.map((m) => {
                const open = openId === m.id;
                return (
                  <div key={m.id} className="rounded-lg border border-border">
                    <button onClick={() => setOpenId(open ? null : m.id)} className="flex w-full items-start justify-between gap-2 p-3 text-left">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase text-primary">{m.kind}</span>
                          <div className="font-semibold text-sm">{m.subject}</div>
                        </div>
                        <div className="mt-1 text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString("uz-UZ")}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${m.status === "yangi" ? "bg-yellow-500/20 text-yellow-700" : m.status === "javob_yozildi" ? "bg-green-500/20 text-green-700" : "bg-secondary text-muted-foreground"}`}>{m.status}</span>
                        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </button>
                    {open && (
                      <div className="border-t border-border bg-secondary/20 p-3">
                        {/* Original message from user */}
                        <ChatBubble side="user" body={m.message} time={m.created_at} name="Siz" />
                        {(replies ?? []).map((r) => (
                          <ChatBubble
                            key={r.id}
                            side={r.sender_role === "admin" ? "admin" : "user"}
                            body={r.body}
                            time={r.created_at}
                            name={r.sender_role === "admin" ? "Admin" : "Siz"}
                          />
                        ))}
                        <div className="mt-3 flex gap-2">
                          <input
                            value={followUp[m.id] ?? ""}
                            onChange={(e) => setFollowUp({ ...followUp, [m.id]: e.target.value })}
                            placeholder="Javob yozing..."
                            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                          />
                          <button
                            disabled={!followUp[m.id]?.trim() || sendFollowUp.isPending}
                            onClick={() => sendFollowUp.mutate({ message_id: m.id, body: followUp[m.id].trim() })}
                            className="rounded-lg bg-gradient-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function ChatBubble({ side, body, time, name }: { side: "user" | "admin"; body: string; time: string; name: string }) {
  const isAdmin = side === "admin";
  return (
    <div className={`mb-2 flex ${isAdmin ? "justify-start" : "justify-end"}`}>
      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${isAdmin ? "bg-primary/10 text-foreground rounded-tl-none" : "bg-primary text-primary-foreground rounded-tr-none"}`}>
        <div className={`mb-0.5 text-[10px] font-semibold ${isAdmin ? "text-primary" : "text-primary-foreground/80"}`}>{name}</div>
        <p className="whitespace-pre-wrap">{body}</p>
        <div className={`mt-1 text-[9px] ${isAdmin ? "text-muted-foreground" : "text-primary-foreground/70"}`}>{new Date(time).toLocaleString("uz-UZ")}</div>
      </div>
    </div>
  );
}
