import { Bell } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Link } from "@tanstack/react-router";

export function NotificationsBell() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: notifs } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);

  const unread = (notifs ?? []).filter((n) => !n.is_read).length;

  const markAll = async () => {
    await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Bildirishnomalar"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background/60 transition-colors hover:bg-secondary"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground animate-pulse-soft">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-popover shadow-lift">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="font-semibold">{t("notif.title")}</h3>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs text-primary hover:underline">{t("notif.markAll")}</button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {(!notifs || notifs.length === 0) ? (
              <div className="p-6 text-center text-sm text-muted-foreground">{t("notif.empty")}</div>
            ) : (
              notifs.map((n) => (
                <div key={n.id} className={`border-b border-border/50 px-4 py-3 last:border-0 ${!n.is_read ? "bg-primary/5" : ""}`}>
                  <div className="text-sm font-semibold">{n.title}</div>
                  {n.body && <div className="mt-1 text-xs text-muted-foreground">{n.body}</div>}
                  <div className="mt-1 text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString("uz-UZ")}</div>
                </div>
              ))
            )}
          </div>
          <Link to="/bildirishnomalar" onClick={() => setOpen(false)} className="block border-t border-border py-2 text-center text-xs font-medium text-primary hover:bg-secondary">
            → {t("notif.title")}
          </Link>
        </div>
      )}
    </div>
  );
}