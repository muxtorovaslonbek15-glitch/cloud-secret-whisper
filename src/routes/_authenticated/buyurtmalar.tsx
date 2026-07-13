import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { ShoppingBag, Clock, CheckCircle2, XCircle, Truck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/buyurtmalar")({
  component: BuyurtmalarPage,
});

const statusMap = {
  yaratildi: { label: "Yaratildi", icon: Clock, color: "text-chart-4 bg-chart-4/10" },
  jarayonda: { label: "Jarayonda", icon: Clock, color: "text-primary bg-primary/10" },
  yolda: { label: "Yo'lda", icon: Truck, color: "text-chart-2 bg-chart-2/10" },
  bajarildi: { label: "Bajarildi", icon: CheckCircle2, color: "text-primary bg-primary/10" },
  bekor: { label: "Bekor qilindi", icon: XCircle, color: "text-destructive bg-destructive/10" },
} as const;

function BuyurtmalarPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, technique:techniques(name, image_url), master:masters(specialty)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orders").update({ status: "bekor" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Buyurtma bekor qilindi");
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  return (
    <AppShell title="Buyurtmalarim">
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-card" />)}</div>
      ) : orders && orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((o) => {
            const s = statusMap[o.status];
            const title = o.type === "texnika_ijarasi"
              ? (o.technique?.name || "Texnika buyurtmasi")
              : (o.master?.specialty ? `${o.master.specialty} ustasi` : "Usta chaqiruvi");
            return (
              <div key={o.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-soft sm:flex-row sm:items-center">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{title}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.color}`}>{s.label}</span>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    #{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString("uz-UZ")}
                    {o.price && ` · ${Number(o.price).toLocaleString("uz-UZ")} so'm`}
                  </div>
                  {o.problem_description && <p className="mt-1 text-sm">{o.problem_description}</p>}
                </div>
                {o.status === "yaratildi" && o.customer_id === user.id && (
                  <button onClick={() => cancel.mutate(o.id)} className="rounded-lg border border-destructive/30 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10">
                    Bekor qilish
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 font-semibold">Hozircha buyurtmalar yo'q</h3>
          <p className="mt-1 text-sm text-muted-foreground">Texnika yoki usta bo'limlaridan buyurtma bering.</p>
        </div>
      )}
    </AppShell>
  );
}