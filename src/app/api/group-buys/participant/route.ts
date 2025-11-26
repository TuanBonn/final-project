// src/app/api/group-buys/participant/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createNotification } from "@/lib/notification";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = "auth-token";

// ... (Giữ nguyên các hàm helper getSupabaseAdmin, getUserId) ...
function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

import { parse as parseCookie } from "cookie";
import jwt from "jsonwebtoken";

interface JwtPayload {
  userId: string;
  [key: string]: unknown;
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

export async function PATCH(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();

  try {
    const { action, groupBuyId, targetUserId, reason } = await request.json(); // Thêm reason

    // Lấy thông tin Kèo
    const { data: gb } = await supabase
      .from("group_buys")
      .select("id, host_id, price_per_unit, product_name")
      .eq("id", groupBuyId)
      .single();

    if (!gb) return NextResponse.json({ error: "Kèo lỗi" }, { status: 404 });

    // === ACTION 1: HOST GỬI HÀNG ===
    if (action === "ship") {
      // ... (Giữ nguyên code cũ)
      if (gb.host_id !== userId)
        return NextResponse.json(
          { error: "Chỉ Host mới được gửi hàng" },
          { status: 403 }
        );
      await supabase
        .from("group_buy_participants")
        .update({ status: "shipped" })
        .eq("group_buy_id", groupBuyId)
        .eq("user_id", targetUserId);
      createNotification(supabase, {
        userId: targetUserId,
        title: "📦 Kèo mua chung đã gửi",
        message: `Host đã gửi hàng cho kèo "${gb.product_name}".`,
        type: "order",
        link: `/group-buys/${groupBuyId}`,
      });
      return NextResponse.json(
        { message: "Đã xác nhận gửi hàng." },
        { status: 200 }
      );
    }

    // === ACTION 2: KHÁCH XÁC NHẬN (PAYOUT) ===
    if (action === "confirm") {
      // ... (Giữ nguyên code cũ)
      const { data: part } = await supabase
        .from("group_buy_participants")
        .select("quantity, status")
        .eq("group_buy_id", groupBuyId)
        .eq("user_id", userId)
        .single();
      if (!part || part.status === "received")
        return NextResponse.json({ error: "Lỗi trạng thái" }, { status: 400 });

      await supabase
        .from("group_buy_participants")
        .update({ status: "received" })
        .eq("group_buy_id", groupBuyId)
        .eq("user_id", userId);

      const totalAmount = Number(gb.price_per_unit) * part.quantity;
      const commission = totalAmount * 0.02;
      const payout = totalAmount - commission;

      const { data: host } = await supabase
        .from("users")
        .select("balance")
        .eq("id", gb.host_id)
        .single();
      if (host) {
        await supabase
          .from("users")
          .update({ balance: Number(host.balance) + payout })
          .eq("id", gb.host_id);
        await supabase
          .from("platform_payments")
          .insert({
            user_id: gb.host_id,
            amount: payout,
            payment_for_type: "group_buy_payout",
            status: "succeeded",
            currency: "VND",
            related_id: groupBuyId,
          });
        createNotification(supabase, {
          userId: gb.host_id,
          title: "💰 Tiền về ví (Group Buy)",
          message: `Khách đã nhận hàng kèo "${gb.product_name}". +${payout} vào ví.`,
          type: "wallet",
          link: "/wallet",
        });
      }
      return NextResponse.json(
        { message: "Đã xác nhận nhận hàng!" },
        { status: 200 }
      );
    }

    // === ACTION 3: BÁO CÁO / YÊU CẦU HỦY (MỚI) ===
    if (action === "report") {
      if (!reason)
        return NextResponse.json(
          { error: "Vui lòng nhập lý do" },
          { status: 400 }
        );

      // 1. Lấy danh sách Admin
      const { data: admins } = await supabase
        .from("users")
        .select("id")
        .eq("role", "admin");

      if (admins && admins.length > 0) {
        // 2. Lấy thông tin người báo cáo
        const { data: reporter } = await supabase
          .from("users")
          .select("username")
          .eq("id", userId)
          .single();

        // 3. Gửi thông báo cho từng Admin
        for (const admin of admins) {
          await createNotification(supabase, {
            userId: admin.id,
            title: "🚨 Yêu cầu Hủy Kèo Mua Chung",
            message: `User @${reporter?.username} yêu cầu hủy kèo "${gb.product_name}". Lý do: "${reason}". Vui lòng kiểm tra.`,
            type: "system", // Hoặc 'admin_action'
            link: `/admin/group-buys`, // Dẫn Admin tới trang quản lý để xử lý
          });
        }
      }

      // (Tùy chọn) Có thể lưu vào bảng 'reports' riêng nếu muốn tracking kỹ hơn

      return NextResponse.json(
        {
          message:
            "Đã gửi báo cáo cho Admin. Ban quản trị sẽ xem xét sớm nhất.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
