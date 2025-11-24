// src/app/api/forum/posts/[id]/route.ts
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;

  try {
    const supabase = getSupabaseAdmin();

    // Lấy thông tin bài viết
    const { data: post, error } = await supabase
      .from("posts")
      .select(
        `
        id, title, content, created_at,
        author:users!author_id ( id, username, full_name, avatar_url, is_verified ),
        likes:forum_post_likes ( count ),
        comments:comments ( count )
      `
      )
      .eq("id", postId)
      .single();

    if (error || !post) {
      return NextResponse.json(
        { error: "Bài viết không tồn tại." },
        { status: 404 }
      );
    }

    // Kiểm tra trạng thái Like
    const userId = await getUserId(request);
    let isLiked = false;

    if (userId) {
      const { data: like } = await supabase
        .from("forum_post_likes")
        .select("post_id")
        .eq("user_id", userId)
        .eq("post_id", postId)
        .single();

      if (like) isLiked = true;
    }

    // Format data
    const formattedPost = {
      ...post,
      like_count: post.likes?.[0]?.count || 0,
      comment_count: post.comments?.[0]?.count || 0,
      isLiked: isLiked, // Trả về trạng thái like
    };

    return NextResponse.json({ post: formattedPost }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE (nếu cần xóa bài của chính mình sau này)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ... (Logic xóa bài nếu cần thiết)
  return NextResponse.json({ message: "Not implemented" }, { status: 501 });
}
