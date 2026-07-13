import { useEffect, useState } from "react";
import { Tractor } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function IntroSplash() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(true);
  const [fade, setFade] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("intro-shown")) { setVisible(false); return; }
    const t1 = setTimeout(() => setFade(true), 1800);
    const t2 = setTimeout(() => { setVisible(false); sessionStorage.setItem("intro-shown", "1"); }, 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  if (!visible) return null;
  return (
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-primary transition-opacity duration-500 ${fade ? "opacity-0" : "opacity-100"}`}>
      <div className="relative">
        <div className="absolute inset-0 -m-8 animate-ping-slow rounded-full bg-white/20" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-white/95 shadow-lift animate-bounce-in">
          <Tractor className="h-12 w-12 text-primary" />
        </div>
      </div>
      <div className="mt-8 text-3xl font-bold text-white animate-slide-up-fade">AGRO YORDAMCHI</div>
      <div className="mt-2 text-sm text-white/80 animate-slide-up-fade" style={{ animationDelay: "0.2s" }}>
        {t("intro.tagline")}
      </div>
      <div className="mt-8 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-2 w-2 rounded-full bg-white animate-dot-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}