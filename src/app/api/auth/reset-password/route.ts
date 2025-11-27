import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcrypt";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SALT_ROUNDS = 10;

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

export async function POST(request: Request) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json({ error: "Thiếu thông tin." }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Mật khẩu phải có ít nhất 6 ký tự." },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const now = new Date().toISOString();

    // 1. Tìm user có token khớp và chưa hết hạn
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("reset_token", token)
      .gt("reset_token_expiry", now) // expiry > now
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: "Token không hợp lệ hoặc đã hết hạn." },
        { status: 400 }
      );
    }

    // 2. Hash mật khẩu mới
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // 3. Cập nhật mật khẩu và xóa token
    await supabaseAdmin
      .from("users")
      .update({
        password_hash: passwordHash,
        reset_token: null, // Xóa token để không dùng lại được
        reset_token_expiry: null,
      })
      .eq("id", user.id);

    return NextResponse.json(
      { message: "Đổi mật khẩu thành công! Vui lòng đăng nhập lại." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Reset Password Error:", error);
    return NextResponse.json({ error: "Lỗi server." }, { status: 500 });
  }
}
