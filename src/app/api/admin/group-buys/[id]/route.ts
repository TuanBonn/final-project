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
    const { data: gb } = await supabase
      .from("group_buys")
      .select("*")
      .eq("id", id)
      .single();

    if (!gb) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (gb.host_id !== userId) {
    }

    const { status } = await request.json();

    if (status === "successful" && gb.status !== "successful") {
      const { data: proxyProduct, error: prodError } = await supabase
        .from("products")
        .insert({
          seller_id: gb.host_id,
          name: `[Group Buy] ${gb.product_name}`,
          description: gb.product_description,
          price: gb.price_per_unit,
          condition: "new",
          status: "sold",
          image_urls: gb.product_images,
          quantity: 0,
        })
        .select()
        .single();

      if (prodError)
        throw new Error("Lỗi tạo sản phẩm ảo: " + prodError.message);

      const { data: participants } = await supabase
        .from("group_buy_participants")
        .select("user_id, quantity")
        .eq("group_buy_id", id)
        .eq("status", "paid");

      if (participants && participants.length > 0) {
        for (const p of participants) {
          const amount = Number(gb.price_per_unit) * p.quantity;

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
            status: "buyer_paid",
            payment_method: "wallet",
            platform_commission: 0,
            shipping_address: buyer?.shipping_info,
            group_buy_id: id,
          });

          createNotification(supabase, {
            userId: p.user_id,
            title: "🎉 Kèo Mua chung thành công!",
            message: `Đơn hàng cho "${gb.product_name}" đã được tạo. Vui lòng theo dõi trong mục Đơn Mua.`,
            type: "order",
            link: "/orders",
          });
        }
      }

      createNotification(supabase, {
        userId: gb.host_id,
        title: "✅ Đã chốt kèo & Tạo đơn hàng",
        message: `Hệ thống đã tạo ${participants?.length} đơn hàng mới. Vui lòng vào Quản lý đơn bán để giao hàng.`,
        type: "order",
        link: "/orders?type=sell",
      });
    }

    if (status === "failed" && gb.status !== "failed") {
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
