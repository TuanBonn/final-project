// src/app/api/products/route.ts
// ĐÃ SỬA: Cập nhật toàn bộ file để dùng schema CSDL mới (bảng brands)

import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { parse as parseCookie } from "cookie";
import jwt from "jsonwebtoken";

// --- Cấu hình Client ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client cơ bản (Dùng cho GET)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Cấu hình Auth (Dùng cho POST) ---
interface JwtPayload {
  userId: string;
  [key: string]: unknown;
}
const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = "auth-token";

// --- Hàm khởi tạo Admin Client (Dùng cho POST) ---
function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("API Products: Thiếu Supabase URL hoặc Service Key!");
    return null;
  }
  try {
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
  } catch (error) {
    console.error("API Products: Lỗi tạo Admin Client:", error);
    return null;
  }
}

// --- Hàm xác thực (Dùng cho POST) ---
function getVerifiedUserIdFromToken(token: string | undefined): string | null {
  if (!JWT_SECRET) {
    console.error("[API] JWT_SECRET thiếu.");
    return null;
  }
  if (!token) {
    return null;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return payload?.userId ?? null;
  } catch (error) {
    console.error("[API] Lỗi verify token:", error);
    return null;
  }
}

// === HÀM GET (Lấy sản phẩm - ĐÃ SỬA LỖI QUERY) ===
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const params = url.searchParams;
    const sort = params.get("sort") || "created_at_desc";
    const filterVerified = params.get("verified") === "true";
    const filterConditions = params.getAll("condition");
    const filterBrands = params.getAll("brand"); // Đây là mảng TÊN, vd: ["Tomica", "MiniGT"]
    const limit = 25;

    // Dùng 'supabase' (client cơ bản)
    let query = supabase
      .from("products")
      .select(
        `
        id, name, price, condition, image_urls, created_at,
        seller:users!seller_id ( username, avatar_url, is_verified ),
        brand:brands ( id, name ) 
      `
        // 1. Sửa: Bỏ cột "brand" (text)
        // 2. Sửa: Thêm "brand:brands ( id, name )" để join lấy tên brand
      )
      .eq("status", "available");

    // --- Xử lý Filter (Dùng bí danh 'seller') ---
    if (filterVerified) {
      query = query.eq("seller.is_verified", true);
    }
    if (filterConditions && filterConditions.length > 0) {
      query = query.in("condition", filterConditions);
    }

    // === SỬA LỖI QUERY BRAND ===
    // Lọc trên bảng "brands" đã join (thông qua relationship "brand")
    if (filterBrands && filterBrands.length > 0) {
      // Tên relationship trong Prisma là "brand", tên cột trong bảng "brands" là "name"
      query = query.in("brand.name", filterBrands);
    }
    // ============================

    // --- Xử lý Sort (Giữ nguyên) ---
    if (sort === "verified_first") {
      query = query.order("is_verified", {
        foreignTable: "seller",
        ascending: false,
      });
      query = query.order("created_at", { ascending: false });
    } else if (sort === "price_asc") {
      query = query.order("price", { ascending: true });
    } else if (sort === "price_desc") {
      query = query.order("price", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    query = query.limit(limit);

    // Chạy query
    const { data: products, error } = await query;

    if (error) {
      console.error("API GET /products: Lỗi query DB:", error); // Log lỗi CSDL ra server
      throw error;
    }

    // console.log(`API GET /products: Lấy thành công ${products?.length || 0} sản phẩm.`);
    return NextResponse.json({ products: products || [] }, { status: 200 });
  } catch (error: unknown) {
    console.error("API GET /products: Lỗi bất ngờ:", error);
    let message = "Lỗi server khi lấy sản phẩm.";
    if (error instanceof Error) message = error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// === HÀM POST (Đăng sản phẩm - ĐÃ SỬA LỖI QUERY) ===
export async function POST(request: Request) {
  console.log("API POST /products: Bắt đầu xử lý đăng sản phẩm...");
  if (!JWT_SECRET || !supabaseUrl || !supabaseServiceKey) {
    console.error("API POST /products: Thiếu cấu hình .env");
    return NextResponse.json(
      { error: "Lỗi cấu hình server." },
      { status: 500 }
    );
  }

  // 1. Kiểm tra "vé" (JWT)
  let userId: string | null;
  try {
    let token: string | undefined = undefined;
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const cookies = parseCookie(cookieHeader);
      token = cookies[COOKIE_NAME];
    }
    userId = getVerifiedUserIdFromToken(token);
    if (!userId) {
      return NextResponse.json(
        { error: "Yêu cầu đăng nhập để đăng bán." },
        { status: 401 }
      );
    }
  } catch (error: unknown) {
    return NextResponse.json({ error: "Xác thực thất bại." }, { status: 401 });
  }

  // 2. Lấy thông tin sản phẩm từ form
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Lỗi khởi tạo Admin Client");

    const body = await request.json();

    // === SỬA LỖI TÊN TRƯỜNG ===
    const { name, description, price, brand_id, condition, imageUrls } = body;
    // (Bỏ 'brand', thay bằng 'brand_id')
    // ========================

    if (
      !name ||
      !price ||
      !condition ||
      !imageUrls ||
      imageUrls.length === 0 ||
      !brand_id
    ) {
      return NextResponse.json(
        {
          error: "Thiếu thông tin bắt buộc (Tên, Giá, Brand, Tình trạng, Ảnh).",
        },
        { status: 400 }
      );
    }

    // 3. Đút sản phẩm vào kho
    const { data, error: insertError } = await supabaseAdmin
      .from("products")
      .insert({
        seller_id: userId,
        name: name,
        description: description,
        price: price.toString().replace(/\D/g, ""), // <-- Sửa: Xóa dấu chấm trước khi lưu
        brand_id: brand_id, // <-- Sửa
        condition: condition,
        image_urls: imageUrls,
        status: "available",
      })
      .select()
      .single();

    if (insertError) {
      console.error("API POST /products: Lỗi chèn DB:", insertError);
      throw insertError;
    }

    console.log("API POST /products: Đăng bán thành công, ID:", data.id);
    return NextResponse.json(
      { product: data, message: "Đăng bán thành công!" },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("API POST /products: Lỗi bất ngờ:", error);
    let message = "Lỗi server khi đăng bán.";
    if (error instanceof Error) message = error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
