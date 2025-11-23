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

// === GET ===
export async function GET(request: NextRequest) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Lỗi Admin Client");

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    // Query lấy thông tin đấu giá + sản phẩm + người bán + số lượt bid
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

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data: auctions, error } = await query;

    if (error) throw error;

    // Format lại dữ liệu (lấy count ra ngoài)
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
      { error: error.message || "Lỗi server." },
      { status: 500 }
    );
  }
}
