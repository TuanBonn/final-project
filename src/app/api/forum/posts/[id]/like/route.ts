// src/app/api/forum/posts/[id]/like/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { parse as parseCookie } from "cookie";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = "auth-token";

interface JwtPayload {
  userId: string;
  [key: string]: unknown;
}

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

async function getUserId(request: NextRequest): Promise<string | null> {
  if (!JWT_SECRET) return null;
  try {
    const cookieHeader = request.headers.get("cookie");
    if (!cookieHeader) return null;
    const token = parseCookie(cookieHeader)[COOKIE_NAME];
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded.userId;
  } catch {
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const { id: postId } = await params;
  const supabase = getSupabaseAdmin();

  try {
    // 1. Kiểm tra xem đã like chưa
    const { data: existingLike, error: checkError } = await supabase
      .from("forum_post_likes")
      .select("*")
      .eq("user_id", userId)
      .eq("post_id", postId)
      .single();

    let isLiked = false;

    if (existingLike) {
      // Đã like -> Xóa (Unlike)
      await supabase
        .from("forum_post_likes")
        .delete()
        .eq("user_id", userId)
        .eq("post_id", postId);
      isLiked = false;
    } else {
      // Chưa like -> Thêm mới
      await supabase
        .from("forum_post_likes")
        .insert({ user_id: userId, post_id: postId });
      isLiked = true;
    }

    // 2. Lấy số lượng like mới nhất
    const { count } = await supabase
      .from("forum_post_likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    return NextResponse.json(
      {
        message: isLiked ? "Đã like" : "Đã bỏ like",
        isLiked,
        newLikeCount: count || 0,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
