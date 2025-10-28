// src/app/api/auth/login/route.ts

import { createClient } from "@supabase/supabase-js"; // Client cơ bản để query DB
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers"; // Để set cookie

const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = "auth-token"; // Tên cookie chứa JWT
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // Ví dụ: 7 ngày

export async function POST(request: Request) {
  if (!JWT_SECRET) {
    console.error("JWT_SECRET chưa được cấu hình!");
    return NextResponse.json(
      { error: "Lỗi cấu hình server." },
      { status: 500 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    // 1. Lấy email và password từ request
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Vui lòng nhập email và mật khẩu." },
        { status: 400 }
      );
    }

    // 2. Tìm user trong database bằng email
    console.log(`Tìm kiếm user với email: ${email}`); // Log
    const { data: user, error: findError } = await supabase
      .from("users") // Bảng users
      .select(
        "id, email, password_hash, username, full_name, avatar_url, role, is_verified"
      ) // Lấy cả hash và các thông tin khác
      .eq("email", email)
      .single(); // Chỉ mong đợi 1 kết quả

    if (findError || !user) {
      console.error("Lỗi tìm user hoặc user không tồn tại:", findError);
      return NextResponse.json(
        { error: "Email hoặc mật khẩu không đúng." },
        { status: 401 }
      ); // Unauthorized
    }
    console.log("User tìm thấy:", user.email); // Log

    // 3. So sánh mật khẩu nhập vào với hash trong database
    console.log("So sánh mật khẩu..."); // Log
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      console.warn(`Sai mật khẩu cho user: ${email}`); // Log
      return NextResponse.json(
        { error: "Email hoặc mật khẩu không đúng." },
        { status: 401 }
      );
    }
    console.log("Mật khẩu khớp!"); // Log

    // 4. Mật khẩu đúng -> Tạo JWT (Token)
    console.log("Tạo JWT..."); // Log
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role, // Thêm role vào token nếu cần phân quyền nhanh
      // Bạn có thể thêm các thông tin khác không nhạy cảm vào đây
    };
    const token = jwt.sign(
      tokenPayload,
      JWT_SECRET,
      { expiresIn: `${COOKIE_MAX_AGE_SECONDS}s` } // Đặt thời gian hết hạn cho token
    );
    console.log("JWT đã tạo."); // Log

    // 5. Chuẩn bị thông tin user trả về (LOẠI BỎ password_hash)
    const userResponse = { ...user };
    delete (userResponse as any).password_hash; // Cực kỳ quan trọng: Xóa hash trước khi gửi về client

    // 6. Set JWT vào cookie httpOnly
    const cookieStore = cookies();
    cookieStore.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true, // Chỉ server mới đọc được, tăng bảo mật
      path: "/",
      maxAge: COOKIE_MAX_AGE_SECONDS,
      // secure: process.env.NODE_ENV === 'production', // Bật khi deploy HTTPS
      // sameSite: 'strict', // Chống CSRF
    });
    console.log("Cookie đã được set."); // Log

    // 7. Trả về thành công cùng thông tin user (đã loại bỏ hash)
    return NextResponse.json(
      { user: userResponse, message: "Đăng nhập thành công." },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Lỗi không mong muốn trong API Đăng nhập:", error);
    let errorMessage = "Đã xảy ra lỗi không mong muốn.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
