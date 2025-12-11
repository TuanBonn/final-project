import { NextResponse } from "next/server";
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
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

export async function GET(request: Request) {
  if (!JWT_SECRET || !supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Config Error" }, { status: 500 });
  }

  let token: string | undefined = undefined;
  try {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) token = parseCookie(cookieHeader)[COOKIE_NAME];
  } catch (e) {}

  if (!token)
    return NextResponse.json({ error: "Yêu cầu xác thực." }, { status: 401 });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Lỗi admin client");

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", decoded.userId)
      .single();

    if (error) throw error;
    if (user) delete (user as any).password_hash;

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  let token: string | undefined = undefined;
  try {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) token = parseCookie(cookieHeader)[COOKIE_NAME];
  } catch (e) {}

  let userId: string;
  try {
    if (!token || !JWT_SECRET) throw new Error("Token missing");
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    userId = decoded.userId;
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin)
    return NextResponse.json({ error: "Server error" }, { status: 500 });

  try {
    const body = await request.json();

    const { full_name, username, avatar_url, bank_info, shipping_info, email } =
      body;

    const updateData: any = {};

    if (full_name !== undefined) updateData.full_name = full_name;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    if (bank_info !== undefined) updateData.bank_info = bank_info;
    if (shipping_info !== undefined) updateData.shipping_info = shipping_info;

    if (username !== undefined) {
      if (username.length < 3)
        return NextResponse.json(
          { error: "Username quá ngắn" },
          { status: 400 }
        );

      const { data: existing } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("username", username)
        .neq("id", userId)
        .maybeSingle();

      if (existing)
        return NextResponse.json(
          { error: "Username đã tồn tại" },
          { status: 409 }
        );

      updateData.username = username;
    }

    if (email !== undefined) updateData.email = email;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: "Không có thay đổi" },
        { status: 200 }
      );
    }

    const { data: updatedUser, error } = await supabaseAdmin
      .from("users")
      .update(updateData)
      .eq("id", userId)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json(
      { user: updatedUser, message: "Cập nhật thành công" },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
