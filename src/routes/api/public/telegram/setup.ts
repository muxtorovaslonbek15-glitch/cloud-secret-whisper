import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/telegram/setup")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) return Response.json({ error: "no token" }, { status: 500 });
        const u = new URL(request.url);
        const override = u.searchParams.get("url");
        const webhookUrl = override ?? "https://project--f433cbe4-5fc7-4f21-88ec-46597ba4f536-dev.lovable.app/api/public/telegram/webhook";
        const set = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: webhookUrl, allowed_updates: ["message", "edited_message"] }),
        }).then((r) => r.json());
        const info = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`).then((r) => r.json());
        return Response.json({ set, info, webhookUrl });
      },
    },
  },
});
