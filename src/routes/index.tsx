import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Tractor,
  Wrench,
  Sparkles,
  MapPin,
  Truck,
  ShoppingBasket,
  CloudSun,
  ShieldCheck,
  Star,
  ArrowRight,
  Phone,
  MessageCircle,
  Bot,
  Users,
} from "lucide-react";
import heroImage from "@/assets/hero-agrousta.jpg";
import { IntroSplash } from "@/components/intro-splash";
import { useI18n } from "@/lib/i18n";
import { LangSwitcher } from "@/components/lang-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/")({
  component: Index,
});

const services = [
  { icon: Tractor, title: "Texnika ijarasi", desc: "Traktor, kombayn, seyalka, purkagich va boshqa texnikalarni online bron qiling." },
  { icon: Wrench, title: "Usta chaqirish", desc: "Motor, gidravlika, elektr — mutaxassis ustalar sizga eng yaqin joyda." },
  { icon: Bot, title: "AI Diagnostika", desc: "Nosozlik rasmini yuboring — sun'iy intellekt muammoni va yechimni aytadi." },
  { icon: Truck, title: "Yuk tashish", desc: "Gazel, Kamaz, fura, tirkama — hosilingizni bozorga yetkazing." },
  { icon: ShoppingBasket, title: "Agro Market", desc: "Urug', o'g'it, ehtiyot qismlar va hosil bozori bir joyda." },
  { icon: MapPin, title: "Xarita", desc: "Ustalar, texnikalar, yonilg'i shoxobchalari — jonli xaritada." },
  { icon: CloudSun, title: "Ob-havo", desc: "7 kunlik aniq prognoz va agro tavsiyalar." },
  { icon: ShieldCheck, title: "Xavfsiz to'lov", desc: "Click, Payme, Uzum, Humo, UzCard va Visa/MasterCard." },
];

const stats = [
  { value: "10 000+", label: "Fermerlar" },
  { value: "500+", label: "Texnikalar" },
  { value: "1 000+", label: "Ustalar" },
  { value: "100+", label: "Tumanlar" },
];

const testimonials = [
  { name: "Abdulla aka", role: "Fermer, Farg'ona", text: "Ekin mavsumida kombayn bir kunda topildi. Ilgari 3 kun izlar edim.", rating: 5 },
  { name: "Sardor usta", role: "Traktor ustasi, Samarqand", text: "Har kuni yangi buyurtmalar keladi. Daromadim 2 barobar oshdi.", rating: 5 },
  { name: "Nodira opa", role: "Dehqon xo'jaligi, Toshkent", text: "AI diagnostika chindan ishlaydi — nosozlikni to'g'ri aniqladi.", rating: 5 },
];

function Index() {
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const goStart = () => navigate({ to: signedIn ? "/dashboard" : "/auth" });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <IntroSplash />
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <Tractor className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">AGRO YORDAMCHI</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#services" className="transition-colors hover:text-foreground">{t("nav.services")}</a>
            <a href="#how" className="transition-colors hover:text-foreground">{t("nav.how")}</a>
            <a href="#stats" className="transition-colors hover:text-foreground">{t("nav.stats")}</a>
            <a href="#reviews" className="transition-colors hover:text-foreground">{t("nav.reviews")}</a>
          </nav>
          <div className="flex items-center gap-2">
            <LangSwitcher />
            <ThemeToggle />
            {signedIn ? (
              <Link to="/dashboard" className="ml-1 rounded-lg bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:scale-[1.02]">
                {t("nav.dashboard")}
              </Link>
            ) : (
              <>
                <Link to="/auth" className="hidden rounded-lg px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary sm:block">{t("nav.signIn")}</Link>
                <Link to="/auth" className="ml-1 rounded-lg bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:scale-[1.02]">
                  {t("nav.signUp")}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt="Traktor va kombayn dalada ish jarayonida" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-hero" />
          {/* Floating decorative shapes */}
          <div className="absolute left-[10%] top-[20%] h-20 w-20 rounded-full bg-accent/30 blur-2xl animate-float" />
          <div className="absolute right-[15%] top-[30%] h-32 w-32 rounded-full bg-primary/30 blur-3xl animate-float" style={{ animationDelay: "1s" }} />
          <div className="absolute bottom-[15%] left-[30%] h-24 w-24 rounded-full bg-white/20 blur-2xl animate-float" style={{ animationDelay: "2s" }} />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-36">
          <div className="max-w-3xl animate-slide-up-fade">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-md animate-pulse-soft">
              <Sparkles className="h-4 w-4 text-accent" />
              {t("hero.badge")}
            </div>
            <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight text-white md:text-7xl">
              {t("hero.title1")}<br />
              <span className="bg-gradient-accent bg-clip-text text-transparent animate-gradient">{t("hero.title2")}</span><br />
              {t("hero.title3")}
            </h1>
            <p className="mt-6 max-w-xl text-lg text-white/85 md:text-xl">
              {t("hero.desc")}
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <button onClick={goStart} className="group inline-flex items-center gap-2 rounded-xl bg-gradient-accent px-7 py-4 text-base font-semibold text-accent-foreground shadow-lift transition-transform hover:scale-[1.03]">
                {t("hero.cta1")}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
              <button onClick={goStart} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-7 py-4 text-base font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20">
                <Wrench className="h-5 w-5" />
                {t("hero.cta2")}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="border-b border-border bg-secondary/50">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 py-14 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="bg-gradient-primary bg-clip-text text-4xl font-bold text-transparent md:text-5xl">{s.value}</div>
              <div className="mt-2 text-sm font-medium text-muted-foreground md:text-base">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section id="services" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            Xizmatlar
          </div>
          <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">Fermerga kerak bo'lgan hamma narsa</h2>
          <p className="mt-4 text-lg text-muted-foreground">Bitta ilova — ekin-tikin, texnika, usta va bozor uchun to'liq yechim.</p>
        </div>
        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s) => (
            <div key={s.title} className="group rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-soft transition-transform group-hover:scale-110">
                <s.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-secondary/40 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl font-bold tracking-tight md:text-5xl">Qanday ishlaydi</h2>
            <p className="mt-4 text-lg text-muted-foreground">3 ta oddiy qadam — bir necha daqiqada.</p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              { n: "01", icon: Phone, title: "Ro'yxatdan o'ting", desc: "Telefon raqami yoki Telegram orqali kirish. OTP kod bilan xavfsiz." },
              { n: "02", icon: MessageCircle, title: "Buyurtma bering", desc: "Texnika tanlang yoki usta chaqiring — narx va vaqtni ko'rib turasiz." },
              { n: "03", icon: Star, title: "Xizmatdan foydalaning", desc: "Ish tugagach to'lov va reyting qoldiring. Hammasi shaffof." },
            ].map((step) => (
              <div key={step.n} className="relative rounded-2xl bg-card p-8 shadow-soft">
                <div className="absolute -top-4 left-8 rounded-lg bg-gradient-primary px-3 py-1 text-sm font-bold text-primary-foreground shadow-soft">
                  {step.n}
                </div>
                <step.icon className="mt-4 h-10 w-10 text-primary" />
                <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="reviews" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-bold tracking-tight md:text-5xl">Fermerlar nima deydi</h2>
          <p className="mt-4 text-lg text-muted-foreground">Minglab foydalanuvchilarning haqiqiy fikrlari.</p>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="rounded-2xl border border-border bg-card p-8 shadow-soft">
              <div className="flex gap-1 text-accent">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-current" />
                ))}
              </div>
              <p className="mt-4 text-lg leading-relaxed">"{t.text}"</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-primary">
                  <Users className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-sm text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-12 shadow-lift md:p-20">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/30 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative max-w-2xl">
            <h2 className="text-4xl font-bold tracking-tight text-primary-foreground md:text-5xl">
              Hosilingizni ko'paytiring — bugun boshlang
            </h2>
            <p className="mt-4 text-lg text-primary-foreground/85">
              Bepul ro'yxatdan o'ting va birinchi buyurtmangizni bugun bering.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <button onClick={goStart} className="rounded-xl bg-gradient-accent px-7 py-4 text-base font-semibold text-accent-foreground shadow-lift transition-transform hover:scale-[1.03]">
                Bepul ro'yxatdan o'tish
              </button>
              <a href="#services" className="rounded-xl border border-white/30 bg-white/10 px-7 py-4 text-base font-semibold text-primary-foreground backdrop-blur-md transition-colors hover:bg-white/20">
                Xizmatlarni ko'rish
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary">
                  <Tractor className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold">AGRO YORDAMCHI</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">O'zbekiston fermerlari uchun raqamli yechim.</p>
            </div>
            <div>
              <div className="font-semibold">Platforma</div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>Texnika ijarasi</li>
                <li>Usta chaqirish</li>
                <li>AI diagnostika</li>
                <li>Hosil bozori</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold">Kompaniya</div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>Biz haqimizda</li>
                <li>Hamkorlar</li>
                <li>Yangiliklar</li>
                <li>Aloqa</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold">Bog'lanish</div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li><a href="tel:+998957935357" className="hover:text-foreground">+998 95 793 53 57</a></li>
                <li><a href="tel:+998505109501" className="hover:text-foreground">+998 50 510 95 01</a></li>
                <li><a href="https://agroyordamchi.lovable.app" className="hover:text-foreground">agroyordamchi.lovable.app</a></li>
                <li>Navoiy, O'zbekiston</li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">
            © 2026 AGRO YORDAMCHI. Barcha huquqlar himoyalangan.
          </div>
        </div>
      </footer>
    </div>
  );
}
