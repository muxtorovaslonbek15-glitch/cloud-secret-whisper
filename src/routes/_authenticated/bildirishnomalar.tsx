import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Bell, CheckCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/bildirishnomalar")({
  component: NotifPage,
});

function NotifPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: notifs } = useQuery({
    queryKey: ["notifications-all"],
    queryFn: async () => {
      const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const markAll = async () => {
    await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
    qc.invalidateQueries({ queryKey: ["notifications-all"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };
  return (
    <AppShell title={t("notif.title")}>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Bell className="h-5 w-5 text-primary-foreground" />
          </div>
          <h2 className="text-xl font-semibold">{t("notif.title")}</h2>
        </div>
        <button onClick={markAll} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary">
          <CheckCheck className="h-4 w-4" /> {t("notif.markAll")}
        </button>
      </div>
      {!notifs || notifs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center text-muted-foreground">{t("notif.empty")}</div>
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => (
            <div key={n.id} className={`rounded-xl border border-border p-4 ${!n.is_read ? "bg-primary/5 border-primary/30" : "bg-card"}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold">{n.title}</div>
                  {n.body && <div className="mt-1 text-sm text-muted-foreground">{n.body}</div>}
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">{new Date(n.created_at).toLocaleString("uz-UZ")}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}