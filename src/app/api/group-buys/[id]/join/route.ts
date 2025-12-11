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

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const { id: groupBuyId } = await ctx.params;
  const supabase = getSupabaseAdmin();

  try {
    const { quantity } = await request.json();
    const qty = parseInt(quantity);

    if (!qty || qty < 1)
      return NextResponse.json(
        { error: "Số lượng không hợp lệ" },
        { status: 400 }
      );

    const { data: groupBuy } = await supabase
      .from("group_buys")
      .select("status, join_deadline, price_per_unit, product_name")
      .eq("id", groupBuyId)
      .single();

    if (!groupBuy)
      return NextResponse.json({ error: "Kèo không tồn tại" }, { status: 404 });

    if (groupBuy.status !== "open")
      return NextResponse.json({ error: "Kèo này đã đóng." }, { status: 400 });

    if (groupBuy.join_deadline) {
      const now = new Date();
      const deadline = new Date(groupBuy.join_deadline);
      if (deadline < now) {
        return NextResponse.json(
          { error: "Đã hết hạn tham gia." },
          { status: 400 }
        );
      }
    }

    const totalAmount = Number(groupBuy.price_per_unit) * qty;

    const { data: user } = await supabase
      .from("users")
      .select("balance")
      .eq("id", userId)
      .single();

    if (!user || Number(user.balance) < totalAmount) {
      return NextResponse.json(
        { error: "Số dư ví không đủ. Vui lòng nạp thêm." },
        { status: 402 }
      );
    }

    const { error: balanceError } = await supabase
      .from("users")
      .update({ balance: Number(user.balance) - totalAmount })
      .eq("id", userId);

    if (balanceError) throw balanceError;

    await supabase.from("platform_payments").insert({
      user_id: userId,
      amount: totalAmount,
      payment_for_type: "group_buy_order",
      status: "succeeded",
      currency: "VND",
      related_id: groupBuyId,
    });

    const { error: upsertError } = await supabase
      .from("group_buy_participants")
      .upsert(
        {
          group_buy_id: groupBuyId,
          user_id: userId,
          quantity: qty,
          status: "paid",
        },
        { onConflict: "group_buy_id,user_id" }
      );

    if (upsertError) throw upsertError;

    return NextResponse.json(
      { message: "Thanh toán và tham gia thành công!" },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
