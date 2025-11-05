// src/app/api/admin/brands/[id]/route.ts
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

// === HÀM PATCH (Sửa tên brand) ===
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  const { id: targetBrandId } = await ctx.params;
  if (!targetBrandId) {
    return NextResponse.json({ error: "Thiếu ID brand." }, { status: 400 });
  }

  try {
    const { name } = await request.json();
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Tên brand là bắt buộc." },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Lỗi Admin Client");

    const { data, error } = await supabaseAdmin
      .from("brands")
      .update({ name: name.trim() })
      .eq("id", targetBrandId)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: `Tên brand "${name}" đã tồn tại.` },
          { status: 409 }
        );
      }
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Không tìm thấy brand." },
          { status: 404 }
        );
      }
      throw error;
    }
    return NextResponse.json(
      { brand: data, message: "Cập nhật thành công!" },
      { status: 200 }
    );
  } catch (error: unknown) {
    let message = "Lỗi server khi sửa brand.";
    if (error instanceof Error) message = error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// === HÀM DELETE (Xóa brand) ===
export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  const { id: targetBrandId } = await ctx.params;
  if (!targetBrandId) {
    return NextResponse.json({ error: "Thiếu ID brand." }, { status: 400 });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Lỗi Admin Client");

    const { error } = await supabaseAdmin
      .from("brands")
      .delete()
      .eq("id", targetBrandId);

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Không tìm thấy brand." },
          { status: 404 }
        );
      }
      throw error;
    }
    return NextResponse.json(
      { message: "Xóa brand thành công!" },
      { status: 200 }
    );
  } catch (error: unknown) {
    let message = "Lỗi server khi xóa brand.";
    if (error instanceof Error) message = error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
