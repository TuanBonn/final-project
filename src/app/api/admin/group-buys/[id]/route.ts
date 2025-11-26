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

function getSupabaseAdmin(): SupabaseClient | null {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

async function verifyUser(
  request: NextRequest
): Promise<{ userId: string; role: string } | null> {
  if (!JWT_SECRET) return null;
  try {
    const cookieHeader = request.headers.get("cookie");
    if (!cookieHeader) return null;
    const token = parseCookie(cookieHeader)[COOKIE_NAME];
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return { userId: decoded.userId, role: decoded.role };
  } catch {
    return null;
  }
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await verifyUser(request);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const supabase = getSupabaseAdmin();

  try {
    if (!supabase) throw new Error("Config Error");

    const { status } = await request.json(); // 'successful', 'failed', 'completed'

    // 1. Lấy thông tin kèo hiện tại
    const { data: gb } = await supabase
      .from("group_buys")
      .select("host_id, price_per_unit, status, product_name")
      .eq("id", id)
      .single();

    if (!gb) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // 2. Kiểm tra quyền: Admin HOẶC Host
    const isHost = gb.host_id === user.userId;
    const isAdmin = user.role === "admin";

    if (!isHost && !isAdmin) {
      return NextResponse.json(
        { error: "Bạn không có quyền thay đổi trạng thái kèo này." },
        { status: 403 }
      );
    }

    // === LOGIC 1: HỦY KÈO (HOÀN TIỀN) ===
    if (status === "failed" && gb.status !== "failed") {
      // Lấy người đã trả tiền
      const { data: participants } = await supabase
        .from("group_buy_participants")
        .select("user_id, quantity")
        .eq("group_buy_id", id)
        .eq("status", "paid");

      if (participants && participants.length > 0) {
        for (const p of participants) {
          const refundAmount = Number(gb.price_per_unit) * p.quantity;

          // Cộng tiền
          const { data: u } = await supabase
            .from("users")
            .select("balance")
            .eq("id", p.user_id)
            .single();
          if (u) {
            await supabase
              .from("users")
              .update({ balance: Number(u.balance) + refundAmount })
              .eq("id", p.user_id);
          }

          // Log
          await supabase.from("platform_payments").insert({
            user_id: p.user_id,
            amount: refundAmount,
            payment_for_type: "group_buy_refund",
            status: "succeeded",
            currency: "VND",
            related_id: id,
          });

          // Status
          await supabase
            .from("group_buy_participants")
            .update({ status: "refunded" })
            .eq("group_buy_id", id)
            .eq("user_id", p.user_id);

          // Notif
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

    // === CẬP NHẬT TRẠNG THÁI ===
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
