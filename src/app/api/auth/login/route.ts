// src/app/api/auth/login/route.ts
// Đã chuyển sang dùng Service Key (Admin Client)

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Dùng Service Key
const JWT_SECRET = process.env.JWT_SECRET!;
const COOKIE_NAME = "auth-token";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 ngày

// Hàm khởi tạo Admin Client (dùng nội bộ)
function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("API Login: Thiếu key!");
    return null;
  }
  try {
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
  } catch (error) {
    console.error("API Login: Lỗi tạo Admin Client:", error);
    return null;
  }
}

export async function POST(request: Request) {
  if (!JWT_SECRET)
    return NextResponse.json({ error: "Lỗi cấu hình JWT." }, { status: 500 });

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin)
    return NextResponse.json(
      { error: "Lỗi cấu hình server (Admin Client)." },
      { status: 500 }
    );

  try {
    const { email, password } = await request.json();
    if (!email || !password)
      return NextResponse.json(
        { error: "Thiếu email hoặc mật khẩu." },
        { status: 400 }
      );

    // --- Find User (Dùng Admin Client) ---
    const { data: user, error: findError } = await supabaseAdmin
      .from("users")
      .select("*") // Lấy hết (kể cả hash)
      .eq("email", email)
      .single();
    if (findError || !user)
      return NextResponse.json(
        { error: "Email hoặc mật khẩu sai." },
        { status: 401 }
      );

    if (user.status === "banned") {
      console.warn(`API Login: User ${email} (banned) đang cố đăng nhập!`); // Log
      return NextResponse.json(
        { error: "Tài khoản này đã bị khóa." },
        { status: 403 }
      ); // 403 Forbidden
    }

    // --- Compare Password ---
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch)
      return NextResponse.json(
        { error: "Email hoặc mật khẩu sai." },
        { status: 401 }
      );

    // --- Create JWT ---
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: `${COOKIE_MAX_AGE_SECONDS}s`,
    });

    // --- Prepare User Response (Remove Hash!) ---
    const userResponse = { ...user };
    delete (userResponse as any).password_hash;

    // --- Set Cookie (SỬA LỖI TẠI ĐÂY) ---
    // Thêm 'await' trước cookies()
    const cookieStore = await cookies();
    cookieStore.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      path: "/",
      maxAge: COOKIE_MAX_AGE_SECONDS,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return NextResponse.json(
      { user: userResponse, message: "Đăng nhập thành công." },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("API Login Error:", error);
    let message = "Lỗi server.";
    if (error instanceof Error) message = error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
