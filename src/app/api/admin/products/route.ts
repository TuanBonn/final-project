// src/app/api/admin/products/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parse as parseCookie } from "cookie";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = "auth-token";

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  if (!JWT_SECRET) return false;
  try {
    const cookieHeader = request.headers.get("cookie");
    if (!cookieHeader) return false;
    const token = parseCookie(cookieHeader)[COOKIE_NAME];
    if (!token) return false;
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded.role === "admin";
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10"); // Mặc định 10
  const search = searchParams.get("search") || "";

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const supabase = getSupabaseAdmin();

  try {
    // 1. Query cơ bản
    let query = supabase
      .from("products")
      .select("*, seller:users!seller_id(username)", { count: "exact" });

    // 2. Tìm kiếm (nếu có)
    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    // 3. Sắp xếp mới nhất trước
    query = query.order("created_at", { ascending: false });

    // 4. Phân trang (Range)
    query = query.range(from, to);

    const { data: products, error, count } = await query;

    if (error) throw error;

    const totalPages = count ? Math.ceil(count / limit) : 1;

    return NextResponse.json(
      { products, totalPages, currentPage: page, totalItems: count },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
