// src/app/api/profile/me/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { parse as parseCookie } from "cookie";

const COOKIE_NAME = "auth-token";
const JWT_SECRET = process.env.JWT_SECRET;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface JwtPayload {
  userId: string;
  email: string;
  role?: string;
}

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

// === HÀM GET (ĐÃ SỬA LỖI AWAIT COOKIES) ===
export async function GET(request: Request) {
  if (!JWT_SECRET || !supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Config Error" }, { status: 500 });
  }

  // --- SỬA LỖI Ở ĐÂY: Thêm await ---
  const cookieStore = await cookies();
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
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

// === HÀM PATCH (UPDATE) - GIỮ NGUYÊN ===
// Hàm này không dùng next/headers cookies() mà dùng request.headers nên không bị lỗi này.
export async function PATCH(request: Request) {
  if (!JWT_SECRET || !supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Config Error" }, { status: 500 });
  }

  let token: string | undefined = undefined;
  try {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) token = parseCookie(cookieHeader)[COOKIE_NAME];
  } catch (e) {}

  let userId: string;
  try {
    if (!token) throw new jwt.JsonWebTokenError("Token not found");
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    userId = decoded.userId;
  } catch (error) {
    return NextResponse.json({ error: "Yêu cầu xác thực." }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin)
    return NextResponse.json(
      { message: "Lỗi client Supabase." },
      { status: 500 }
    );

  try {
    const body = await request.json();
    const { fullName, username, avatarUrl, bankInfo } = body;
    const updateData: {
      full_name?: string;
      username?: string;
      avatar_url?: string;
      bank_info?: any;
    } = {};

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
    if (avatarUrl !== undefined) {
      updateData.avatar_url = avatarUrl;
    }

    // Cập nhật Bank Info
    if (bankInfo) {
      if (bankInfo.bankName && bankInfo.accountNo && bankInfo.accountName) {
        updateData.bank_info = bankInfo;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: "Không có thay đổi." },
        { status: 200 }
      );
    }

    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from("users")
      .update(updateData)
      .eq("id", userId)
      .select("*")
      .single();

    if (updateError) throw updateError;

    delete (updatedProfile as any).password_hash;
    return NextResponse.json(
      { profile: updatedProfile, message: "Cập nhật thành công!" },
      { status: 200 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { error: "Lỗi cập nhật profile." },
      { status: 500 }
    );
  }
}
