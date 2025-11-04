// src/app/api/admin/products/route.ts
// API route này cho phép Admin lấy TẤT CẢ sản phẩm (kể cả đã bán) + tìm kiếm

import { NextResponse, type NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { parse as parseCookie } from "cookie";
import jwt from "jsonwebtoken";

// Ghim vào Node.js runtime để đọc được .env
export const runtime = "nodejs";

// --- Cấu hình ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = "auth-token";

interface JwtPayload {
  role?: string;
  [key: string]: unknown;
}

// --- Hàm khởi tạo Admin Client (Dùng Service Key) ---
function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("API Admin/Products: Thiếu Supabase URL hoặc Service Key!");
    return null;
  }
  try {
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
  } catch (error) {
    console.error("API Admin/Products: Lỗi tạo Admin Client:", error);
    return null;
  }
}

// --- Hàm xử lý GET (Lấy danh sách sản phẩm) ---
export async function GET(request: NextRequest) {
  // 1. Kiểm tra cấu hình
  if (!JWT_SECRET) {
    return NextResponse.json(
      { error: "Lỗi cấu hình server." },
      { status: 500 }
    );
  }

  // 2. Xác thực Admin (Đọc cookie thủ công)
  try {
    let token: string | undefined = undefined;
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const cookies = parseCookie(cookieHeader);
      token = cookies[COOKIE_NAME];
    }
    if (!token)
      return NextResponse.json({ error: "Yêu cầu xác thực." }, { status: 401 });

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (decoded.role !== "admin") {
      return NextResponse.json(
        { error: "Không có quyền truy cập." },
        { status: 403 }
      );
    }
  } catch (error) {
    return NextResponse.json({ error: "Token không hợp lệ." }, { status: 401 });
  }

  // 3. Lấy dữ liệu (Dùng Admin Client)
  try {
    const search = request.nextUrl.searchParams.get("search");
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Lỗi khởi tạo Admin Client");

    let query = supabaseAdmin.from("products").select(
      `
        id, name, price, status, created_at,
        seller:users!seller_id ( username ) 
      `
    );

    // Lọc (Filter)
    if (search) {
      console.log(`API Admin/Products: Đang tìm kiếm với: "${search}"`);
      // Tìm theo tên sản phẩm
      query = query.ilike("name", `%${search}%`);
      // (Bạn có thể thêm tìm theo tên người bán nếu muốn, nhưng sẽ phức tạp hơn)
    }

    // Sắp xếp (Order)
    query = query.order("created_at", { ascending: false });

    const { data: products, error } = await query;
    if (error) {
      console.error("API Admin/Products: Lỗi query DB:", error);
      throw error;
    }

    return NextResponse.json({ products: products || [] }, { status: 200 });
  } catch (error: unknown) {
    console.error("API Admin/Products: Lỗi bất ngờ:", error);
    let message = "Lỗi server khi lấy danh sách sản phẩm.";
    if (error instanceof Error) message = error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
