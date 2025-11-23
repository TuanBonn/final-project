// src/app/api/transactions/route.ts
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

// Dùng Admin Client để có quyền ghi vào bảng Transaction và sửa Product
function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

// Xác thực người mua
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

export async function POST(request: NextRequest) {
  try {
    // 1. Xác thực người mua
    const buyerId = await getUserId(request);
    if (!buyerId) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để mua hàng." },
        { status: 401 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Lỗi cấu hình server.");

    const { productId, paymentMethod } = await request.json();

    if (!productId || !paymentMethod) {
      return NextResponse.json(
        { error: "Thiếu thông tin đơn hàng." },
        { status: 400 }
      );
    }

    // 2. Kiểm tra sản phẩm có còn "available" không
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, price, status, seller_id, name")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: "Sản phẩm không tồn tại." },
        { status: 404 }
      );
    }

    if (product.status !== "available") {
      return NextResponse.json(
        { error: "Sản phẩm này đã được bán hoặc đang giao dịch." },
        { status: 409 }
      );
    }

    if (product.seller_id === buyerId) {
      return NextResponse.json(
        { error: "Bạn không thể tự mua hàng của chính mình." },
        { status: 400 }
      );
    }

    // 3. Tạo Giao dịch & Cập nhật Sản phẩm (Nên dùng RPC hoặc transaction nếu Supabase hỗ trợ, ở đây ta làm tuần tự)
    // Bước A: Tạo Transaction
    const { data: transaction, error: txError } = await supabaseAdmin
      .from("transactions")
      .insert({
        product_id: productId,
        buyer_id: buyerId,
        seller_id: product.seller_id,
        amount: product.price,
        status: "initiated", // Khởi tạo
        payment_method: paymentMethod,
        platform_commission: 0, // Sẽ tính sau khi hoàn thành
      })
      .select()
      .single();

    if (txError) {
      console.error("Lỗi tạo transaction:", txError);
      return NextResponse.json(
        { error: "Không thể tạo đơn hàng." },
        { status: 500 }
      );
    }

    // Bước B: Cập nhật trạng thái sản phẩm -> in_transaction
    const { error: updateError } = await supabaseAdmin
      .from("products")
      .update({ status: "in_transaction" })
      .eq("id", productId);

    if (updateError) {
      // Nếu lỗi update product, lẽ ra nên rollback transaction (nhưng ở mức đơn giản này ta log lại để xử lý sau)
      console.error("Lỗi cập nhật trạng thái sản phẩm:", updateError);
    }

    return NextResponse.json(
      {
        message: "Đặt hàng thành công!",
        transactionId: transaction.id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("API Transaction Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
