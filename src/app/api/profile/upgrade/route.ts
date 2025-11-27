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

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();

  try {
    const { type } = await request.json(); // 'verify' | 'dealer'

    if (!["verify", "dealer"].includes(type)) {
      return NextResponse.json(
        { error: "Loại yêu cầu không hợp lệ." },
        { status: 400 }
      );
    }

    // 1. Xác định Key settings và Validate User
    let settingKey = "";
    let paymentType = "";

    // Lấy thông tin User hiện tại
    const { data: user } = await supabase
      .from("users")
      .select("balance, is_verified, role")
      .eq("id", userId)
      .single();

    if (!user)
      return NextResponse.json(
        { error: "User không tồn tại." },
        { status: 404 }
      );

    if (type === "verify") {
      if (user.is_verified) {
        return NextResponse.json(
          { error: "Tài khoản đã được xác thực rồi." },
          { status: 400 }
        );
      }
      settingKey = "verification_fee"; // Key trong bảng app_settings
      paymentType = "verification_fee";
    } else if (type === "dealer") {
      if (user.role === "dealer" || user.role === "admin") {
        return NextResponse.json(
          { error: "Bạn đã là Dealer hoặc Admin." },
          { status: 400 }
        );
      }
      settingKey = "dealer_subscription"; // Key trong bảng app_settings (bạn cần thêm vào DB nếu chưa có)
      paymentType = "dealer_subscription";
    }

    // 2. Lấy mức phí từ Cấu hình
    const { data: setting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", settingKey)
      .single();

    // Mặc định phí cao để tránh lỗi free nếu chưa cấu hình (hoặc set 0 nếu muốn free)
    const fee = setting?.value ? parseInt(setting.value.replace(/\D/g, "")) : 0;

    if (fee <= 0) {
      // Nếu phí = 0, có thể cho qua luôn hoặc báo lỗi tùy logic
      // Ở đây tôi giả sử là miễn phí nếu chưa set
    }

    // 3. Kiểm tra số dư
    const currentBalance = Number(user.balance);
    if (currentBalance < fee) {
      return NextResponse.json(
        {
          error: `Số dư không đủ. Cần ${new Intl.NumberFormat("vi-VN").format(
            fee
          )}đ.`,
        },
        { status: 402 }
      );
    }

    // 4. Thực hiện Giao dịch (Trừ tiền + Update User)

    // A. Trừ tiền
    const { error: balanceError } = await supabase
      .from("users")
      .update({ balance: currentBalance - fee })
      .eq("id", userId);

    if (balanceError) throw balanceError;

    // B. Ghi log Payment
    await supabase.from("platform_payments").insert({
      user_id: userId,
      amount: fee,
      payment_for_type: paymentType,
      status: "succeeded",
      currency: "VND",
    });

    // C. Cập nhật trạng thái User
    let updateData = {};
    if (type === "verify") {
      updateData = { is_verified: true };
    } else {
      updateData = { role: "dealer" };
    }

    const { error: updateError } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", userId);

    if (updateError) throw updateError;

    // D. (Tùy chọn) Gửi thông báo
    await supabase.from("notifications").insert({
      user_id: userId,
      title: "🎉 Nâng cấp thành công!",
      message:
        type === "verify"
          ? "Tài khoản của bạn đã được xác thực (Blue Tick)."
          : "Chúc mừng bạn đã trở thành Dealer chính thức.",
      type: "system",
      link: "/profile",
    });

    return NextResponse.json(
      { message: "Nâng cấp thành công!" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
