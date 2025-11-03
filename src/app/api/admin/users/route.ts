// // src/app/api/admin/users/route.ts
// // ĐÃ SỬA LỖI: Thêm 'export const runtime = 'nodejs';'

// import { NextResponse, type NextRequest } from "next/server";
// import { createClient, SupabaseClient } from "@supabase/supabase-js";
// import { parse as parseCookie } from "cookie";
// import jwt from "jsonwebtoken";

// // === THÊM DÒNG NÀY ĐỂ ÉP CHẠY TRÊN NODE.JS ===
// export const runtime = "nodejs";
// // ===========================================

// // --- Cấu hình ---
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
// const JWT_SECRET = process.env.JWT_SECRET;
// const COOKIE_NAME = "auth-token";

// interface JwtPayload {
//   role?: string;
//   [key: string]: unknown;
// }

// // --- Hàm khởi tạo Admin Client (Dùng Service Key) ---
// function getSupabaseAdmin(): SupabaseClient | null {
//   if (!supabaseUrl || !supabaseServiceKey) {
//     console.error("API Admin/Users: Thiếu Supabase URL hoặc Service Key!");
//     return null;
//   }
//   try {
//     return createClient(supabaseUrl, supabaseServiceKey, {
//       auth: { persistSession: false },
//     });
//   } catch (error) {
//     console.error("API Admin/Users: Lỗi tạo Admin Client:", error);
//     return null;
//   }
// }

// // --- Hàm xử lý GET request (ĐÃ SỬA) ---
// export async function GET(request: NextRequest) {
//   // console.log("API GET /admin/users: Bắt đầu (Bản vá cookie)...");

//   // 1. Kiểm tra cấu hình
//   if (!JWT_SECRET) {
//     console.error("API Admin/Users: Thiếu JWT_SECRET");
//     return NextResponse.json(
//       { error: "Lỗi cấu hình server." },
//       { status: 500 }
//     );
//   }

//   // 2. Xác thực Admin (Dùng cách đọc header thủ công)
//   try {
//     let token: string | undefined = undefined;
//     const cookieHeader = request.headers.get("cookie"); // Lấy từ header
//     if (cookieHeader) {
//       const cookies = parseCookie(cookieHeader); // Parse thủ công
//       token = cookies[COOKIE_NAME];
//     }

//     if (!token)
//       return NextResponse.json({ error: "Yêu cầu xác thực." }, { status: 401 });

//     const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
//     if (decoded.role !== "admin") {
//       return NextResponse.json(
//         { error: "Không có quyền truy cập." },
//         { status: 403 }
//       );
//     }
//     // console.log("API Admin/Users: Admin đã xác thực.");
//   } catch (error) {
//     console.error("API Admin/Users: Lỗi xác thực token:", error);
//     return NextResponse.json({ error: "Token không hợp lệ." }, { status: 401 });
//   }

//   // 3. Lấy dữ liệu (Dùng Admin Client)
//   try {
//     // Giờ hàm này sẽ đọc được Service Key
//     const supabaseAdmin = getSupabaseAdmin();
//     if (!supabaseAdmin) throw new Error("Lỗi khởi tạo Admin Client");

//     const { data: users, error } = await supabaseAdmin
//       .from("users")
//       .select(
//         "id, username, full_name, email, role, is_verified, status, created_at"
//       )
//       .order("created_at", { ascending: false });

//     if (error) {
//       console.error("API Admin/Users: Lỗi query DB:", error);
//       throw error;
//     }

//     // console.log(`API Admin/Users: Lấy thành công ${users?.length || 0} users.`);
//     return NextResponse.json({ users: users || [] }, { status: 200 });
//   } catch (error: unknown) {
//     console.error("API Admin/Users: Lỗi bất ngờ:", error);
//     let message = "Lỗi server khi lấy danh sách user.";
//     if (error instanceof Error) message = error.message;
//     return NextResponse.json({ error: message }, { status: 500 });
//   }
// }

// src/app/api/admin/users/route.ts
// Đã SỬA LỖI: Đảo Filter lên trước Order + 'runtime = nodejs'

import { NextResponse, type NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { parse as parseCookie } from "cookie";
import jwt from "jsonwebtoken";

// === GHIM VÀO NODE.JS ===
export const runtime = "nodejs";
// ======================

// --- Cấu hình ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = "auth-token";

interface JwtPayload {
  role?: string;
  [key: string]: unknown;
}

// --- Hàm khởi tạo Admin Client (Dùng Service Key) ---
function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("API Admin/Users: Thiếu Supabase URL hoặc Service Key!");
    return null;
  }
  try {
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
  } catch (error) {
    console.error("API Admin/Users: Lỗi tạo Admin Client:", error);
    return null;
  }
}

// --- Hàm xử lý GET request (ĐÃ SỬA) ---
export async function GET(request: NextRequest) {
  // 1. Kiểm tra cấu hình
  if (!JWT_SECRET) {
    /* ... check config ... */
  }

  // 2. Xác thực Admin (Đọc cookie thủ công)
  try {
    let token: string | undefined = undefined;
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const cookies = parseCookie(cookieHeader);
      token = cookies[COOKIE_NAME];
    }
    if (!token)
      return NextResponse.json({ error: "Yêu cầu xác thực." }, { status: 401 });
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (decoded.role !== "admin") {
      return NextResponse.json(
        { error: "Không có quyền truy cập." },
        { status: 403 }
      );
    }
  } catch (error) {
    return NextResponse.json({ error: "Token không hợp lệ." }, { status: 401 });
  }

  // 3. Lấy dữ liệu (Dùng Admin Client)
  try {
    const search = request.nextUrl.searchParams.get("search");
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Lỗi khởi tạo Admin Client");

    let query = supabaseAdmin
      .from("users")
      .select(
        "id, username, full_name, email, role, is_verified, status, created_at"
      ); // <-- Bỏ order ở đây

    // === LỌC TRƯỚC ===
    if (search) {
      console.log(`API Admin/Users: Đang tìm kiếm với: "${search}"`);
      query = query.or(
        `username.ilike.%${search}%,full_name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }
    // ===================

    // === SẮP XẾP SAU ===
    query = query.order("created_at", { ascending: false });
    // ===================

    const { data: users, error } = await query;
    if (error) {
      console.error("API Admin/Users: Lỗi query DB:", error);
      throw error;
    }

    return NextResponse.json({ users: users || [] }, { status: 200 });
  } catch (error: unknown) {
    console.error("API Admin/Users: Lỗi bất ngờ:", error);
    let message = "Lỗi server khi lấy danh sách user.";
    if (error instanceof Error) message = error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
