import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";

function deriveWebhookSecret(token: string): string {
  return createHash("sha256").update(`telegram-webhook:${token}`).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const av = Buffer.from(a);
  const bv = Buffer.from(b);
  if (av.length !== bv.length) return false;
  return timingSafeEqual(av, bv);
}

const WEBHOOK_URL =
  "https://project--f433cbe4-5fc7-4f21-88ec-46597ba4f536-dev.lovable.app/api/public/telegram/webhook";

async function handle(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const setupSecret = process.env.TELEGRAM_SETUP_SECRET;
  if (!token || !setupSecret) {
    return new Response("not configured", { status: 500 });
  }

  // Require a server-side admin secret; no public callers, no override URL.
  const provided = request.headers.get("X-Setup-Secret") ?? "";
  if (!safeEqual(provided, setupSecret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const secretToken = deriveWebhookSecret(token);
  const set = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: WEBHOOK_URL,
      secret_token: secretToken,
      allowed_updates: ["message", "edited_message"],
    }),
  }).then((r) => r.json());
  const info = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`).then((r) =>
    r.json(),
  );
  return Response.json({ set, info, webhookUrl: WEBHOOK_URL });
}

export const Route = createFileRoute("/api/public/telegram/setup")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
