// src/app/api/admin/payments/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { parse as parseCookie } from "cookie";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = "auth-token";

function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  if (!JWT_SECRET) return false;
  try {
    let token: string | undefined = undefined;
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) token = parseCookie(cookieHeader)[COOKIE_NAME];
    if (!token) return false;
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded.role === "admin";
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Admin Client Error");

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // Pagination params
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin
      .from("platform_payments")
      .select(
        `
        id,
        amount,
        currency,
        payment_for_type,
        status,
        created_at,
        withdrawal_info,
        user:users ( username, email )
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    // === SEARCH LOGIC ===
    if (search) {
      const { data: foundUsers } = await supabaseAdmin
        .from("users")
        .select("id")
        .or(`username.ilike.%${search}%,email.ilike.%${search}%`);

      const userIds = foundUsers?.map((u) => u.id) || [];

      if (userIds.length > 0) {
        query = query.in("user_id", userIds);
      } else {
        return NextResponse.json(
          { payments: [], totalPages: 0 },
          { status: 200 }
        );
      }
    }
    // ====================

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    // Apply pagination range
    query = query.range(from, to);

    const { data: payments, error, count } = await query;

    if (error) throw error;

    const totalPages = count ? Math.ceil(count / limit) : 0;

    return NextResponse.json(
      {
        payments: payments || [],
        totalPages,
        currentPage: page,
        totalCount: count,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Server Error" },
      { status: 500 }
    );
  }
}
