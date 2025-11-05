// src/app/api/admin/products/[id]/route.ts
// SỬA LỖI: Dùng 'await ctx.params' cho CẢ GET và PATCH

import { NextResponse, type NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { parse as parseCookie } from "cookie";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

// --- Cấu hình (Giữ nguyên) ---
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
// -----------------------------------------------------------------

// === HÀM GET (ĐÃ SỬA LỖI 500) ===
export async function GET(
  request: NextRequest,
  // === SỬA LỖI 1: Dùng lại chữ ký (signature) CŨ của bạn ===
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  // === SỬA LỖI 2: Thêm "await" lại ===
  const { id: targetProductId } = await ctx.params;
  // ===================================

  if (!targetProductId) {
    return NextResponse.json({ error: "Thiếu ID sản phẩm." }, { status: 400 });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Lỗi Admin Client");

    // Query (Giữ nguyên)
    const { data: product, error } = await supabaseAdmin
      .from("products")
      .select(
        `
        id, name, description, price, condition, brand_id,
        image_urls,
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
    console.error("API Admin/Product GET [id] Error:", error);
    let message = "Lỗi server khi lấy chi tiết sản phẩm.";
    if (error instanceof Error) message = error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// === HÀM PATCH (Giữ nguyên, không thay đổi) ===
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
    let updateData: { [key: string]: any } = {};

    if (body.status && ["available", "sold"].includes(body.status)) {
      updateData.status = body.status;
    } else {
      const { name, description, price, condition, brand_id, image_urls } =
        body;
      if (!name || !price || !condition || !brand_id) {
        return NextResponse.json(
          { error: "Thiếu dữ liệu (tên, giá, tình trạng, brand)." },
          { status: 400 }
        );
      }
      updateData = { name, description, price, condition, brand_id };
      if (image_urls && Array.isArray(image_urls)) {
        updateData.image_urls = image_urls;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Không có gì để cập nhật." },
        { status: 400 }
      );
    }

    const { data: updatedProduct, error } = await supabaseAdmin
      .from("products")
      .update(updateData)
      .eq("id", targetProductId)
      .select("id, name, status")
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
    console.error("API Admin/Product PATCH [id] Error:", error);
    let message = "Lỗi server khi cập nhật sản phẩm.";
    if (error instanceof Error) message = error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
