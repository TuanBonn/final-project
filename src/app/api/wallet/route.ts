// src/app/api/wallet/route.ts
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

// Dùng Admin Client để đọc balance và ghi platform_payments
function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) return null;
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

// === GET: Lấy thông tin ví ===
export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  if (!supabase)
    return NextResponse.json({ error: "Config Error" }, { status: 500 });

  try {
    // 1. Lấy số dư hiện tại
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("balance")
      .eq("id", userId)
      .single();

    if (userError) throw userError;

    // 2. Lấy lịch sử giao dịch (Platform Payments)
    const { data: history, error: historyError } = await supabase
      .from("platform_payments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (historyError) throw historyError;

    return NextResponse.json(
      {
        balance: user.balance,
        history: history || [],
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// === POST: Nạp tiền (Deposit) hoặc Rút tiền (Withdraw) ===
export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  if (!supabase)
    return NextResponse.json({ error: "Config Error" }, { status: 500 });

  try {
    const { type, amount } = await request.json();

    if (!amount || amount < 10000) {
      return NextResponse.json(
        { error: "Số tiền tối thiểu là 10.000đ" },
        { status: 400 }
      );
    }

    // Xử lý Nạp tiền
    if (type === "deposit") {
      const { data, error } = await supabase
        .from("platform_payments")
        .insert({
          user_id: userId,
          amount: amount,
          payment_for_type: "deposit",
          status: "pending", // Chờ Admin duyệt
          currency: "VND",
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(
        { message: "Đã tạo yêu cầu nạp tiền.", payment: data },
        { status: 201 }
      );
    }

    // Xử lý Rút tiền
    else if (type === "withdrawal") {
      // Kiểm tra số dư
      const { data: user } = await supabase
        .from("users")
        .select("balance")
        .eq("id", userId)
        .single();
      if (!user || user.balance < amount) {
        return NextResponse.json({ error: "Số dư không đủ." }, { status: 400 });
      }

      // Tạo lệnh rút
      const { data, error } = await supabase
        .from("platform_payments")
        .insert({
          user_id: userId,
          amount: amount,
          payment_for_type: "withdrawal",
          status: "pending", // Chờ Admin chuyển khoản và duyệt
          currency: "VND",
        })
        .select()
        .single();

      // Tạm trừ tiền trong ví (để tránh rút nhiều lần)
      // Lưu ý: Trong thực tế cần Transaction Database, ở đây làm đơn giản
      await supabase
        .from("users")
        .update({
          balance: user.balance - amount,
        })
        .eq("id", userId);

      if (error) throw error;
      return NextResponse.json(
        { message: "Đã gửi yêu cầu rút tiền.", payment: data },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { error: "Loại giao dịch không hợp lệ" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Wallet API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
