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
    const type = searchParams.get("type") || "buy";

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "5");
    const search = searchParams.get("search") || "";
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase.from("transactions").select(
      `
        id,
        status,
        amount,
        payment_method,
        created_at,
        quantity,
        shipping_address,
        group_buy_id,    
        auction_id,      
        product:products ( name, image_urls ),
        buyer:users!buyer_id ( username, full_name ),
        seller:users!seller_id ( username, full_name ),
        reviews!transaction_id ( id )
      `,
      { count: "exact" }
    );

    if (type === "sell") {
      query = query.eq("seller_id", userId);
    } else {
      query = query.eq("buyer_id", userId);
    }

    if (search) {
      const { data: foundProducts } = await supabase
        .from("products")
        .select("id")
        .ilike("name", `%${search}%`);
      const productIds = foundProducts?.map((p) => p.id) || [];

      const { data: foundUsers } = await supabase
        .from("users")
        .select("id")
        .or(`username.ilike.%${search}%,full_name.ilike.%${search}%`);
      const userIds = foundUsers?.map((u) => u.id) || [];

      const conditions = [];

      if (productIds.length > 0) {
        conditions.push(`product_id.in.(${productIds.join(",")})`);
      }

      if (userIds.length > 0) {
        if (type === "buy") {
          conditions.push(`seller_id.in.(${userIds.join(",")})`);
        } else {
          conditions.push(`buyer_id.in.(${userIds.join(",")})`);
        }
      }

      if (conditions.length > 0) {
        query = query.or(conditions.join(","));
      } else {
        query = query.eq("id", "00000000-0000-0000-0000-000000000000");
      }
    }

    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data: orders, error, count } = await query;

    if (error) throw error;

    const totalPages = count ? Math.ceil(count / limit) : 1;

    return NextResponse.json(
      {
        orders: orders || [],
        pagination: { page, limit, total: count, totalPages },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("API Orders Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
