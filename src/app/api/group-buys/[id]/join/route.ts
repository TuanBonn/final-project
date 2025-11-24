// src/app/api/group-buys/[id]/join/route.ts
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
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const { id: groupBuyId } = await params;
  const supabase = getSupabaseAdmin();

  try {
    const { quantity } = await request.json();
    const qty = parseInt(quantity);

    if (!qty || qty < 1)
      return NextResponse.json(
        { error: "Số lượng không hợp lệ" },
        { status: 400 }
      );

    // 1. Kiểm tra kèo
    const { data: groupBuy } = await supabase
      .from("group_buys")
      .select("status, join_deadline")
      .eq("id", groupBuyId)
      .single();

    if (!groupBuy)
      return NextResponse.json({ error: "Kèo không tồn tại" }, { status: 404 });
    if (groupBuy.status !== "open")
      return NextResponse.json({ error: "Kèo này đã đóng." }, { status: 400 });
    if (new Date(groupBuy.join_deadline) < new Date())
      return NextResponse.json(
        { error: "Đã hết hạn tham gia." },
        { status: 400 }
      );

    // 2. Kiểm tra đã tham gia chưa (Nếu rồi -> Update, chưa -> Insert)
    // Ở đây dùng Upsert cho tiện
    const { error: upsertError } = await supabase
      .from("group_buy_participants")
      .upsert(
        {
          group_buy_id: groupBuyId,
          user_id: userId,
          quantity: qty,
          status: "pending_payment", // Mặc định chờ thanh toán/cọc
        },
        { onConflict: "group_buy_id,user_id" }
      );

    if (upsertError) throw upsertError;

    return NextResponse.json(
      { message: "Tham gia thành công!" },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
