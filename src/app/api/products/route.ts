import { NextResponse } from "next/server";
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

// ================== GET ==================
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const params = url.searchParams;

    const sort = params.get("sort") || "created_at_desc";
    const filterVerified = params.get("verified") === "true";
    const filterConditions = params.getAll("condition");
    const filterBrandIds = params.getAll("brand_id");
    const filterSellerId = params.get("seller_id");

    // --- LOGIC PHÂN TRANG ---
    const page = parseInt(params.get("page") || "1");
    const limit = parseInt(params.get("limit") || "15");
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Lỗi cấu hình server." },
        { status: 500 }
      );
    }

    let query = supabaseAdmin
      .from("products")
      .select(
        `
        id, name, price, condition, image_urls, created_at, brand_id, seller_id, quantity,
        seller:users!seller_id!inner ( username, avatar_url, is_verified ),
        brand:brands ( id, name )
      `,
        { count: "exact" }
      )
      .eq("status", "available");

    if (filterConditions.length > 0)
      query = query.in("condition", filterConditions);
    if (filterBrandIds.length > 0) query = query.in("brand_id", filterBrandIds);
    if (filterVerified) query = query.eq("seller.is_verified", true);
    if (filterSellerId) query = query.eq("seller_id", filterSellerId);

    if (sort === "price_asc") query = query.order("price", { ascending: true });
    else if (sort === "price_desc")
      query = query.order("price", { ascending: false });
    else query = query.order("created_at", { ascending: false });

    query = query.range(from, to);

    const { data: products, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const totalPages = count ? Math.ceil(count / limit) : 1;

    return NextResponse.json(
      {
        products: products ?? [],
        pagination: { page, limit, total: count, totalPages },
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: "Lỗi server." }, { status: 500 });
  }
}

// ================== POST (ĐĂNG SẢN PHẨM) ==================
export async function POST(request: Request) {
  if (!JWT_SECRET || !supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: "Lỗi cấu hình server." },
      { status: 500 }
    );
  }

  let userId: string | null = null;
  try {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const cookies = parseCookie(cookieHeader);
      const token = cookies[COOKIE_NAME];
      if (token) {
        const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
        userId = payload.userId;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Yêu cầu đăng nhập để đăng bán." },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Phiên đăng nhập không hợp lệ." },
      { status: 401 }
    );
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Lỗi khởi tạo Admin Client");

    const body = await request.json();
    const {
      name,
      description,
      price,
      brand_id,
      condition,
      imageUrls,
      quantity,
    } = body;

    if (
      !name ||
      !price ||
      !condition ||
      !imageUrls ||
      imageUrls.length === 0 ||
      !brand_id
    ) {
      return NextResponse.json(
        { error: "Thiếu thông tin bắt buộc." },
        { status: 400 }
      );
    }

    const { data, error: insertError } = await supabaseAdmin
      .from("products")
      .insert({
        seller_id: userId,
        name,
        description,
        price: price.toString().replace(/\D/g, ""),
        brand_id,
        condition,
        image_urls: imageUrls,
        status: "available",
        quantity: quantity ? parseInt(quantity) : 1, // Lưu số lượng (mặc định 1)
      })
      .select()
      .single();

    if (insertError) {
      console.error("API POST /products: Lỗi chèn DB:", insertError);
      throw insertError;
    }

    return NextResponse.json(
      { product: data, message: "Đăng bán thành công!" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("API POST /products: Lỗi bất ngờ:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi server khi đăng bán." },
      { status: 500 }
    );
  }
}
