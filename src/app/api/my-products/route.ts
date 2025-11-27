// src/app/api/my-products/route.ts
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
  userId: string;
  [key: string]: unknown;
}

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

async function getUserId(request: NextRequest): Promise<string | null> {
  if (!JWT_SECRET) return null;
  try {
    const cookieHeader = request.headers.get("cookie");
    if (!cookieHeader) return null;
    const token = parseCookie(cookieHeader)[COOKIE_NAME];
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded.userId;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";

  try {
    let query = supabase
      .from("products")
      .select("*")
      .eq("seller_id", userId) // Chỉ lấy của chính mình

      // === BỘ LỌC MỚI ===
      .neq("status", "auction") // 1. Loại bỏ sản phẩm Đấu giá
      .not("name", "ilike", "[Group Buy]%") // 2. Loại bỏ sản phẩm Mua chung (Proxy)
      // ==================

      .order("created_at", { ascending: false });

    // Nếu có tìm kiếm
    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data: products, error } = await query;

    if (error) throw error;

    return NextResponse.json({ products }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
