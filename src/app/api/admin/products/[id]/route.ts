import { NextResponse, type NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
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

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const supabase = getSupabaseAdmin();

  try {
    const { status } = await request.json(); // Admin gửi: 'hidden' hoặc 'available' (để khôi phục)

    // 1. Lấy thông tin hiện tại để check số lượng (nếu cần khôi phục)
    const { data: product } = await supabase
      .from("products")
      .select("quantity")
      .eq("id", id)
      .single();

    if (!product)
      return NextResponse.json({ error: "Product not found" }, { status: 404 });

    let newStatus = status;

    // LOGIC KHÔI PHỤC THÔNG MINH
    if (status === "available") {
      // Nếu admin muốn khôi phục, kiểm tra kho:
      if (product.quantity > 0) {
        newStatus = "available";
      } else {
        newStatus = "sold"; // Hết hàng thì chỉ về Sold chứ không Available
      }
    }

    const { error } = await supabase
      .from("products")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json(
      { message: "Cập nhật trạng thái thành công", status: newStatus },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET (Giữ nguyên để lấy info nếu cần)
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  if (!(await verifyAdmin(request)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const supabase = getSupabaseAdmin();
  const { data: product } = await supabase
    .from("products")
    .select("*, brand:brands(name)")
    .eq("id", id)
    .single();
  return NextResponse.json({ product }, { status: 200 });
}
