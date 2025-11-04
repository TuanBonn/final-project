// src/app/api/admin/products/[id]/route.ts
// ĐÃ SỬA LỖI 1 (await params) VÀ LỖI 2 (bỏ updated_at)

import { NextResponse, type NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { parse as parseCookie } from "cookie";
import jwt from "jsonwebtoken";

// Ghim vào Node.js runtime
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

// --- Hàm khởi tạo Admin Client ---
function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  try {
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
  } catch (error) {
    console.error("API Admin/Product/[id]: Lỗi tạo Admin Client:", error);
    return null;
  }
}

// --- Hàm xác thực Admin ---
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

// === HÀM PATCH (ĐÃ SỬA CẢ 2 LỖI) ===
export async function PATCH(
  request: NextRequest,
  // === SỬA LỖI 1: Thêm Promise<> vào kiểu ===
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  // === SỬA LỖI 1: Thêm "await" khi lấy params ===
  const { id: targetProductId } = await ctx.params;
  // =============================================

  if (!targetProductId) {
    return NextResponse.json({ error: "Thiếu ID sản phẩm." }, { status: 400 });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Lỗi Admin Client");

    const body = await request.json();
    const newStatus: "available" | "sold" = body.status;

    if (!newStatus || !["available", "sold"].includes(newStatus)) {
      return NextResponse.json(
        { error: "Trạng thái cập nhật không hợp lệ." },
        { status: 400 }
      );
    }

    // === SỬA LỖI 2: Bỏ cột 'updated_at' ===
    const { data: updatedProduct, error } = await supabaseAdmin
      .from("products")
      .update({ status: newStatus }) // <-- CHỈ CẬP NHẬT STATUS
      .eq("id", targetProductId)
      .select("id, name, status")
      .single();
    // ===================================

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
    console.error("API Admin/Product/[id] Lỗi 500:", error);
    let message = "Lỗi server khi cập nhật sản phẩm.";
    if (error instanceof Error) message = error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
