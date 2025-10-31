// // src/app/api/auth/register/route.ts
// import { createClient } from "@supabase/supabase-js";
// import { NextResponse } from "next/server";
// import bcrypt from "bcrypt";

// const SALT_ROUNDS = 10;
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// // Client Supabase cơ bản (dùng Anon key)
// const supabase = createClient(supabaseUrl, supabaseAnonKey);

// export async function POST(request: Request) {
//   try {
//     const { email, password, username, fullName } = await request.json();

//     // --- Validation ---
//     if (!email || !password || !username || !fullName)
//       return NextResponse.json({ error: "Thiếu thông tin." }, { status: 400 });
//     if (username.length < 3)
//       return NextResponse.json(
//         { error: "Username quá ngắn." },
//         { status: 400 }
//       );
//     // TODO: Validate email format

//     // --- Check Exists ---
//     const { data: existingUser, error: checkError } = await supabase
//       .from("users")
//       .select("id")
//       .or(`email.eq.${email},username.eq.${username}`)
//       .maybeSingle();
//     if (checkError) throw checkError;
//     if (existingUser)
//       return NextResponse.json(
//         { error: "Email hoặc Username đã tồn tại." },
//         { status: 409 }
//       );

//     // --- Hash Password ---
//     const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

//     // --- Insert User ---
//     const { error: insertError } = await supabase.from("users").insert({
//       email: email,
//       password_hash: passwordHash,
//       username: username,
//       full_name: fullName, // Lưu ý tên cột trong DB
//       avatar_url: "https://i.imgur.com/6VBx3io.png", // Default avatar
//     });
//     if (insertError) throw insertError;

//     return NextResponse.json(
//       { message: "Đăng ký thành công! Vui lòng đăng nhập." },
//       { status: 201 }
//     );
//   } catch (error: unknown) {
//     console.error("API Register Error:", error);
//     let message = "Lỗi server.";
//     if (error instanceof Error) message = error.message;
//     // Check specific DB errors if needed (e.g., unique constraint)
//     return NextResponse.json({ error: message }, { status: 500 });
//   }
// }

// src/app/api/auth/register/route.ts
// Đã chuyển sang dùng Service Key (Admin Client)

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Dùng Service Key

// Hàm khởi tạo Admin Client (dùng nội bộ)
function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("API Register: Thiếu Supabase URL hoặc Service Key!");
    return null;
  }
  try {
    // Tạo và trả về client mới mỗi lần gọi
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }, // Không cần session cho admin
    });
  } catch (error) {
    console.error("API Register: Lỗi tạo Admin Client:", error);
    return null;
  }
}

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin(); // Lấy Admin Client
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Lỗi cấu hình server (Admin Client)." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { email, password, username, fullName } = body;

    // --- Validation ---
    if (!email || !password || !username || !fullName)
      return NextResponse.json({ error: "Thiếu thông tin." }, { status: 400 });
    if (username.length < 3)
      return NextResponse.json(
        { error: "Username quá ngắn." },
        { status: 400 }
      );

    // --- Check Exists (Dùng Admin Client) ---
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

    // --- Hash Password ---
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // --- Insert User (Dùng Admin Client) ---
    const { error: insertError } = await supabaseAdmin.from("users").insert({
      email: email,
      password_hash: passwordHash,
      username: username,
      full_name: fullName,
      avatar_url: "https://i.imgur.com/6VBx3io.png", // Default avatar
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
    // ... (Xử lý lỗi chi tiết hơn nếu cần) ...
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
