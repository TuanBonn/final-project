// src/app/api/admin/auctions/route.ts
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
    let token: string | undefined = undefined;
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
    const status = searchParams.get("status");
    const search = searchParams.get("search"); // <--- Lấy param search

    // Query cơ bản
    let query = supabaseAdmin
      .from("auctions")
      .select(
        `
        id,
        start_time,
        end_time,
        starting_bid,
        status,
        created_at,
        product:products ( name ),
        seller:users!seller_id ( username ),
        bids:bids ( count )
      `
      )
      .order("created_at", { ascending: false });

    // === LOGIC TÌM KIẾM ===
    if (search) {
      // 1. Tìm Product ID có tên khớp
      const { data: products } = await supabaseAdmin
        .from("products")
        .select("id")
        .ilike("name", `%${search}%`);

      // 2. Tìm Seller ID có username khớp
      const { data: sellers } = await supabaseAdmin
        .from("users")
        .select("id")
        .ilike("username", `%${search}%`);

      const productIds = products?.map((p) => p.id) || [];
      const sellerIds = sellers?.map((u) => u.id) || [];

      const conditions = [];
      if (productIds.length > 0)
        conditions.push(`product_id.in.(${productIds.join(",")})`);
      if (sellerIds.length > 0)
        conditions.push(`seller_id.in.(${sellerIds.join(",")})`);

      if (conditions.length > 0) {
        query = query.or(conditions.join(","));
      } else {
        // Search không ra kết quả nào -> Trả về rỗng bằng cách query ID không tồn tại
        query = query.eq("id", "00000000-0000-0000-0000-000000000000");
      }
    }
    // ======================

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data: auctions, error } = await query;

    if (error) throw error;

    // Format data
    const formattedAuctions = auctions?.map((auction: any) => ({
      ...auction,
      bid_count: auction.bids?.[0]?.count || 0,
    }));

    return NextResponse.json(
      { auctions: formattedAuctions || [] },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Server Error" },
      { status: 500 }
    );
  }
}
