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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: auctionId } = await params;
  const supabase = getSupabaseAdmin();

  try {
    // 1. Lấy phí tham gia từ cài đặt
    const { data: feeSetting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "AUCTION_PARTICIPATION_FEE")
      .single();

    const fee = feeSetting?.value
      ? parseInt(feeSetting.value.replace(/\D/g, ""))
      : 50000; // Mặc định 50k

    // 2. Kiểm tra đã tham gia chưa
    const { data: existing } = await supabase
      .from("auction_participants")
      .select("user_id")
      .eq("auction_id", auctionId)
      .eq("user_id", userId)
      .single();

    if (existing) {
      return NextResponse.json(
        { message: "Bạn đã tham gia rồi." },
        { status: 200 }
      );
    }

    // 3. Kiểm tra và Trừ tiền ví
    const { data: user } = await supabase
      .from("users")
      .select("balance")
      .eq("id", userId)
      .single();

    if (!user || Number(user.balance) < fee) {
      return NextResponse.json(
        { error: "Số dư không đủ để trả phí tham gia." },
        { status: 402 }
      );
    }

    // Trừ tiền
    await supabase
      .from("users")
      .update({ balance: Number(user.balance) - fee })
      .eq("id", userId);

    // Ghi log trừ tiền
    await supabase.from("platform_payments").insert({
      user_id: userId,
      amount: fee,
      payment_for_type: "auction_creation_fee", // Có thể dùng loại phí khác nếu muốn
      status: "succeeded",
      currency: "VND",
      related_id: auctionId,
    });

    // 4. Thêm vào danh sách tham gia
    const { error: joinError } = await supabase
      .from("auction_participants")
      .insert({
        auction_id: auctionId,
        user_id: userId,
      });

    if (joinError) throw joinError;

    return NextResponse.json(
      { message: "Đã nộp phí và tham gia thành công!" },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
