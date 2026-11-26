import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/admin/create-mentor
 *
 * Creates a Supabase Auth user (with password) for a mentor account.
 *
 * Security:
 * - The service_role key lives ONLY in the server env (SUPABASE_SERVICE_ROLE_KEY).
 *   It is never sent to the browser.
 * - The caller must be logged in AND their profile role must be "admin".
 *   This is verified server-side against Supabase — the browser cannot fake it.
 * - Rate limiting is intentionally simple (in-memory). Behind a single server
 *   instance this is adequate; add a shared store (e.g. Upstash) if you scale out.
 */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const attempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      email?: string;
      password?: string;
      fullName?: string;
    } | null;

    const email = body?.email?.trim().toLowerCase();
    const password = body?.password || "";
    const fullName = body?.fullName?.trim() || "";

    if (!email || !password || password.length < 6 || !fullName) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Email, full name, and a password of at least 6 characters are required.",
        },
        { status: 400 },
      );
    }

    // --- Verify the CALLER is an authenticated admin (using the anon client + their token) ---
    const authHeader = request.headers.get("authorization") || "";
    const callerToken = authHeader.replace(/^Bearer\s+/i, "").trim();

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "Server is not configured with Supabase credentials.",
        },
        { status: 500 },
      );
    }

    if (!callerToken) {
      return NextResponse.json(
        {
          ok: false,
          error: "You must be logged in as an admin to create mentor accounts.",
        },
        { status: 401 },
      );
    }

    const callerClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${callerToken}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const {
      data: { user },
      error: userErr,
    } = await callerClient.auth.getUser(callerToken);

    if (userErr || !user) {
      return NextResponse.json(
        {
          ok: false,
          error: "Your session is invalid or expired. Log in again as admin.",
        },
        { status: 401 },
      );
    }

    const { data: callerProfile, error: profErr } = await callerClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profErr || !callerProfile) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Could not verify your account. Ask the developer to check the profiles table.",
        },
        { status: 403 },
      );
    }

    const callerRole = String(
      (callerProfile as Record<string, unknown>).role || "",
    ).toLowerCase();
    if (callerRole !== "admin") {
      return NextResponse.json(
        { ok: false, error: "Only admins can create mentor login accounts." },
        { status: 403 },
      );
    }

    // --- Rate limit per admin ---
    if (isRateLimited(user.id)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Too many mentor accounts created in a short time. Wait a minute and try again.",
        },
        { status: 429 },
      );
    }

    // --- Create the auth user with the service key (server-only) ---
    const adminClient = getServerSupabase();
    if (!adminClient) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "SUPABASE_SERVICE_ROLE_KEY is not set in the server environment. Add it to .env.local and restart the dev server.",
        },
        { status: 500 },
      );
    }

    const { data: newAuth, error: authErr } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, role: "mentor" },
      });

    if (authErr) {
      return NextResponse.json(
        { ok: false, error: `Supabase auth error: ${authErr.message}` },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true, userId: newAuth?.user?.id ?? null });
  } catch (err: unknown) {
    console.error("create-mentor route error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unexpected server error.",
      },
      { status: 500 },
    );
  }
}
