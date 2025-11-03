// // src/app/api/admin/users/[id]/route.ts
// import { NextResponse, type NextRequest } from "next/server";
// import { createClient, SupabaseClient } from "@supabase/supabase-js";
// import { parse as parseCookie } from "cookie";
// import jwt from "jsonwebtoken";

// export const runtime = "nodejs";

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
// const JWT_SECRET = process.env.JWT_SECRET;
// const COOKIE_NAME = "auth-token";

// interface JwtPayload {
//   role?: string;
//   [key: string]: unknown;
// }

// function getSupabaseAdmin(): SupabaseClient | null {
//   if (!supabaseUrl || !supabaseServiceKey) {
//     console.error("API Admin/PATCH: Thiếu Supabase URL hoặc Service Key!");
//     return null;
//   }
//   try {
//     return createClient(supabaseUrl, supabaseServiceKey, {
//       auth: { persistSession: false },
//     });
//   } catch (error) {
//     console.error("API Admin/PATCH: Lỗi tạo Admin Client:", error);
//     return null;
//   }
// }

// // 👇👇 CHỖ NÀY LÀ CHỖ SỬA
// export async function PATCH(
//   request: NextRequest,
//   ctx: { params: Promise<{ id: string }> } // ← nhận ctx rồi await
// ) {
//   const { id: targetUserId } = await ctx.params; // ← phải await
//   // ↑ nếu không await thì bạn sẽ dính đúng cái lỗi kia

//   if (!JWT_SECRET) {
//     return NextResponse.json(
//       { error: "Thiếu JWT_SECRET trên server." },
//       { status: 500 }
//     );
//   }

//   // 2. Xác thực Admin
//   try {
//     let token: string | undefined = undefined;
//     const cookieHeader = request.headers.get("cookie");
//     if (cookieHeader) {
//       const cookies = parseCookie(cookieHeader);
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
//   } catch (error) {
//     return NextResponse.json({ error: "Token không hợp lệ." }, { status: 401 });
//   }

//   // 3. Lấy body update
//   let updateData: {
//     status?: "active" | "banned";
//     role?: "user" | "dealer";
//     is_verified?: boolean;
//   } = {};

//   try {
//     const body = await request.json();
//     if (body.status && ["active", "banned"].includes(body.status)) {
//       updateData.status = body.status;
//     }
//     if (body.role && ["user", "dealer"].includes(body.role)) {
//       updateData.role = body.role;
//       updateData.is_verified = body.role === "dealer";
//     }
//     if (Object.keys(updateData).length === 0) {
//       return NextResponse.json(
//         { error: "Không có lệnh cập nhật hợp lệ." },
//         { status: 400 }
//       );
//     }
//   } catch {
//     return NextResponse.json(
//       { error: "Request body không hợp lệ." },
//       { status: 400 }
//     );
//   }

//   // 4. Update Supabase
//   try {
//     const supabaseAdmin = getSupabaseAdmin();
//     if (!supabaseAdmin) throw new Error("Lỗi khởi tạo Admin Client");

//     if (!targetUserId) {
//       return NextResponse.json(
//         { error: "Thiếu ID user cần cập nhật." },
//         { status: 400 }
//       );
//     }

//     const { data: updatedUser, error } = await supabaseAdmin
//       .from("users")
//       .update(updateData)
//       .eq("id", targetUserId)
//       .select("id, username, status, role, is_verified")
//       .single();

//     if (error) {
//       console.error("API Admin/PATCH: Lỗi update DB:", error);
//       if (error.code === "PGRST116") {
//         return NextResponse.json(
//           { error: "Không tìm thấy user để cập nhật." },
//           { status: 404 }
//         );
//       }
//       throw error;
//     }

//     if (!updatedUser) {
//       throw new Error("Update OK nhưng không nhận được data trả về.");
//     }

//     return NextResponse.json(
//       { user: updatedUser, message: "Cập nhật thành công!" },
//       { status: 200 }
//     );
//   } catch (error: unknown) {
//     console.error("API Admin/PATCH: Lỗi bất ngờ:", error);
//     return NextResponse.json(
//       { error: "Lỗi server khi cập nhật user." },
//       { status: 500 }
//     );
//   }
// }

// src/app/api/admin/users/[id]/route.ts
// ĐÃ SỬA: Lỗi 'params' và 'runtime'

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

// --- Hàm khởi tạo Admin Client ---
function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("API Admin/PATCH: Thiếu Supabase URL hoặc Service Key!");
    return null;
  }
  try {
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
  } catch (error) {
    console.error("API Admin/PATCH: Lỗi tạo Admin Client:", error);
    return null;
  }
}

// --- Hàm xử lý PATCH request (ĐÃ SỬA) ---
export async function PATCH(
  request: NextRequest,
  // === SỬA LẠI CÚ PHÁP LẤY PARAMS CHO ĐÚNG ===
  ctx: { params: { id: string } }
) {
  // const { id: targetUserId } = await ctx.params; // Lấy ID từ ctx.params
  const targetUserId = ctx.params.id; // Hoặc lấy trực tiếp vầy
  // =======================================

  // 1. Kiểm tra cấu hình
  if (!JWT_SECRET) {
    /* ... */
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

  // 3. Lấy dữ liệu update
  let updateData: {
    status?: "active" | "banned";
    role?: "user" | "dealer";
    is_verified?: boolean;
  } = {};

  try {
    const body = await request.json();
    if (body.status && ["active", "banned"].includes(body.status)) {
      updateData.status = body.status;
    }
    if (body.role && ["user", "dealer"].includes(body.role)) {
      updateData.role = body.role;
      updateData.is_verified = body.role === "dealer";
    }
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Không có lệnh cập nhật hợp lệ." },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Request body không hợp lệ." },
      { status: 400 }
    );
  }

  // 4. Cập nhật (Dùng Admin Client)
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Lỗi khởi tạo Admin Client");

    // Giờ targetUserId đã có giá trị
    if (!targetUserId) {
      return NextResponse.json(
        { error: "Thiếu ID user cần cập nhật." },
        { status: 400 }
      );
    }

    const { data: updatedUser, error } = await supabaseAdmin
      .from("users")
      .update(updateData)
      .eq("id", targetUserId)
      .select("id, username, status, role, is_verified")
      .single();

    if (error) {
      console.error("API Admin/PATCH: Lỗi update DB:", error);
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Không tìm thấy user để cập nhật." },
          { status: 404 }
        );
      }
      throw error;
    }
    if (!updatedUser) {
      throw new Error("Update OK nhưng không nhận được data trả về.");
    }

    return NextResponse.json(
      { user: updatedUser, message: "Cập nhật thành công!" },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("API Admin/PATCH: Lỗi bất ngờ:", error);
    let message = "Lỗi server khi cập nhật user.";
    if (error instanceof Error) message = error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
