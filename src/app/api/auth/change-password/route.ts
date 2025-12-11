import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcrypt";

const COOKIE_NAME = "auth-token";
const JWT_SECRET = process.env.JWT_SECRET;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SALT_ROUNDS = 10;

interface JwtPayload {
  userId: string;
  [key: string]: unknown;
}

export async function PATCH(request: Request) {
  console.log("API ChangePassword: Bắt đầu...");

  if (!JWT_SECRET || !supabaseUrl || !supabaseServiceKey) {
    console.error("API ChangePassword: Thiếu cấu hình .env");
    return NextResponse.json(
      { error: "Lỗi cấu hình server." },
      { status: 500 }
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  let userId: string;
  try {
    if (!token) throw new jwt.JsonWebTokenError("Token not found");
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (!decoded?.userId) throw new Error("Invalid token payload");
    userId = decoded.userId;
    console.log("API ChangePassword: User đã xác thực:", userId);
  } catch (error) {
    console.error("API ChangePassword: Lỗi xác thực token:", error);
    return NextResponse.json({ error: "Yêu cầu xác thực." }, { status: 401 });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
    const { currentPassword, newPassword } = await request.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Vui lòng nhập đủ mật khẩu cũ và mới." },
        { status: 400 }
      );
    }
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Mật khẩu mới phải ít nhất 6 ký tự." },
        { status: 400 }
      );
    }

    console.log("API ChangePassword: Đang lấy hash cũ của user:", userId);
    const { data: user, error: findError } = await supabaseAdmin
      .from("users")
      .select("password_hash")
      .eq("id", userId)
      .single();

    if (findError || !user) {
      console.error(
        "API ChangePassword: Lỗi tìm user hoặc không thấy user:",
        findError
      );
      return NextResponse.json(
        { error: "Không tìm thấy người dùng." },
        { status: 404 }
      );
    }

    if (!user.password_hash) {
      console.warn(
        "API ChangePassword: User này (",
        userId,
        ") đăng nhập qua Google, không có mật khẩu để đổi."
      );
      return NextResponse.json(
        { error: "Tài khoản Google không thể đổi mật khẩu bằng cách này." },
        { status: 400 }
      );
    }

    console.log("API ChangePassword: Đang so sánh mật khẩu cũ...");
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isMatch) {
      console.log("API ChangePassword: Mật khẩu cũ không khớp!");
      return NextResponse.json(
        { error: "Mật khẩu cũ không chính xác." },
        { status: 401 }
      );
    }
    console.log(
      "API ChangePassword: Mật khẩu cũ khớp. Đang băm mật khẩu mới..."
    );

    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ password_hash: newPasswordHash })
      .eq("id", userId);

    if (updateError) {
      console.error(
        "API ChangePassword: Lỗi khi update mật khẩu mới:",
        updateError
      );
      throw updateError;
    }

    console.log(
      "API ChangePassword: Đổi mật khẩu thành công cho user:",
      userId
    );

    return NextResponse.json(
      { message: "Đổi mật khẩu thành công!" },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("API ChangePassword: LỖI BẤT NGỜ:", error);
    let errorMessage = "Lỗi server không xác định.";
    if (error instanceof Error) errorMessage = error.message;
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
