// src/app/api/products/[id]/route.ts
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

function getSupabaseAdmin() {
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

// === GET: Lấy chi tiết ===
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getUserId(request);

  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    if (product.seller_id !== userId) {
      return NextResponse.json(
        { error: "Bạn không có quyền xem/sửa sản phẩm này." },
        { status: 403 }
      );
    }

    return NextResponse.json({ product }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// === PATCH: Cập nhật sản phẩm (LOGIC QUAN TRỌNG Ở ĐÂY) ===
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getUserId(request);

  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();
    // Destructure các trường có thể update
    const { name, description, price, quantity, condition, imageUrls, status } =
      body;

    // 1. Lấy sản phẩm hiện tại để check quyền và lấy số lượng cũ
    const { data: existingProduct } = await supabase
      .from("products")
      .select("seller_id, status, quantity")
      .eq("id", id)
      .single();

    if (!existingProduct)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existingProduct.seller_id !== userId)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (existingProduct.status === "auction")
      return NextResponse.json(
        { error: "Hàng đấu giá không được sửa." },
        { status: 400 }
      );

    // 2. Chuẩn bị dữ liệu update
    const updateData: any = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (price) updateData.price = Number(price);
    if (condition) updateData.condition = condition;
    if (imageUrls) updateData.image_urls = imageUrls;

    // Logic đặc biệt cho Status và Quantity
    let newQuantity = existingProduct.quantity;
    if (quantity !== undefined) {
      newQuantity = Number(quantity);
      updateData.quantity = newQuantity;
    }

    // Ưu tiên logic tự động, sau đó mới xét đến status người dùng gửi
    let newStatus = status || existingProduct.status;

    // === LOGIC TỰ ĐỘNG CHUYỂN TRẠNG THÁI ===
    if (newQuantity === 0) {
      // Hết hàng -> Bắt buộc ẩn (Sold)
      newStatus = "sold";
    } else if (newQuantity > 0) {
      // Còn hàng
      if (existingProduct.quantity === 0) {
        // Nếu đang từ 0 lên >0 -> Tự động mở lại (Available)
        newStatus = "available";
      }
      // Nếu người dùng CHỦ ĐỘNG gửi status='available' -> OK
      // Nếu người dùng CHỦ ĐỘNG gửi status='sold' -> OK (ẩn hàng còn kho)
    }

    // Gán status cuối cùng
    updateData.status = newStatus;
    // ========================================

    const { error: updateError } = await supabase
      .from("products")
      .update(updateData)
      .eq("id", id);

    if (updateError) throw updateError;

    return NextResponse.json(
      { message: "Cập nhật thành công!", status: newStatus },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// === DELETE: Xóa sản phẩm ===
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();

  try {
    const { data: prod } = await supabase
      .from("products")
      .select("seller_id, status")
      .eq("id", id)
      .single();

    if (!prod)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (prod.seller_id !== userId)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (prod.status === "auction")
      return NextResponse.json(
        { error: "Không thể xóa sản phẩm đấu giá" },
        { status: 400 }
      );

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      if (error.code === "23503") {
        // Foreign key constraint -> Chuyển sang sold
        await supabase.from("products").update({ status: "sold" }).eq("id", id);
        return NextResponse.json(
          {
            message:
              "Sản phẩm đã có giao dịch nên được chuyển sang 'Đã bán' thay vì xóa.",
          },
          { status: 200 }
        );
      }
      throw error;
    }

    return NextResponse.json({ message: "Đã xóa sản phẩm." }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
