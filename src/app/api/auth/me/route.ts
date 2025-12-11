import { NextResponse, type NextRequest } from "next/server";
import { parse as parseCookie } from "cookie";
import jwt from "jsonwebtoken";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

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
  if (!JWT_SECRET || !supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: "Lỗi cấu hình server." },
      { status: 500 }
    );
  }

  let token: string | undefined = undefined;
  try {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const cookies = parseCookie(cookieHeader);
      token = cookies[COOKIE_NAME];
    }
  } catch (e) {
    console.error("API /me GET: Lỗi đọc cookie header:", e);
  }

  if (!token) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Lỗi khởi tạo Admin Client");

    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from("users")
      .select(
        "id, email, username, full_name, avatar_url, role, is_verified, reputation_score, created_at, balance"
      )
      .eq("id", decoded.userId)
      .single();

    if (profileError) {
      console.error("API /me GET: Lỗi DB khi lấy profile:", profileError);
      if (profileError.code === "PGRST116") {
        return NextResponse.json(
          { user: null, error: "Không tìm thấy profile." },
          { status: 200 }
        );
      }
      throw profileError;
    }

    if (userProfile) delete (userProfile as any).password_hash;

    return NextResponse.json({ user: userProfile }, { status: 200 });
  } catch (error: unknown) {
    console.error("API /me GET: Lỗi token hoặc lỗi DB:", error);
    let status = 500;
    if (error instanceof jwt.JsonWebTokenError) status = 401;
    return NextResponse.json(
      { user: null },
      { status: status === 401 ? 200 : 500 }
    );
  }
}
