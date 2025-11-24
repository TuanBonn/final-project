// src/app/api/profile/me/route.ts
// Cả GET và PATCH đều dùng Service Key (Admin Client)

import { NextResponse } from "next/server";
import { cookies } from "next/headers"; // Dùng cho GET
import jwt from "jsonwebtoken";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { parse as parseCookie } from "cookie"; // Dùng cho PATCH

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
    console.error("API /profile/me: Thiếu key!");
    return null;
  }
  try {
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
  } catch (error) {
    console.error("API /profile/me: Lỗi tạo Admin Client:", error);
    return null;
  }
}

// === HÀM GET (Đã sửa: Dùng Admin Client) ===
export async function GET(request: Request) {
  if (!JWT_SECRET || !supabaseUrl || !supabaseServiceKey) {
    /* ... check config ... */
  }

  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token)
    return NextResponse.json({ error: "Yêu cầu xác thực." }, { status: 401 });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Lỗi khởi tạo Admin Client");

    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", decoded.userId)
      .single();
    if (profileError) {
      if (profileError.code === "PGRST116")
        return NextResponse.json(
          { error: "Không tìm thấy profile." },
          { status: 404 }
        );
      throw profileError;
    }
    if (userProfile) delete (userProfile as any).password_hash;
    return NextResponse.json({ profile: userProfile }, { status: 200 });
  } catch (error: unknown) {
    /* ... Xử lý lỗi token (trả 401) hoặc DB (trả 500) ... */
  }
}

// === HÀM PATCH (Dùng Admin Client) ===
export async function PATCH(request: Request) {
  if (!JWT_SECRET || !supabaseUrl || !supabaseServiceKey) {
    /* ... check config ... */
  }

  // --- Lấy token từ header (dùng thư viện cookie) ---
  let token: string | undefined = undefined;
  try {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) token = parseCookie(cookieHeader)[COOKIE_NAME];
  } catch (e) {}

  // --- Xác thực token ---
  let userId: string;
  try {
    if (!token) throw new jwt.JsonWebTokenError("Token not found");
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    userId = decoded.userId;
  } catch (error) {
    return NextResponse.json(
      { error: "Yêu cầu xác thực hoặc token không hợp lệ." },
      { status: 401 }
    );
  }

  // --- Khởi tạo Admin Client ---
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin)
    return NextResponse.json(
      { message: "Lỗi client Supabase (Admin)." },
      { status: 500 }
    );

  // --- Xử lý logic cập nhật ---
  try {
    const body = await request.json();
    const { fullName, username, avatarUrl } = body;
    const updateData: {
      full_name?: string;
      username?: string;
      avatar_url?: string;
    } = {};

    // --- Validation & Prepare Data ---
    if (fullName !== undefined) updateData.full_name = fullName.trim();
    if (username !== undefined) {
      const trimmedUsername = username.trim();
      if (trimmedUsername && trimmedUsername.length < 3)
        return NextResponse.json(
          { error: "Username quá ngắn." },
          { status: 400 }
        );
      if (trimmedUsername) {
        const { data: existing, error } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("username", trimmedUsername)
          .neq("id", userId)
          .maybeSingle();
        if (error) throw error;
        if (existing)
          return NextResponse.json(
            { error: "Username đã tồn tại." },
            { status: 409 }
          );
        updateData.username = trimmedUsername;
      }
    }
    if (
      avatarUrl !== undefined &&
      typeof avatarUrl === "string" &&
      avatarUrl.startsWith("http")
    ) {
      updateData.avatar_url = avatarUrl;
    }

    if (Object.keys(updateData).length === 0) {
      /* ... trả về profile hiện tại (dùng adminClient) ... */
    }

    // --- Update DB (DÙNG ADMIN CLIENT) ---
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from("users")
      .update(updateData)
      .eq("id", userId)
      .select("*")
      .single();

    if (updateError) throw updateError;
    if (!updatedProfile)
      throw new Error("Update OK but no profile data returned.");

    delete (updatedProfile as any).password_hash;
    return NextResponse.json(
      { profile: updatedProfile, message: "Cập nhật thành công!" },
      { status: 200 }
    );
  } catch (error: unknown) {
    /* ... Catch lỗi tổng của PATCH ... */
  }
}
