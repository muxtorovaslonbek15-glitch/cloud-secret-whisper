import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Bot, Sparkles, Loader2, History } from "lucide-react";
import { toast } from "sonner";
import { diagnoseProblem } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/diagnostika")({
  component: DiagnostikaPage,
});

function DiagnostikaPage() {
  const { user } = Route.useRouteContext();
  const [problem, setProblem] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const diagnose = useServerFn(diagnoseProblem);

  const mutation = useMutation({
    mutationFn: async () => diagnose({ data: { problem } }),
    onSuccess: (r) => setResult(r.diagnosis),
    onError: (e) => toast.error(e.message || "AI xatolik"),
  });

  const { data: history } = useQuery({
    queryKey: ["diagnostics", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("ai_diagnostics").select("*").order("created_at", { ascending: false }).limit(5);
      return data ?? [];
    },
  });

  return (
    <AppShell title="AI Diagnostika">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Input */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
                <Bot className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-semibold">AI Yordamchi</h2>
                <p className="text-sm text-muted-foreground">Texnika muammosini yozing, AI tahlil qiladi</p>
              </div>
            </div>

            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="Masalan: Traktor motori qizib ketmoqda, ishlab turganida g'alati ovoz chiqarayapti va tez-tez o'chib qolmoqda..."
              className="mt-4 w-full resize-none rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />

            <button
              disabled={problem.trim().length < 5 || mutation.isPending}
              onClick={() => mutation.mutate()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-50"
            >
              {mutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> AI tahlil qilmoqda...</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Tahlil qilish</>
              )}
            </button>
          </div>

          {result && (
            <div className="mt-4 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 p-6 shadow-lift">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
                <Sparkles className="h-4 w-4" /> AI natijasi
              </div>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{result}</pre>
            </div>
          )}
        </div>

        {/* History */}
        <div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="mb-4 flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Oxirgi tahlillar</h3>
            </div>
            {history && history.length > 0 ? (
              <div className="space-y-3">
                {history.map((h) => (
                  <div key={h.id} className="rounded-lg border border-border/60 p-3 text-sm">
                    <div className="line-clamp-2 font-medium">{h.problem_input}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Date(h.created_at).toLocaleDateString("uz-UZ")}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Hozircha tahlillar yo'q</p>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}