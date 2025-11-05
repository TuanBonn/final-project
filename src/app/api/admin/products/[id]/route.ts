// // src/app/api/admin/products/[id]/route.ts
// // ĐÃ SỬA LỖI 1 (await params) VÀ LỖI 2 (bỏ updated_at)

// import { NextResponse, type NextRequest } from "next/server";
// import { createClient, SupabaseClient } from "@supabase/supabase-js";
// import { parse as parseCookie } from "cookie";
// import jwt from "jsonwebtoken";

// // Ghim vào Node.js runtime
// export const runtime = "nodejs";

// // --- Cấu hình ---
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
// const JWT_SECRET = process.env.JWT_SECRET;
// const COOKIE_NAME = "auth-token";

// interface JwtPayload {
//   role?: string;
//   [key: string]: unknown;
// }

// // --- Hàm khởi tạo Admin Client ---
// function getSupabaseAdmin(): SupabaseClient | null {
//   if (!supabaseUrl || !supabaseServiceKey) return null;
//   try {
//     return createClient(supabaseUrl, supabaseServiceKey, {
//       auth: { persistSession: false },
//     });
//   } catch (error) {
//     console.error("API Admin/Product/[id]: Lỗi tạo Admin Client:", error);
//     return null;
//   }
// }

// // --- Hàm xác thực Admin ---
// async function verifyAdmin(request: NextRequest): Promise<boolean> {
//   if (!JWT_SECRET) return false;
//   try {
//     let token: string | undefined = undefined;
//     const cookieHeader = request.headers.get("cookie");
//     if (cookieHeader) token = parseCookie(cookieHeader)[COOKIE_NAME];
//     if (!token) return false;
//     const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
//     return decoded.role === "admin";
//   } catch (error) {
//     return false;
//   }
// }

// // === HÀM PATCH (ĐÃ SỬA CẢ 2 LỖI) ===
// export async function PATCH(
//   request: NextRequest,
//   // === SỬA LỖI 1: Thêm Promise<> vào kiểu ===
//   ctx: { params: Promise<{ id: string }> }
// ) {
//   if (!(await verifyAdmin(request))) {
//     return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
//   }

//   // === SỬA LỖI 1: Thêm "await" khi lấy params ===
//   const { id: targetProductId } = await ctx.params;
//   // =============================================

//   if (!targetProductId) {
//     return NextResponse.json({ error: "Thiếu ID sản phẩm." }, { status: 400 });
//   }

//   try {
//     const supabaseAdmin = getSupabaseAdmin();
//     if (!supabaseAdmin) throw new Error("Lỗi Admin Client");

//     const body = await request.json();
//     const newStatus: "available" | "sold" = body.status;

//     if (!newStatus || !["available", "sold"].includes(newStatus)) {
//       return NextResponse.json(
//         { error: "Trạng thái cập nhật không hợp lệ." },
//         { status: 400 }
//       );
//     }

//     // === SỬA LỖI 2: Bỏ cột 'updated_at' ===
//     const { data: updatedProduct, error } = await supabaseAdmin
//       .from("products")
//       .update({ status: newStatus }) // <-- CHỈ CẬP NHẬT STATUS
//       .eq("id", targetProductId)
//       .select("id, name, status")
//       .single();
//     // ===================================

//     if (error) {
//       if (error.code === "PGRST116") {
//         return NextResponse.json(
//           { error: "Không tìm thấy sản phẩm." },
//           { status: 404 }
//         );
//       }
//       throw error;
//     }

//     return NextResponse.json(
//       { product: updatedProduct, message: "Cập nhật thành công!" },
//       { status: 200 }
//     );
//   } catch (error: unknown) {
//     console.error("API Admin/Product/[id] Lỗi 500:", error);
//     let message = "Lỗi server khi cập nhật sản phẩm.";
//     if (error instanceof Error) message = error.message;
//     return NextResponse.json({ error: message }, { status: 500 });
//   }
// }

// src/app/api/admin/products/[id]/route.ts
// Nâng cấp: Thêm GET (lấy 1) và mở rộng PATCH (sửa chi tiết)
// Đã sửa lỗi: await params, bỏ updated_at

import { NextResponse, type NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { parse as parseCookie } from "cookie";
import jwt from "jsonwebtoken";

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

// --- (Hàm getSupabaseAdmin và verifyAdmin...) ---
function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  try {
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
  } catch (error) {
    return null;
  }
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
  } catch (error) {
    return false;
  }
}

// === HÀM MỚI: GET (Lấy chi tiết 1 sản phẩm) ===
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  const { id: targetProductId } = await ctx.params;
  if (!targetProductId) {
    return NextResponse.json({ error: "Thiếu ID sản phẩm." }, { status: 400 });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Lỗi Admin Client");

    // Lấy product VÀ thông tin brand liên quan
    const { data: product, error } = await supabaseAdmin
      .from("products")
      .select(
        `
        id, name, description, price, condition, brand_id,
        brand:brands ( name )
      `
      )
      .eq("id", targetProductId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Không tìm thấy sản phẩm." },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({ product }, { status: 200 });
  } catch (error: unknown) {
    let message = "Lỗi server khi lấy chi tiết sản phẩm.";
    if (error instanceof Error) message = error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// === HÀM PATCH (Đã mở rộng + sửa lỗi) ===
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  const { id: targetProductId } = await ctx.params;
  if (!targetProductId) {
    return NextResponse.json({ error: "Thiếu ID sản phẩm." }, { status: 400 });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Lỗi Admin Client");

    const body = await request.json();

    // Biến để chứa data update
    let updateData: { [key: string]: any } = {};

    // 1. Nếu gửi 'status' (từ ProductActions)
    if (body.status && ["available", "sold"].includes(body.status)) {
      updateData.status = body.status;
    }
    // 2. Nếu gửi form edit (từ trang /edit)
    else {
      // (Bỏ image_urls, chỉ xử lý text)
      const { name, description, price, condition, brand_id } = body;

      if (!name || !price || !condition || !brand_id) {
        return NextResponse.json(
          { error: "Thiếu dữ liệu (tên, giá, tình trạng, brand)." },
          { status: 400 }
        );
      }
      updateData = {
        name,
        description,
        price,
        condition,
        brand_id,
      };
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Không có gì để cập nhật." },
        { status: 400 }
      );
    }

    // (Bỏ cột 'updated_at' vì schema không có)
    const { data: updatedProduct, error } = await supabaseAdmin
      .from("products")
      .update(updateData)
      .eq("id", targetProductId)
      .select("id, name, status") // Trả về data đơn giản
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Không tìm thấy sản phẩm." },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json(
      { product: updatedProduct, message: "Cập nhật thành công!" },
      { status: 200 }
    );
  } catch (error: unknown) {
    let message = "Lỗi server khi cập nhật sản phẩm.";
    if (error instanceof Error) message = error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
