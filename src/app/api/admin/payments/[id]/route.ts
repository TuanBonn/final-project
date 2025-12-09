// src/app/api/admin/payments/[id]/route.ts
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
  const { id } = await ctx.params;

  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  const { status } = await request.json(); // status: 'succeeded' | 'failed'

  if (!["succeeded", "failed"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    // 1. Lấy thông tin giao dịch hiện tại
    const { data: payment } = await supabase
      .from("platform_payments")
      .select("*")
      .eq("id", id)
      .single();

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending payments can be updated." },
        { status: 400 }
      );
    }

    const userId = payment.user_id;
    const amount = Number(payment.amount);

    // 2. Xử lý Logic cộng/trừ tiền theo loại giao dịch
    // === TRƯỜNG HỢP DUYỆT (APPROVE / SUCCEEDED) ===
    if (status === "succeeded") {
      if (payment.payment_for_type === "deposit") {
        // Nạp tiền thành công -> Cộng tiền vào ví
        const { data: user } = await supabase
          .from("users")
          .select("balance")
          .eq("id", userId)
          .single();

        if (user) {
          await supabase
            .from("users")
            .update({ balance: Number(user.balance) + amount })
            .eq("id", userId);
        }
      }
      // Nếu là withdrawal: Tiền đã trừ lúc tạo lệnh, nên duyệt chỉ là đổi status, không cần trừ thêm.
    }

    // === TRƯỜNG HỢP HỦY (REJECT / FAILED) ===
    if (status === "failed") {
      if (payment.payment_for_type === "withdrawal") {
        // Rút tiền thất bại (Admin từ chối) -> Hoàn tiền lại vào ví
        const { data: user } = await supabase
          .from("users")
          .select("balance")
          .eq("id", userId)
          .single();

        if (user) {
          await supabase
            .from("users")
            .update({ balance: Number(user.balance) + amount })
            .eq("id", userId);
        }
      }
      // Nếu là deposit: Hủy lệnh nạp thì không làm gì cả (vì chưa cộng tiền).
    }

    // 3. Cập nhật trạng thái Payment
    const { error: updateError } = await supabase
      .from("platform_payments")
      .update({ status })
      .eq("id", id);

    if (updateError) throw updateError;

    // 4. Gửi thông báo cho User
    const title =
      status === "succeeded"
        ? "✅ Giao dịch thành công"
        : "❌ Giao dịch thất bại";
    const message =
      status === "succeeded"
        ? `Yêu cầu ${
            payment.payment_for_type
          } ${amount.toLocaleString()} VND đã được duyệt.`
        : `Yêu cầu ${
            payment.payment_for_type
          } ${amount.toLocaleString()} VND đã bị từ chối/hủy.`;

    await createNotification(supabase, {
      userId: userId,
      title,
      message,
      type: "wallet",
      link: "/wallet",
    });

    return NextResponse.json({ message: "Update success" }, { status: 200 });
  } catch (error: any) {
    console.error("Update Payment Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
