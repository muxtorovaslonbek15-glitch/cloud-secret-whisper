import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

function randCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// Start a link for a signed-in user (link Telegram to existing account)
export const startTelegramLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const code = randCode(6);
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    // upsert one link row per user
    await context.supabase
      .from("telegram_links")
      .upsert(
        { user_id: context.userId, link_code: code, code_expires_at: expires, linked_at: null },
        { onConflict: "user_id" },
      );
    return { code, bot: "Agroyordamuz_bot", expires };
  });

// Poll for auth link status (signed in)
export const checkTelegramLink = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("telegram_links")
      .select("linked_at, telegram_username")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { linked: !!data?.linked_at, username: data?.telegram_username ?? null };
  });

// Redeem a 6-digit code the Telegram bot sent to the user.
// Bot creates the row with telegram_id + code on /start.
// User enters that code on the site; we create/find an auth user and return credentials.
const RedeemInput = z.object({ code: z.string().regex(/^\d{6}$/) });
export const redeemTelegramCode = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => RedeemInput.parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin
      .from("telegram_links")
      .select("*")
      .eq("link_code", data.code)
      .not("telegram_id", "is", null)
      .order("created_at", { ascending: false })
      .maybeSingle();
    if (!link || !link.telegram_id) {
      return { status: "invalid" as const, error: "Kod noto'g'ri" };
    }
    if (link.code_expires_at && new Date(link.code_expires_at).getTime() < Date.now()) {
      return { status: "invalid" as const, error: "Kod muddati tugagan" };
    }
    const email = `tg${link.telegram_id}@agrousta.uz`;
    // Deterministic password so re-login works after re-entering a fresh code
    const password = `TG-${link.telegram_id}-agrousta-2026`;

    let userId = link.user_id ?? null;
    if (!userId) {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: link.telegram_username ?? `Telegram ${link.telegram_id}`,
          telegram_id: link.telegram_id,
          telegram_username: link.telegram_username,
        },
      });
      userId = created?.user?.id ?? null;
      if (createErr && !userId) {
        // user probably exists — find and reset password so we can sign them in
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        const found = users?.users.find((u) => u.email === email);
        userId = found?.id ?? null;
        if (userId) {
          await supabaseAdmin.auth.admin.updateUserById(userId, { password });
        }
      }
    } else {
      // ensure password is what we expect
      await supabaseAdmin.auth.admin.updateUserById(userId, { password });
    }
    if (!userId) return { status: "error" as const, error: "Foydalanuvchi yaratilmadi" };

    await supabaseAdmin
      .from("telegram_links")
      .update({ user_id: userId, linked_at: new Date().toISOString() })
      .eq("id", link.id);

    return { status: "ready" as const, email, password };
  });

// Admin sign-in with hardcoded credentials (login: muhayyo / password: istamova2026)
const AdminInput = z.object({ login: z.string(), password: z.string() });
const ADMIN_LOGIN = "muhayyo";
const ADMIN_PASSWORD = "istamova2026";
const ADMIN_EMAIL = "muhayyo@agrousta.uz";

export const adminSignIn = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => AdminInput.parse(i))
  .handler(async ({ data }) => {
    if (data.login !== ADMIN_LOGIN || data.password !== ADMIN_PASSWORD) {
      return { ok: false as const, error: "Login yoki parol noto'g'ri" };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // ensure admin auth user exists with the correct password
    let userId: string | null = null;
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Muhayyo (Admin)" },
    });
    userId = created?.user?.id ?? null;
    if (createErr && !userId) {
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const found = users?.users.find((u) => u.email === ADMIN_EMAIL);
      userId = found?.id ?? null;
      if (userId) {
        await supabaseAdmin.auth.admin.updateUserById(userId, { password: ADMIN_PASSWORD });
      }
    }
    if (!userId) return { ok: false as const, error: "Admin foydalanuvchisi yaratilmadi" };

    // ensure admin role
    const { data: existing } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!existing) {
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });
    }

    return { ok: true as const, email: ADMIN_EMAIL, password: ADMIN_PASSWORD };
  });

// Aggregated admin stats
export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tables = ["profiles", "techniques", "masters", "orders", "market_products", "market_orders", "contact_messages", "ai_diagnostics", "notifications", "telegram_links"] as const;
    const counts: Record<string, number> = {};
    await Promise.all(
      tables.map(async (t) => {
        const { count } = await supabaseAdmin.from(t).select("*", { count: "exact", head: true });
        counts[t] = count ?? 0;
      }),
    );
    const { data: recentOrders } = await supabaseAdmin
      .from("orders")
      .select("id, status, price, type, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    const { data: recentUsers } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, phone, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    const { data: recentMarketOrders } = await supabaseAdmin
      .from("market_orders")
      .select("id, quantity, total_price, phone, address, status, notes, created_at, customer_id, product_id, market_products(name)")
      .order("created_at", { ascending: false })
      .limit(20);
    const { data: recentMessages } = await supabaseAdmin
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    const { data: allProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, phone, viloyat, tuman, created_at")
      .order("created_at", { ascending: false });
    return {
      counts,
      recentOrders: recentOrders ?? [],
      recentUsers: recentUsers ?? [],
      recentMarketOrders: recentMarketOrders ?? [],
      recentMessages: recentMessages ?? [],
      allProfiles: allProfiles ?? [],
    };
  });