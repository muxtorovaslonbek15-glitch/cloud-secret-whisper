import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { useI18n, type Lang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { deleteOwnAccount } from "@/lib/telegram.functions";
import { Settings, Moon, Sun, Globe, Bell, Trash2, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sozlamalar")({
  component: SettingsPage,
});

const NOTIF_KEYS = ["admin_reply", "order_updates", "broadcast", "moderation"] as const;
const BGS = ["agro", "field", "sunset", "rows", "wheat", "tractor", "meadow", "minimal"] as const;

function SettingsPage() {
  const { user } = Route.useRouteContext();
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const deleteAcc = useServerFn(deleteOwnAccount);

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()).data,
  });

  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    admin_reply: true, order_updates: true, broadcast: true, moderation: true,
  });
  const [bg, setBg] = useState<string>("agro");
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    if (profile) {
      const p = (profile.notification_prefs as Record<string, unknown> | null) || {};
      setPrefs({
        admin_reply: p.admin_reply !== false,
        order_updates: p.order_updates !== false,
        broadcast: p.broadcast !== false,
        moderation: p.moderation !== false,
      });
      setBg((profile as any).bg_choice || "agro");
    }
  }, [profile]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      notification_prefs: prefs,
      bg_choice: bg,
    }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(t("settings.saved"));
    qc.invalidateQueries({ queryKey: ["profile", user.id] });
  };

  const doDelete = async () => {
    try {
      await deleteAcc();
      await supabase.auth.signOut();
      toast.success("Hisob o'chirildi");
      navigate({ to: "/auth", replace: true });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const bgLabels: Record<string, string> = {
    agro: "🌾 " + t("settings.bgAgro"),
    field: "🌱 " + t("settings.bgField"),
    sunset: "🌅 Quyosh botishi",
    rows: "🚜 Ekin qatorlari",
    wheat: "🌾 Oltin bug'doy",
    tractor: "🚜 Traktor",
    meadow: "🌿 Yashil o'tloq",
    minimal: "✨ " + t("settings.bgMinimal"),
  };

  return (
    <AppShell title={t("settings.title")}>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
          <Settings className="h-5 w-5 text-primary-foreground" />
        </div>
        <h2 className="text-xl font-semibold">{t("settings.title")}</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Theme */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h3 className="mb-4 flex items-center gap-2 font-semibold"><Sun className="h-4 w-4" /> {t("settings.theme")}</h3>
          <div className="flex gap-2">
            <button onClick={() => setTheme("light")} className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm ${theme === "light" ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
              <Sun className="h-4 w-4" /> {t("settings.themeLight")}
            </button>
            <button onClick={() => setTheme("dark")} className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm ${theme === "dark" ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
              <Moon className="h-4 w-4" /> {t("settings.themeDark")}
            </button>
          </div>
        </div>

        {/* Language */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h3 className="mb-4 flex items-center gap-2 font-semibold"><Globe className="h-4 w-4" /> {t("settings.lang")}</h3>
          <div className="flex gap-2">
            {(["uz", "ru", "en"] as Lang[]).map((l) => (
              <button key={l} onClick={() => setLang(l)} className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium uppercase ${lang === l ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Background */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
          <h3 className="mb-4 font-semibold">{t("settings.bg")}</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {BGS.map((b) => (
              <button key={b} onClick={() => setBg(b)} className={`rounded-lg border p-3 text-xs font-medium ${bg === b ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                {bgLabels[b]}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
          <h3 className="mb-4 flex items-center gap-2 font-semibold"><Bell className="h-4 w-4" /> {t("settings.notifs")}</h3>
          <div className="space-y-2">
            {NOTIF_KEYS.map((k) => (
              <label key={k} className="flex cursor-pointer items-center justify-between rounded-lg border border-border p-3 text-sm">
                <span>{t(`settings.notif.${k}`)}</span>
                <input
                  type="checkbox"
                  checked={!!prefs[k]}
                  onChange={(e) => setPrefs({ ...prefs, [k]: e.target.checked })}
                  className="h-4 w-4"
                />
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("market.save")}
        </button>
      </div>

      {/* Delete account */}
      <div className="mt-8 rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
        <h3 className="flex items-center gap-2 font-semibold text-destructive"><Trash2 className="h-4 w-4" /> {t("settings.delete")}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{t("settings.deleteWarn")}</p>
        {!confirmDel ? (
          <button onClick={() => setConfirmDel(true)} className="mt-3 rounded-lg border border-destructive/50 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10">
            {t("settings.delete")}
          </button>
        ) : (
          <div className="mt-3 flex gap-2">
            <button onClick={doDelete} className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground">
              {t("settings.deleteConfirm")}
            </button>
            <button onClick={() => setConfirmDel(false)} className="rounded-lg border border-border px-4 py-2 text-sm">
              Bekor qilish
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
