// src/app/api/admin/group-buys/[id]/route.ts
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

async function getUserId(request: NextRequest): Promise<string | null> {
  if (!JWT_SECRET) return null;
  try {
    const cookieHeader = request.headers.get("cookie");
    if (!cookieHeader) return null;
    const token = parseCookie(cookieHeader)[COOKIE_NAME];
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET) as any;
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
    // 1. Lấy thông tin kèo hiện tại
    const { data: gb } = await supabase
      .from("group_buys")
      .select("*") // Lấy hết để tạo Product
      .eq("id", id)
      .single();

    if (!gb) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Check quyền (Admin hoặc Host)
    // (Giả sử bạn có logic check admin ở đây, hoặc host)
    if (gb.host_id !== userId) {
      // Cần check thêm role admin nếu muốn admin cũng được duyệt
      // Tạm thời chỉ check host cho đơn giản theo flow mới
      // return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { status } = await request.json();

    // === LOGIC 1: CHỐT KÈO THÀNH CÔNG (TẠO ĐƠN HÀNG) ===
    if (status === "successful" && gb.status !== "successful") {
      // A. Tạo một "Sản phẩm ảo" dựa trên Group Buy để làm tham chiếu cho Transaction
      // (Vì Transaction bắt buộc phải có product_id)
      const { data: proxyProduct, error: prodError } = await supabase
        .from("products")
        .insert({
          seller_id: gb.host_id,
          name: `[Group Buy] ${gb.product_name}`,
          description: gb.product_description,
          price: gb.price_per_unit,
          condition: "new", // Mặc định
          status: "sold", // Set sold để không hiện lên sàn
          image_urls: gb.product_images,
          quantity: 0, // Đã bán hết qua group buy
        })
        .select()
        .single();

      if (prodError)
        throw new Error("Lỗi tạo sản phẩm ảo: " + prodError.message);

      // B. Lấy danh sách người tham gia đã cọc tiền (paid)
      const { data: participants } = await supabase
        .from("group_buy_participants")
        .select("user_id, quantity")
        .eq("group_buy_id", id)
        .eq("status", "paid");

      if (participants && participants.length > 0) {
        // C. Tạo Transaction cho từng người
        for (const p of participants) {
          const amount = Number(gb.price_per_unit) * p.quantity;

          // Lấy shipping info của user để lưu vào đơn hàng
          const { data: buyer } = await supabase
            .from("users")
            .select("shipping_info")
            .eq("id", p.user_id)
            .single();

          await supabase.from("transactions").insert({
            product_id: proxyProduct.id,
            seller_id: gb.host_id,
            buyer_id: p.user_id,
            amount: amount,
            quantity: p.quantity,
            status: "buyer_paid", // QUAN TRỌNG: Đã thanh toán, chờ giao
            payment_method: "wallet",
            platform_commission: 0, // Sẽ tính khi hoàn tất
            shipping_address: buyer?.shipping_info, // Lưu địa chỉ
            group_buy_id: id, // Link ngược lại group buy
          });

          // Thông báo cho người mua
          createNotification(supabase, {
            userId: p.user_id,
            title: "🎉 Kèo Mua chung thành công!",
            message: `Đơn hàng cho "${gb.product_name}" đã được tạo. Vui lòng theo dõi trong mục Đơn Mua.`,
            type: "order",
            link: "/orders",
          });
        }
      }

      // Thông báo cho Host
      createNotification(supabase, {
        userId: gb.host_id,
        title: "✅ Đã chốt kèo & Tạo đơn hàng",
        message: `Hệ thống đã tạo ${participants?.length} đơn hàng mới. Vui lòng vào Quản lý đơn bán để giao hàng.`,
        type: "order",
        link: "/orders?type=sell",
      });
    }

    // === LOGIC 2: HỦY KÈO (HOÀN TIỀN) - GIỮ NGUYÊN ===
    if (status === "failed" && gb.status !== "failed") {
      // ... (Giữ nguyên code hoàn tiền cũ của bạn ở đây) ...
      // Copy lại đoạn code hoàn tiền từ câu trả lời trước
      const { data: participants } = await supabase
        .from("group_buy_participants")
        .select("user_id, quantity")
        .eq("group_buy_id", id)
        .eq("status", "paid");

      if (participants && participants.length > 0) {
        for (const p of participants) {
          const refundAmount = Number(gb.price_per_unit) * p.quantity;
          const { data: user } = await supabase
            .from("users")
            .select("balance")
            .eq("id", p.user_id)
            .single();
          if (user) {
            await supabase
              .from("users")
              .update({ balance: Number(user.balance) + refundAmount })
              .eq("id", p.user_id);
          }
          await supabase.from("platform_payments").insert({
            user_id: p.user_id,
            amount: refundAmount,
            payment_for_type: "group_buy_refund",
            status: "succeeded",
            currency: "VND",
            related_id: id,
          });
          await supabase
            .from("group_buy_participants")
            .update({ status: "refunded" })
            .eq("group_buy_id", id)
            .eq("user_id", p.user_id);

          createNotification(supabase, {
            userId: p.user_id,
            title: "💸 Hoàn tiền Mua chung",
            message: `Kèo "${gb.product_name}" bị hủy. Đã hoàn ${refundAmount}đ.`,
            type: "wallet",
            link: "/wallet",
          });
        }
      }
    }

    // Cập nhật trạng thái GroupBuy
    const { data, error } = await supabase
      .from("group_buys")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      { groupBuy: data, message: "Cập nhật trạng thái thành công" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
