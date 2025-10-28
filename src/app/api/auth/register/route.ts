// src/app/api/auth/register/route.ts

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    const body = await request.json();
    console.log("API Received Body:", body);

    // Đổi lại thành fullName (camelCase) khi lấy dữ liệu
    const { email, password, username, fullName } = body; // <-- SỬA Ở ĐÂY

    // Log chi tiết (dùng biến fullName)
    console.log(`Value of email:    '${email}' (Type: ${typeof email})`);
    console.log(`Value of password: '${password}' (Type: ${typeof password})`);
    console.log(`Value of username: '${username}' (Type: ${typeof username})`);
    console.log(`Value of fullName: '${fullName}' (Type: ${typeof fullName})`); // <-- SỬA Ở ĐÂY

    // Kiểm tra dữ liệu đầu vào (dùng biến fullName)
    if (!email || !password || !username || !fullName) {
      // <-- SỬA Ở ĐÂY
      console.error(
        "Validation Failed! At least one field is falsy. Body:",
        body
      );
      return NextResponse.json(
        { error: "Vui lòng điền đầy đủ thông tin." },
        { status: 400 }
      );
    }
    if (username.length < 3) {
      console.error("Validation Failed! Username too short. Body:", body);
      return NextResponse.json(
        { error: "Tên người dùng phải có ít nhất 3 ký tự." },
        { status: 400 }
      );
    }
    console.log("Input validation passed.");

    // Kiểm tra tồn tại
    console.log("Checking for existing user...");
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("id")
      .or(`email.eq.${email},username.eq.${username}`)
      .maybeSingle();

    if (checkError) {
      console.error("Error during existence check:", checkError);
      throw checkError;
    }
    if (existingUser) {
      console.warn("User already exists:", existingUser);
      return NextResponse.json(
        { error: "Email hoặc Tên người dùng đã tồn tại." },
        { status: 409 }
      );
    }
    console.log("User does not exist. Proceeding...");

    // Băm mật khẩu
    console.log("Hashing password...");
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    console.log("Password hashed.");

    // Lưu người dùng mới (ánh xạ fullName sang cột full_name)
    console.log("Inserting new user...");
    const { error: insertError } = await supabase.from("users").insert({
      email: email,
      password_hash: passwordHash,
      username: username,
      full_name: fullName, // <-- API dùng fullName, nhưng cột DB là full_name
      avatar_url: "https://i.imgur.com/6VBx3io.png",
    });

    if (insertError) {
      console.error("Error during user insertion:", insertError);
      throw insertError;
    }
    console.log("User inserted successfully for email:", email);

    // Trả về thành công
    return NextResponse.json(
      { message: "Đăng ký thành công! Vui lòng đăng nhập." },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Unexpected error in Registration API:", error);
    let errorMessage = "Đã xảy ra lỗi không mong muốn trên server.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
