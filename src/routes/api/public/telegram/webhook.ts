import { createFileRoute } from "@tanstack/react-router";

const GATEWAY = "https://api.telegram.org";

async function sendMessage(token: string, chatId: number, text: string) {
  try {
    await fetch(`${GATEWAY}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch (e) { console.error("tg send", e); }
}

function randNumeric(len = 6) {
  let s = "";
  for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10).toString();
  return s;
}

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) return new Response("no token", { status: 500 });
        const update = await request.json().catch(() => null);
        if (!update) return Response.json({ ok: true });
        const msg = update.message ?? update.edited_message;
        if (!msg?.chat?.id) return Response.json({ ok: true });
        const chatId = msg.chat.id as number;
        const tgId = msg.from?.id as number;
        const username = msg.from?.username as string | undefined;
        const text = (msg.text as string | undefined) ?? "";

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // On /start (or any message from a new user): generate a 6-digit code and send it back
        if (text.startsWith("/start") || text.toLowerCase().includes("kod") || text.toLowerCase().includes("code") || text === "") {
          const code = randNumeric(6);
          const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
          // remove previous pending code for this telegram_id
          await supabaseAdmin.from("telegram_links").delete().eq("telegram_id", tgId).is("user_id", null);
          await supabaseAdmin.from("telegram_links").insert({
            link_code: code,
            code_expires_at: expires,
            telegram_id: tgId,
            telegram_username: username ?? null,
          });
          await sendMessage(
            token,
            chatId,
            `👋 <b>AGRO YORDAMCHI</b> ga xush kelibsiz!\n\n🔐 Sizning ro'yxatdan o'tish kodingiz:\n\n<b>${code}</b>\n\nSaytga qayting va shu kodni kiriting.\n⏰ Kod 15 daqiqa amal qiladi.\n\n🌐 agroyordamchi.lovable.app`,
          );
          return Response.json({ ok: true });
        }

        await sendMessage(
          token,
          chatId,
          "🤖 Yangi kod olish uchun /start buyrug'ini yuboring.",
        );
        return Response.json({ ok: true });
      },
    },
  },
});