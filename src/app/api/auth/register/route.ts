import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("API Register: Thiếu Supabase URL hoặc Service Key!");
    return null;
  }
  try {
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
  } catch (error) {
    console.error("API Register: Lỗi tạo Admin Client:", error);
    return null;
  }
}

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Lỗi cấu hình server (Admin Client)." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { email, password, username, fullName } = body;

    if (!email || !password || !username || !fullName)
      return NextResponse.json({ error: "Thiếu thông tin." }, { status: 400 });
    if (username.length < 3)
      return NextResponse.json(
        { error: "Username quá ngắn." },
        { status: 400 }
      );

    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from("users")
      .select("id")
      .or(`email.eq.${email},username.eq.${username}`)
      .maybeSingle();
    if (checkError) {
      console.error("API Register: Lỗi check user:", checkError);
      throw checkError;
    }
    if (existingUser)
      return NextResponse.json(
        { error: "Email hoặc Username đã tồn tại." },
        { status: 409 }
      );

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const { error: insertError } = await supabaseAdmin.from("users").insert({
      email: email,
      password_hash: passwordHash,
      username: username,
      full_name: fullName,
      avatar_url: "https://i.imgur.com/6VBx3io.png",
    });
    if (insertError) {
      console.error("API Register: Lỗi insert user:", insertError);
      throw insertError;
    }

    return NextResponse.json(
      { message: "Đăng ký thành công! Vui lòng đăng nhập." },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("API Register Error:", error);
    let message = "Lỗi server.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
