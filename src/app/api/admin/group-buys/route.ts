// src/app/api/admin/group-buys/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { parse as parseCookie } from "cookie";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = "auth-token";

interface JwtPayload {
  role?: string;
  [key: string]: unknown;
}

function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  if (!JWT_SECRET) return false;
  try {
    let token: string | undefined;
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) token = parseCookie(cookieHeader)[COOKIE_NAME];
    if (!token) return false;
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
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
    const search = searchParams.get("search");

    // === PAGINATION PARAMS ===
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin.from("group_buys").select(
      `
        id, product_name, price_per_unit, target_quantity, status, join_deadline, created_at, host_id,
        host:users!host_id ( username, full_name, email )
      `,
      { count: "exact" }
    );

    // === OPTIMIZED SEARCH ===
    if (search) {
      // 1. Find Host IDs matching username (Limit 50 to prevent timeout)
      const { data: hosts } = await supabaseAdmin
        .from("users")
        .select("id")
        .ilike("username", `%${search}%`)
        .limit(50);

      const hostIds = hosts?.map((u) => u.id) || [];

      // 2. Build Condition: (Product Name LIKE search) OR (Host ID IN list)
      const conditions = [`product_name.ilike.%${search}%`]; // Removed 'title' as it doesn't exist in schema
      if (hostIds.length > 0) {
        conditions.push(`host_id.in.(${hostIds.join(",")})`);
      }

      query = query.or(conditions.join(","));
    }

    // === SORT & RANGE ===
    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    const totalPages = count ? Math.ceil(count / limit) : 1;

    return NextResponse.json(
      {
        groupBuys: data || [],
        totalPages,
        currentPage: page,
        totalItems: count,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("API Admin Group Buys Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
