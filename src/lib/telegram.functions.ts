import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { timingSafeEqual } from "crypto";

function constantTimeEqual(a: string, b: string): boolean {
  const av = Buffer.from(a);
  const bv = Buffer.from(b);
  if (av.length !== bv.length) return false;
  return timingSafeEqual(av, bv);
}

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
const RedeemInput = z.object({ code: z.string().regex(/^\d{6}$/) });
export const redeemTelegramCode = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => RedeemInput.parse(i))
  .handler(async ({ data }) => {
    const { randomBytes } = await import("crypto");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link, error: linkError } = await supabaseAdmin
      .from("telegram_links")
      .select("*")
      .eq("link_code", data.code)
      .not("telegram_id", "is", null)
      .order("created_at", { ascending: false })
      .maybeSingle();
    if (linkError) {
      console.error("Telegram code lookup failed:", linkError.message);
      return { status: "error" as const, error: "Kod tekshirilmadi. Qayta urinib ko'ring" };
    }
    if (!link || !link.telegram_id) {
      return { status: "invalid" as const, error: "Kod noto'g'ri" };
    }
    if (link.code_expires_at && new Date(link.code_expires_at).getTime() < Date.now()) {
      return { status: "invalid" as const, error: "Kod muddati tugagan" };
    }
    const email = `tg${link.telegram_id}@agrousta.uz`;
    const password = randomBytes(24).toString("base64url");

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
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        const found = users?.users.find((u) => u.email === email);
        userId = found?.id ?? null;
        if (userId) {
          await supabaseAdmin.auth.admin.updateUserById(userId, { password });
        }
      }
    } else {
      await supabaseAdmin.auth.admin.updateUserById(userId, { password });
    }
    if (!userId) return { status: "error" as const, error: "Foydalanuvchi yaratilmadi" };

    const { error: updateError } = await supabaseAdmin
      .from("telegram_links")
      .update({
        user_id: userId,
        linked_at: new Date().toISOString(),
        link_code: null,
        code_expires_at: null,
      })
      .eq("id", link.id);
    if (updateError) {
      console.error("Telegram code invalidation failed:", updateError.message);
      return { status: "error" as const, error: "Kirish yakunlanmadi. Yangi kod oling" };
    }

    return { status: "ready" as const, email, password };
  });

// Admin sign-in — credentials come from server-only secrets (ADMIN_LOGIN, ADMIN_PASSWORD).
const AdminInput = z.object({ login: z.string().max(200), password: z.string().max(500) });
const ADMIN_EMAIL = "muhayyo@agrousta.uz";

export const adminSignIn = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => AdminInput.parse(i))
  .handler(async ({ data }) => {
    const { randomBytes } = await import("crypto");
    const expectedLogin = process.env.ADMIN_LOGIN;
    const expectedPassword = process.env.ADMIN_PASSWORD;
    if (!expectedLogin || !expectedPassword) {
      return { ok: false as const, error: "Admin sozlanmagan" };
    }
    const loginOk = constantTimeEqual(data.login, expectedLogin);
    const passOk = constantTimeEqual(data.password, expectedPassword);
    if (!loginOk || !passOk) {
      return { ok: false as const, error: "Login yoki parol noto'g'ri" };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const sessionPassword = randomBytes(24).toString("base64url");

    let userId: string | null = null;
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: sessionPassword,
      email_confirm: true,
      user_metadata: { full_name: "Muhayyo (Admin)" },
    });
    userId = created?.user?.id ?? null;
    if (createErr && !userId) {
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const found = users?.users.find((u) => u.email === ADMIN_EMAIL);
      userId = found?.id ?? null;
      if (userId) {
        await supabaseAdmin.auth.admin.updateUserById(userId, { password: sessionPassword });
      }
    }
    if (!userId) return { ok: false as const, error: "Admin foydalanuvchisi yaratilmadi" };

    const { data: existing } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!existing) {
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });
    }

    return { ok: true as const, email: ADMIN_EMAIL, password: sessionPassword };
  });

// --- Admin helper (admin only) ---
async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Forbidden");
}

// Aggregated admin stats
export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
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
    const { data: allTechniques } = await supabaseAdmin
      .from("techniques").select("*").order("created_at", { ascending: false });
    const { data: allMasters } = await supabaseAdmin
      .from("masters").select("*").order("created_at", { ascending: false });
    const { data: allProducts } = await supabaseAdmin
      .from("market_products").select("*").order("created_at", { ascending: false });
    const { data: allOrders } = await supabaseAdmin
      .from("orders").select("*").order("created_at", { ascending: false }).limit(200);
    const { data: allDiagnostics } = await supabaseAdmin
      .from("ai_diagnostics").select("*").order("created_at", { ascending: false }).limit(200);
    const { data: allNotifications } = await supabaseAdmin
      .from("notifications").select("*").order("created_at", { ascending: false }).limit(200);
    const { data: allTelegramLinks } = await supabaseAdmin
      .from("telegram_links").select("*").order("linked_at", { ascending: false, nullsFirst: false });
    return {
      counts,
      recentOrders: recentOrders ?? [],
      recentUsers: recentUsers ?? [],
      recentMarketOrders: recentMarketOrders ?? [],
      recentMessages: recentMessages ?? [],
      allProfiles: allProfiles ?? [],
      allTechniques: allTechniques ?? [],
      allMasters: allMasters ?? [],
      allProducts: allProducts ?? [],
      allOrders: allOrders ?? [],
      allDiagnostics: allDiagnostics ?? [],
      allNotifications: allNotifications ?? [],
      allTelegramLinks: allTelegramLinks ?? [],
    };
  });

// List all users with roles
export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, phone, viloyat, tuman, avatar_url, created_at")
      .order("created_at", { ascending: false });
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const roleMap = new Map<string, string[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    });
    return (profiles ?? []).map((p: any) => ({ ...p, roles: roleMap.get(p.id) ?? [] }));
  });

// Set user role (replaces existing roles with the given role)
const SetRoleInput = z.object({ user_id: z.string().uuid(), role: z.enum(["fermer", "usta", "texnika_egasi", "admin"]) });
export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SetRoleInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: data.user_id, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Delete a user (auth cascade removes profile & data via FK)
const DeleteUserInput = z.object({ user_id: z.string().uuid() });
export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => DeleteUserInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.user_id === context.userId) throw new Error("O'zingizni o'chira olmaysiz");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Send notification to specific user (also to Telegram if linked)
const SendMsgInput = z.object({
  user_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
});
export const sendUserNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SendMsgInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("notifications").insert({
      user_id: data.user_id,
      title: data.title,
      body: data.body,
      type: "admin_message",
    });
    if (error) throw new Error(error.message);
    try {
      const { data: link } = await supabaseAdmin
        .from("telegram_links")
        .select("telegram_id")
        .eq("user_id", data.user_id)
        .maybeSingle();
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (link?.telegram_id && token) {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: link.telegram_id,
            text: `📢 ${data.title}\n\n${data.body}`,
          }),
        });
      }
    } catch {}
    return { ok: true };
  });

// Broadcast to all users
const BroadcastInput = z.object({ title: z.string().min(1).max(200), body: z.string().min(1).max(2000) });
export const broadcastNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => BroadcastInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id");
    if (!profiles || profiles.length === 0) return { ok: true, count: 0 };
    const rows = profiles.map((p: any) => ({
      user_id: p.id,
      title: data.title,
      body: data.body,
      type: "broadcast",
    }));
    const { error } = await supabaseAdmin.from("notifications").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true, count: profiles.length };
  });

// Generic admin delete for a whitelisted table
const AdminDeleteInput = z.object({
  table: z.enum(["techniques", "masters", "market_products", "market_orders", "orders", "contact_messages", "ai_diagnostics", "notifications", "telegram_links"]),
  id: z.string().uuid(),
});
export const adminDeleteRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => AdminDeleteInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from(data.table).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Generic status update for orders / market_orders / contact_messages
const AdminUpdateStatusInput = z.object({
  table: z.enum(["orders", "market_orders", "contact_messages"]),
  id: z.string().uuid(),
  status: z.string().min(1).max(50),
});
export const adminUpdateStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => AdminUpdateStatusInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from(data.table).update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --- Delete own account ---
export const deleteOwnAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
