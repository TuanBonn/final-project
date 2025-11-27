// src/app/api/orders/[id]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { parse as parseCookie } from "cookie";
import jwt from "jsonwebtoken";
import { createNotification } from "@/lib/notification";

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

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();

  try {
    const { action } = await request.json(); // 'cancel', 'ship', 'confirm', 'dispute'

    // Lấy thông tin đơn hàng
    const { data: order } = await supabase
      .from("transactions")
      .select("*, product:products(name)")
      .eq("id", id)
      .single();

    if (!order)
      return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // === 1. XỬ LÝ HỦY ĐƠN (CANCEL) ===
    if (action === "cancel") {
      if (order.buyer_id !== userId) {
        return NextResponse.json(
          { error: "Chỉ người mua mới được hủy đơn." },
          { status: 403 }
        );
      }

      // CHẶN HỦY NẾU LÀ ĐẤU GIÁ HOẶC GROUP BUY
      if (order.auction_id || order.group_buy_id) {
        return NextResponse.json(
          {
            error:
              "Không thể hủy đơn hàng Đấu giá hoặc Mua chung đã chốt. Vui lòng liên hệ người bán để thương lượng.",
          },
          { status: 403 }
        );
      }

      if (order.status !== "initiated" && order.status !== "buyer_paid") {
        return NextResponse.json(
          { error: "Không thể hủy đơn hàng này." },
          { status: 400 }
        );
      }

      // Hoàn tiền nếu đã thanh toán
      if (order.status === "buyer_paid" && order.payment_method === "wallet") {
        const { data: buyer } = await supabase
          .from("users")
          .select("balance")
          .eq("id", userId)
          .single();
        if (buyer) {
          await supabase
            .from("users")
            .update({ balance: Number(buyer.balance) + Number(order.amount) })
            .eq("id", userId);
          await supabase.from("platform_payments").insert({
            user_id: userId,
            amount: order.amount,
            payment_for_type: "withdrawal", // Refund
            status: "succeeded",
            currency: "VND",
            related_id: id,
          });
        }
      }

      // Cộng lại kho
      if (order.product_id) {
        const { data: prod } = await supabase
          .from("products")
          .select("quantity")
          .eq("id", order.product_id)
          .single();
        if (prod) {
          await supabase
            .from("products")
            .update({ quantity: prod.quantity + (order.quantity || 1) })
            .eq("id", order.product_id);
        }
      }

      await supabase
        .from("transactions")
        .update({ status: "cancelled" })
        .eq("id", id);

      createNotification(supabase, {
        userId: order.seller_id,
        title: "Đơn hàng bị hủy",
        message: `Khách hàng đã hủy đơn "${order.product?.name}".`,
        type: "order",
        link: "/orders?type=sell",
      });

      return NextResponse.json(
        { message: "Đã hủy đơn hàng thành công." },
        { status: 200 }
      );
    }

    // === 2. XỬ LÝ GỬI HÀNG (SHIP) - CHO SELLER ===
    if (action === "ship") {
      if (order.seller_id !== userId)
        return NextResponse.json(
          { error: "Quyền người bán." },
          { status: 403 }
        );

      await supabase
        .from("transactions")
        .update({ status: "seller_shipped" })
        .eq("id", id);

      createNotification(supabase, {
        userId: order.buyer_id,
        title: "📦 Đơn hàng đang được giao",
        message: `Shop đã gửi đơn hàng "${order.product?.name}". Vui lòng chú ý điện thoại.`,
        type: "order",
        link: "/orders",
      });

      return NextResponse.json(
        { message: "Đã xác nhận gửi hàng." },
        { status: 200 }
      );
    }

    // === 3. XỬ LÝ NHẬN HÀNG (CONFIRM) - CHO BUYER ===
    if (action === "confirm") {
      if (order.buyer_id !== userId)
        return NextResponse.json(
          { error: "Quyền người mua." },
          { status: 403 }
        );
      if (order.status !== "seller_shipped")
        return NextResponse.json(
          { error: "Trạng thái không hợp lệ" },
          { status: 400 }
        );

      // Trả tiền cho Seller (Trừ phí sàn)
      const commissionRate = 0.05; // 5%
      const commission = Number(order.amount) * commissionRate;
      const netIncome = Number(order.amount) - commission;

      const { data: seller } = await supabase
        .from("users")
        .select("balance")
        .eq("id", order.seller_id)
        .single();
      if (seller) {
        await supabase
          .from("users")
          .update({ balance: Number(seller.balance) + netIncome })
          .eq("id", order.seller_id);

        await supabase.from("platform_payments").insert({
          user_id: order.seller_id,
          amount: netIncome,
          payment_for_type: "deposit", // Doanh thu bán hàng
          status: "succeeded",
          currency: "VND",
          related_id: id,
        });
      }

      await supabase
        .from("transactions")
        .update({
          status: "completed",
          platform_commission: commission,
        })
        .eq("id", id);

      createNotification(supabase, {
        userId: order.seller_id,
        title: "💰 Đơn hàng hoàn tất",
        message: `Khách đã nhận đơn "${order.product?.name}". +${netIncome} vào ví.`,
        type: "wallet",
        link: "/wallet",
      });

      // Nếu đây là đơn Group Buy -> Kiểm tra để update Group Buy thành completed (Optional, vì API group buy đã handle)
      // Nhưng tốt nhất API orders chỉ nên lo transaction.

      return NextResponse.json(
        { message: "Đã xác nhận nhận hàng!" },
        { status: 200 }
      );
    }

    // === 4. KHIẾU NẠI (DISPUTE) ===
    if (action === "dispute") {
      await supabase
        .from("transactions")
        .update({ status: "disputed" })
        .eq("id", id);
      return NextResponse.json(
        { message: "Đã gửi khiếu nại. Admin sẽ xem xét." },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
