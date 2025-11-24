// src/app/api/orders/route.ts
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

function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) return null;
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
  if (!supabase)
    return NextResponse.json({ error: "Config Error" }, { status: 500 });

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "buy"; // 'buy' or 'sell'

    let query = supabase
      .from("transactions")
      .select(
        `
        id, status, amount, payment_method, created_at,
        product:products ( name, image_urls ),
        buyer:users!buyer_id ( username, full_name ),
        seller:users!seller_id ( username, full_name ),
        reviews!transaction_id ( id )  // <-- THÊM DÒNG NÀY
      `
      )
      .order("created_at", { ascending: false });

    if (type === "sell") {
      query = query.eq("seller_id", userId);
    } else {
      query = query.eq("buyer_id", userId);
    }

    const { data: orders, error } = await query;

    if (error) throw error;

    return NextResponse.json({ orders: orders || [] }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
