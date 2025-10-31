// // src/app/api/auth/me/route.ts
// import { NextResponse } from "next/server";
// import { cookies } from "next/headers";
// import jwt from "jsonwebtoken";
// import { createClient } from "@supabase/supabase-js"; // Client cơ bản

// const COOKIE_NAME = "auth-token";
// const JWT_SECRET = process.env.JWT_SECRET!;
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// interface JwtPayload {
//   userId: string;
//   email: string;
//   role?: string;
// }

// // Client Supabase cơ bản
// const supabase = createClient(supabaseUrl, supabaseAnonKey);

// export async function GET(request: Request) {
//   if (!JWT_SECRET)
//     return NextResponse.json({ error: "Lỗi cấu hình JWT." }, { status: 500 });

//   const cookieStore = cookies();
//   const token = cookieStore.get(COOKIE_NAME)?.value;

//   if (!token) return NextResponse.json({ user: null }, { status: 200 }); // Chưa đăng nhập

//   try {
//     // --- Verify Token ---
//     const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

//     // --- Fetch Fresh User Data (Optional but recommended) ---
//     const { data: userProfile, error: profileError } = await supabase
//       .from("users")
//       .select(
//         "id, email, username, full_name, avatar_url, role, is_verified, reputation_score, created_at"
//       ) // Lấy info cần thiết
//       .eq("id", decoded.userId)
//       .single();

//     if (profileError) {
//       console.error("API /me: Lỗi lấy profile:", profileError);
//       // Nếu lỗi DB, vẫn có thể trả về info cơ bản từ token
//       return NextResponse.json(
//         {
//           user: {
//             id: decoded.userId,
//             email: decoded.email,
//             role: decoded.role,
//           },
//         },
//         { status: 200 }
//       );
//     }

//     // --- Return Full Profile (Remove Hash!) ---
//     if (userProfile) delete (userProfile as any).password_hash;
//     return NextResponse.json({ user: userProfile }, { status: 200 });
//   } catch (error) {
//     // Token invalid or expired
//     console.error("API /me: Lỗi Token:", error);
//     return NextResponse.json({ user: null }, { status: 200 }); // Coi như chưa đăng nhập
//   }
// }

// src/app/api/auth/me/route.ts
// Đã SỬA LẠI cách đọc cookie (bỏ next/headers)

import { NextResponse, type NextRequest } from "next/server";
// import { cookies } from 'next/headers'; // KHÔNG DÙNG NỮA
import { parse as parseCookie } from "cookie"; // Dùng thư viện 'cookie'
import jwt from "jsonwebtoken";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// --- Cấu hình ---
const COOKIE_NAME = "auth-token";
const JWT_SECRET = process.env.JWT_SECRET;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface JwtPayload {
  userId: string;
  email: string;
  role?: string;
}

// Hàm khởi tạo Admin Client (dùng nội bộ)
function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("API /me: Thiếu key!");
    return null;
  }
  try {
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
  } catch (error) {
    console.error("API /me: Lỗi tạo Admin Client:", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  // Đổi Request thành NextRequest
  // console.log("API /me GET: Bắt đầu (đã sửa cookie)...");
  if (!JWT_SECRET || !supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: "Lỗi cấu hình server." },
      { status: 500 }
    );
  }

  // === LẤY TOKEN TỪ HEADER THỦ CÔNG ===
  let token: string | undefined = undefined;
  try {
    const cookieHeader = request.headers.get("cookie"); // Dùng request.headers
    if (cookieHeader) {
      const cookies = parseCookie(cookieHeader);
      token = cookies[COOKIE_NAME];
    }
    // console.log("API /me GET: Token từ header:", token ? "OK" : "Không có");
  } catch (e) {
    console.error("API /me GET: Lỗi đọc cookie header:", e);
  }
  // ===================================

  if (!token) {
    // console.log("API /me GET: Không có token -> 200 (user null)");
    return NextResponse.json({ user: null }, { status: 200 }); // Chưa đăng nhập
  }

  try {
    // --- Verify Token ---
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    // console.log("API /me GET: Token hợp lệ, User ID:", decoded.userId);

    // --- Khởi tạo Admin Client ---
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Lỗi khởi tạo Admin Client");

    // --- Fetch User Data (Dùng Admin Client) ---
    // console.log("API /me GET: Đang lấy profile...");
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from("users")
      .select(
        "id, email, username, full_name, avatar_url, role, is_verified, reputation_score, created_at"
      )
      .eq("id", decoded.userId)
      .single();

    if (profileError) {
      console.error("API /me GET: Lỗi DB khi lấy profile:", profileError);
      if (profileError.code === "PGRST116") {
        // Trả về 200/null nếu profile không tồn tại (user bị xóa?)
        return NextResponse.json(
          { user: null, error: "Không tìm thấy profile." },
          { status: 200 }
        );
      }
      throw profileError; // Ném lỗi DB khác
    }

    if (userProfile) delete (userProfile as any).password_hash;
    // console.log("API /me GET: Lấy profile thành công.");
    return NextResponse.json({ user: userProfile }, { status: 200 }); // Trả về thành công
  } catch (error: unknown) {
    console.error("API /me GET: Lỗi token hoặc lỗi DB:", error);
    let status = 500;
    if (error instanceof jwt.JsonWebTokenError) status = 401; // Token sai/hết hạn
    // Trả 200/null nếu token lỗi (coi như chưa đăng nhập)
    return NextResponse.json(
      { user: null },
      { status: status === 401 ? 200 : 500 }
    );
  }
}
