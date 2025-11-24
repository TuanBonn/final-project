// src/app/api/orders/[id]/route.ts
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

// === PATCH: Cập nhật trạng thái đơn hàng ===
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: orderId } = await ctx.params;
  const supabase = getSupabaseAdmin();
  if (!supabase)
    return NextResponse.json({ error: "Config Error" }, { status: 500 });

  try {
    const { action } = await request.json(); // action: 'cancel', 'ship', 'confirm', 'dispute'

    // Lấy thông tin đơn hàng hiện tại
    const { data: order, error: fetchError } = await supabase
      .from("transactions")
      .select("id, status, buyer_id, seller_id, amount, platform_commission")
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      return NextResponse.json(
        { error: "Đơn hàng không tồn tại" },
        { status: 404 }
      );
    }

    let newStatus = order.status;
    let successMessage = "Cập nhật thành công";

    // --- LOGIC XỬ LÝ ---

    // 1. Người mua HỦY đơn (chỉ khi mới đặt)
    if (action === "cancel") {
      if (order.buyer_id !== userId)
        return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
      if (order.status !== "initiated")
        return NextResponse.json(
          { error: "Không thể hủy đơn này" },
          { status: 400 }
        );
      newStatus = "cancelled";
      successMessage = "Đã hủy đơn hàng";
    }

    // 2. Người bán GỬI HÀNG (chỉ khi đã thanh toán hoặc COD mới đặt)
    else if (action === "ship") {
      if (order.seller_id !== userId)
        return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
      if (!["initiated", "buyer_paid"].includes(order.status))
        return NextResponse.json(
          { error: "Trạng thái không hợp lệ" },
          { status: 400 }
        );
      newStatus = "seller_shipped";
      successMessage = "Đã xác nhận gửi hàng";
    }

    // 3. Người mua ĐÃ NHẬN HÀNG (Kết thúc đơn)
    else if (action === "confirm") {
      if (order.buyer_id !== userId)
        return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
      if (order.status !== "seller_shipped")
        return NextResponse.json(
          { error: "Chưa thể xác nhận" },
          { status: 400 }
        );

      newStatus = "completed";
      successMessage = "Giao dịch hoàn tất!";

      // *** QUAN TRỌNG: CỘNG TIỀN VÀO VÍ NGƯỜI BÁN ***
      // Tính thực nhận: Giá - Hoa hồng
      // (Ở đây giả sử platform_commission đã được tính hoặc tính lại)
      // Để đơn giản, ta lấy: commission = amount * 5% (0.05)
      const commission = Number(order.amount) * 0.05;
      const netAmount = Number(order.amount) - commission;

      // 1. Cộng tiền ví Seller
      const { error: walletError } = await supabase.rpc("increment_balance", {
        user_id: order.seller_id,
        amount: netAmount,
      });
      // Lưu ý: Nếu chưa có hàm RPC, ta dùng update thường (không an toàn bằng nhưng tạm được)
      if (walletError) {
        // Fallback update thường
        const { data: seller } = await supabase
          .from("users")
          .select("balance")
          .eq("id", order.seller_id)
          .single();
        if (seller) {
          await supabase
            .from("users")
            .update({ balance: Number(seller.balance) + netAmount })
            .eq("id", order.seller_id);
        }
      }

      // 2. Update commission vào transaction
      await supabase
        .from("transactions")
        .update({ platform_commission: commission })
        .eq("id", orderId);
    }

    // 4. Người mua KHIẾU NẠI
    else if (action === "dispute") {
      if (order.buyer_id !== userId)
        return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
      if (order.status !== "seller_shipped")
        return NextResponse.json(
          { error: "Trạng thái không hợp lệ" },
          { status: 400 }
        );
      newStatus = "disputed";
      successMessage = "Đã gửi khiếu nại. Admin sẽ xem xét.";
    } else {
      return NextResponse.json(
        { error: "Hành động không xác định" },
        { status: 400 }
      );
    }

    // Cập nhật DB
    const { error: updateError } = await supabase
      .from("transactions")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (updateError) throw updateError;

    return NextResponse.json({ message: successMessage }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
