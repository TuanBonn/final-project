// src/app/api/admin/products/[id]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parse as parseCookie } from "cookie";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = "auth-token";

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  if (!JWT_SECRET) return false;
  try {
    const cookieHeader = request.headers.get("cookie");
    if (!cookieHeader) return false;
    const token = parseCookie(cookieHeader)[COOKIE_NAME];
    if (!token) return false;
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded.role === "admin";
  } catch {
    return false;
  }
}

// === GET: Lấy chi tiết sản phẩm (MỚI THÊM) ===
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  // 1. Check quyền Admin
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const supabase = getSupabaseAdmin();

  try {
    const { data: product, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !product) {
      return NextResponse.json(
        { error: "Sản phẩm không tồn tại" },
        { status: 404 }
      );
    }

    return NextResponse.json({ product }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// === PATCH: Sửa / Khôi phục / Gỡ ẩn sản phẩm ===
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  // 1. Check quyền Admin
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();

    // 2. Kiểm tra sản phẩm hiện tại
    const { data: currentProduct, error: fetchError } = await supabase
      .from("products")
      .select("status")
      .eq("id", id)
      .single();

    if (fetchError || !currentProduct) {
      return NextResponse.json(
        { error: "Sản phẩm không tồn tại" },
        { status: 404 }
      );
    }

    // 3. CHẶN SỬA/KHÔI PHỤC NẾU LÀ 'AUCTION'
    if (currentProduct.status === "auction") {
      return NextResponse.json(
        {
          error:
            "Không thể chỉnh sửa hay khôi phục sản phẩm đang thuộc biên chế Đấu giá (Locked).",
        },
        { status: 403 }
      );
    }

    // 4. Nếu không phải auction, cho phép update (VD: set status = 'available' hoặc sửa tên, giá...)
    const { error } = await supabase.from("products").update(body).eq("id", id);

    if (error) throw error;

    return NextResponse.json(
      { message: "Cập nhật thành công" },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
