import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Tractor, Loader2, Send, ExternalLink, ShieldCheck } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { redeemTelegramCode, adminSignIn } from "@/lib/telegram.functions";
import { useI18n } from "@/lib/i18n";
import { LangSwitcher } from "@/components/lang-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Kirish — AGRO YORDAMCHI" },
      { name: "description", content: "AGRO YORDAMCHI platformasiga kiring yoki ro'yxatdan o'ting." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [mode, setMode] = useState<"signin" | "signup" | "admin">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [tgOpen, setTgOpen] = useState(false);
  const [tgCode, setTgCode] = useState("");
  const [adminLogin, setAdminLogin] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const redeem = useServerFn(redeemTelegramCode);
  const doAdmin = useServerFn(adminSignIn);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Ro'yxatdan o'tildi! Emailingizni tekshiring.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Xush kelibsiz!");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google orqali kirishda xatolik");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  };

  const handleTelegramRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(tgCode)) {
      toast.error("6 xonali kodni kiriting");
      return;
    }
    setLoading(true);
    try {
      const r = await redeem({ data: { code: tgCode } });
      if (r.status !== "ready") {
        toast.error(r.error || "Kod noto'g'ri");
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: r.email,
        password: r.password,
      });
      if (error) throw error;
      toast.success("Xush kelibsiz!");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await doAdmin({ data: { login: adminLogin, password: adminPass } });
      if (!r.ok) {
        toast.error(r.error || "Xatolik");
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: r.email,
        password: r.password,
      });
      if (error) throw error;
      toast.success("Admin sifatida kirdingiz");
      navigate({ to: "/admin" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <div className="absolute right-4 top-4 flex gap-2">
        <LangSwitcher />
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lift">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Tractor className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold">AGRO YORDAMCHI</span>
        </Link>

        <h1 className="text-center text-2xl font-bold">
          {mode === "signin" ? "Xush kelibsiz" : mode === "signup" ? "Ro'yxatdan o'tish" : "Admin panel"}
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "Hisobingizga kiring" : mode === "signup" ? "Yangi hisob yarating" : "Faqat administrator uchun"}
        </p>

        {mode === "admin" ? (
          <form onSubmit={handleAdmin} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Login</label>
              <input
                required
                value={adminLogin}
                onChange={(e) => setAdminLogin(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="admin login"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Parol</label>
              <input
                required
                type="password"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="parol"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <ShieldCheck className="h-4 w-4" /> Admin sifatida kirish
            </button>
            <button type="button" onClick={() => setMode("signin")} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">
              ← Oddiy kirish
            </button>
          </form>
        ) : (
        <>
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium transition-colors hover:bg-secondary disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Google orqali davom etish
        </button>

        <button
          onClick={() => setTgOpen(true)}
          disabled={loading}
          className="mt-3 flex w-full items-center justify-center gap-3 rounded-lg bg-[#229ED9] px-4 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.01] disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          Telegram orqali kirish
        </button>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          yoki email bilan
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleEmail} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">To'liq ism</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={100}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Ism Familiya"
              />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="siz@misol.uz"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Parol</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="Kamida 6 belgi"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:scale-[1.01] disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signin" ? "Kirish" : "Ro'yxatdan o'tish"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "Hisobingiz yo'qmi?" : "Hisobingiz bormi?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="font-semibold text-primary hover:underline"
          >
            {mode === "signin" ? "Ro'yxatdan o'ting" : "Kirish"}
          </button>
        </div>
        <div className="mt-3 text-center">
          <button type="button" onClick={() => setMode("admin")} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
            <ShieldCheck className="h-3 w-3" /> Admin sifatida kirish
          </button>
        </div>
        </>
        )}
      </div>

      {tgOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in" onClick={() => setTgOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-lift animate-slide-up-fade" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#229ED9]">
                <Send className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold">Telegram orqali ro'yxatdan o'tish</h3>
            </div>
            <ol className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><b className="text-foreground">1.</b> @Agroyordamuz_bot ni oching va <b>/start</b> bosing</li>
              <li><b className="text-foreground">2.</b> Bot sizga 6 xonali kod yuboradi</li>
              <li><b className="text-foreground">3.</b> Kodni pastga kiriting</li>
            </ol>
            <a href="https://t.me/Agroyordamuz_bot" target="_blank" rel="noopener noreferrer"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#229ED9] px-4 py-3 text-sm font-semibold text-white">
              <ExternalLink className="h-4 w-4" /> Botni ochish (@Agroyordamuz_bot)
            </a>
            <p className="mt-2 text-center text-xs text-muted-foreground">Agar tugma ochilmasa, Telegramda qidiring: <b>@Agroyordamuz_bot</b></p>
            <form onSubmit={handleTelegramRedeem} className="mt-4 space-y-3">
              <input
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={tgCode}
                onChange={(e) => setTgCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="w-full rounded-lg border-2 border-primary/40 bg-primary/5 px-4 py-4 text-center text-2xl font-bold tracking-[0.4em] text-primary outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={loading || tgCode.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Tasdiqlash va kirish
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}