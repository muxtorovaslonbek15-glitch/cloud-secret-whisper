import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DiagnoseInput = z.object({
  problem: z.string().min(5).max(2000),
  imageUrl: z.string().url().optional(),
});

export const diagnoseProblem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DiagnoseInput.parse(input))
  .handler(async ({ data, context }) => {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) throw new Error("Gemini API kaliti sozlanmagan");

    const systemPrompt = `Sen O'zbekistondagi qishloq xo'jaligi texnikasi bo'yicha ekspert AI diagnostikasan.
Fermer texnika muammosini yozadi (ba'zan rasm ham). Sen o'zbek tilida javob berasan.
Javob quyidagi tuzilishda bo'lsin:

🔍 MUAMMO TAHLILI:
[muammoning qisqacha tavsifi]

🎯 EHTIMOLIY SABABLAR (foizli):
• [sabab 1] — XX%
• [sabab 2] — XX%
• [sabab 3] — XX%

💡 TAVSIYA ETILGAN YECHIM:
[amaliy qadamlar]

👨‍🔧 KERAKLI USTA MUTAXASSISLIGI:
[motor / elektr / gidravlika / karobka / va h.k.]

💰 TAXMINIY XIZMAT NARXI:
[XX 000 - XX 000 so'm]

⚠️ XAVFSIZLIK OGOHLANTIRISHI:
[agar bor bo'lsa]`;

    // Direct Google Gemini REST API call using user's GEMINI_API_KEY
    const parts: Array<Record<string, unknown>> = [{ text: data.problem }];
    if (data.imageUrl) {
      try {
        // SSRF guard: only allow images hosted on the project's Supabase storage.
        const supabaseHost = new URL(process.env.SUPABASE_URL ?? "https://invalid.invalid").hostname;
        const parsed = new URL(data.imageUrl);
        const host = parsed.hostname.toLowerCase();
        const isAllowedHost = parsed.protocol === "https:" && host === supabaseHost;
        // Reject IP literals, localhost, and private/link-local ranges regardless.
        const isIpLiteral = /^[0-9.:]+$/.test(host) || host.includes(":");
        const isPrivate = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|::1|fe80:|fc00:|fd00:)/i.test(host) ||
          /^172\.(1[6-9]|2\d|3[01])\./.test(host);
        if (!isAllowedHost || isIpLiteral || isPrivate) {
          throw new Error("imageUrl not allowed");
        }
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const r = await fetch(data.imageUrl, { signal: controller.signal, redirect: "error" });
        clearTimeout(timer);
        const ct = r.headers.get("content-type") ?? "image/jpeg";
        if (!ct.startsWith("image/")) throw new Error("not an image");
        const buf = await r.arrayBuffer();
        if (buf.byteLength > 8 * 1024 * 1024) throw new Error("image too large");
        const b64 = Buffer.from(buf).toString("base64");
        parts.push({ inline_data: { mime_type: ct, data: b64 } });
      } catch (e) {
        console.error("image fetch rejected", e);
      }
    }
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts }],
        }),
      },
    );
    if (!geminiRes.ok) {
      const body = await geminiRes.text();
      throw new Error(`Gemini [${geminiRes.status}]: ${body.slice(0, 300)}`);
    }
    const json = (await geminiRes.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("\n") ?? "";
    if (!text) throw new Error("AI bo'sh javob qaytardi");

    // Save to DB
    await context.supabase.from("ai_diagnostics").insert({
      user_id: context.userId,
      problem_input: data.problem,
      image_url: data.imageUrl ?? null,
      ai_diagnosis: text,
    });

    return { diagnosis: text };
  });