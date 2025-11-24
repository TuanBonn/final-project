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

function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) return null;
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

export async function POST(request: NextRequest) {
  try {
    const buyerId = await getUserId(request);
    if (!buyerId) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để mua hàng." },
        { status: 401 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Lỗi cấu hình server.");

    const { productId, paymentMethod, quantity } = await request.json();
    const buyQty = quantity ? parseInt(quantity) : 1;

    if (!productId || !paymentMethod) {
      return NextResponse.json(
        { error: "Thiếu thông tin đơn hàng." },
        { status: 400 }
      );
    }
    if (buyQty < 1) {
      return NextResponse.json(
        { error: "Số lượng không hợp lệ." },
        { status: 400 }
      );
    }

    // 1. Lấy thông tin sản phẩm (bao gồm số lượng tồn kho)
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, price, status, seller_id, name, quantity")
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
        { error: "Sản phẩm này đã ngừng bán." },
        { status: 409 }
      );
    }

    if (product.seller_id === buyerId) {
      return NextResponse.json(
        { error: "Bạn không thể tự mua hàng của chính mình." },
        { status: 400 }
      );
    }

    // 2. Kiểm tra tồn kho
    if (product.quantity < buyQty) {
      return NextResponse.json(
        { error: `Sản phẩm chỉ còn lại ${product.quantity} món.` },
        { status: 409 }
      );
    }

    // 3. Tính toán tồn kho mới
    const newStock = product.quantity - buyQty;
    let newStatus = "available";
    if (newStock === 0) {
      newStatus = "sold"; // Hết hàng -> Chuyển trạng thái sold (ẩn khỏi list available)
    }

    // 4. Tạo Giao dịch
    const { data: transaction, error: txError } = await supabaseAdmin
      .from("transactions")
      .insert({
        product_id: productId,
        buyer_id: buyerId,
        seller_id: product.seller_id,
        amount: Number(product.price) * buyQty, // Tổng tiền = Giá * Số lượng
        status: "initiated",
        payment_method: paymentMethod,
        quantity: buyQty, // Lưu số lượng mua vào đơn hàng
        platform_commission: 0,
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

    // 5. Trừ tồn kho (Cập nhật Product)
    const { error: updateError } = await supabaseAdmin
      .from("products")
      .update({
        quantity: newStock,
        status: newStatus,
      })
      .eq("id", productId);

    if (updateError) {
      console.error("Lỗi cập nhật kho:", updateError);
      // Lưu ý: Ở đây nếu lỗi update kho thì đơn hàng đã tạo rồi -> Có thể gây sai lệch
      // Trong production nên dùng RPC function để wrap cả 2 lệnh này trong 1 transaction database.
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
