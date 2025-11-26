// src/app/api/admin/transactions/[id]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { parse as parseCookie } from "cookie";
import jwt from "jsonwebtoken";
import { createNotification } from "@/lib/notification"; // Import thông báo

export const runtime = "nodejs";

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
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  if (!JWT_SECRET) return false;
  try {
    let token: string | undefined;
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) token = parseCookie(cookieHeader)[COOKIE_NAME];
    if (!token) return false;
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded.role === "admin";
  } catch {
    return false;
  }
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  // 1. Check quyền Admin
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  const { id: transactionId } = await ctx.params;

  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Lỗi Admin Client");

    const { status: newStatus } = await request.json(); // 'completed' | 'cancelled'

    // 2. Lấy thông tin giao dịch hiện tại
    const { data: tx, error: fetchError } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (fetchError || !tx) {
      return NextResponse.json(
        { error: "Giao dịch không tồn tại" },
        { status: 404 }
      );
    }

    // Không cho phép sửa nếu đã hoàn tất/hủy (trừ khi cần fix lỗi)
    if (tx.status === "completed" || tx.status === "cancelled") {
      return NextResponse.json(
        { error: "Giao dịch này đã kết thúc." },
        { status: 400 }
      );
    }

    // ==========================================
    // LOGIC 1: XỬ LÝ HỦY ĐƠN (HOÀN TIỀN & KHO)
    // ==========================================
    if (newStatus === "cancelled") {
      // A. Hoàn tiền (Nếu đã thanh toán qua Ví)
      // Các trạng thái coi là "đã giữ tiền": buyer_paid, seller_shipped, buyer_confirmed, disputed
      const moneyHeldStatuses = [
        "buyer_paid",
        "seller_shipped",
        "buyer_confirmed",
        "disputed",
      ];

      if (
        tx.payment_method === "wallet" &&
        moneyHeldStatuses.includes(tx.status)
      ) {
        const { data: buyer } = await supabaseAdmin
          .from("users")
          .select("balance")
          .eq("id", tx.buyer_id)
          .single();

        if (buyer) {
          // Cộng lại tiền vào ví Buyer
          await supabaseAdmin
            .from("users")
            .update({ balance: Number(buyer.balance) + Number(tx.amount) })
            .eq("id", tx.buyer_id);

          // Ghi log hoàn tiền
          await supabaseAdmin.from("platform_payments").insert({
            user_id: tx.buyer_id,
            amount: Number(tx.amount),
            payment_for_type: "deposit", // Coi như tiền nạp lại (Refund)
            status: "succeeded",
            currency: "VND",
            related_id: transactionId,
          });
        }
      }

      // B. Hoàn lại tồn kho
      const orderQty = tx.quantity || 1;
      const { data: prod } = await supabaseAdmin
        .from("products")
        .select("quantity")
        .eq("id", tx.product_id)
        .single();

      if (prod) {
        await supabaseAdmin
          .from("products")
          .update({
            quantity: prod.quantity + orderQty,
            status: "available", // Mở bán lại
          })
          .eq("id", tx.product_id);
      }

      // C. Thông báo
      await createNotification(supabaseAdmin, {
        userId: tx.buyer_id,
        title: "🚫 Đơn hàng đã bị hủy",
        message: `Admin đã hủy đơn hàng và hoàn tiền (nếu có).`,
        type: "order",
        link: "/wallet",
      });
    }

    // ==========================================
    // LOGIC 2: XỬ LÝ HOÀN TẤT (CHUYỂN TIỀN CHO SELLER)
    // ==========================================
    else if (newStatus === "completed") {
      // Tính toán tiền
      const commission = Number(tx.amount) * 0.05; // Phí sàn 5% (Nên lấy từ settings)
      const netAmount = Number(tx.amount) - commission;

      // A. Cộng tiền vào ví Seller
      const { data: seller } = await supabaseAdmin
        .from("users")
        .select("balance")
        .eq("id", tx.seller_id)
        .single();

      if (seller) {
        await supabaseAdmin
          .from("users")
          .update({ balance: Number(seller.balance) + netAmount })
          .eq("id", tx.seller_id);

        // Ghi log tiền vào
        await supabaseAdmin.from("platform_payments").insert({
          user_id: tx.seller_id,
          amount: netAmount,
          payment_for_type: "deposit", // Doanh thu bán hàng
          status: "succeeded",
          currency: "VND",
          related_id: transactionId,
        });
      }

      // B. Cập nhật hoa hồng vào transaction
      await supabaseAdmin
        .from("transactions")
        .update({ platform_commission: commission })
        .eq("id", transactionId);

      // C. Thông báo
      await createNotification(supabaseAdmin, {
        userId: tx.seller_id,
        title: "💰 Giao dịch thành công",
        message: `Admin đã xử lý xong. Tiền đã về ví của bạn.`,
        type: "wallet",
        link: "/wallet",
      });
    }

    // 3. Cập nhật trạng thái cuối cùng
    const { data: updatedTx, error: updateError } = await supabaseAdmin
      .from("transactions")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(
      { transaction: updatedTx, message: "Cập nhật thành công!" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Admin Tx Error:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi server." },
      { status: 500 }
    );
  }
}
