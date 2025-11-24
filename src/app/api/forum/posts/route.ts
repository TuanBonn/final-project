// src/app/api/forum/posts/route.ts
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

// === GET: Lấy danh sách bài viết ===
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from("posts")
      .select(
        `
        id, title, content, created_at,
        author:users!author_id ( username, avatar_url, full_name, is_verified ),
        likes:forum_post_likes ( count ),
        comments:comments ( count )
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    const { data: postsData, error, count } = await query;

    if (error) throw error;

    // --- KIỂM TRA TRẠNG THÁI LIKE CỦA USER ---
    const userId = await getUserId(request);
    const likedPostIds = new Set<string>();

    if (userId && postsData && postsData.length > 0) {
      const postIds = postsData.map((p: any) => p.id);
      const { data: myLikes } = await supabase
        .from("forum_post_likes")
        .select("post_id")
        .eq("user_id", userId)
        .in("post_id", postIds);

      myLikes?.forEach((l: any) => likedPostIds.add(l.post_id));
    }
    // -----------------------------------------

    // Format dữ liệu trả về
    const posts = postsData?.map((p: any) => ({
      id: p.id,
      title: p.title,
      content: p.content,
      createdAt: p.created_at,
      author: {
        username: p.author?.username,
        fullName: p.author?.full_name,
        avatarUrl: p.author?.avatar_url,
        isVerified: p.author?.is_verified,
      },
      likeCount: p.likes?.[0]?.count || 0,
      commentCount: p.comments?.[0]?.count || 0,
      isLiked: likedPostIds.has(p.id), // Trạng thái like
    }));

    const totalPages = count ? Math.ceil(count / limit) : 1;

    return NextResponse.json(
      {
        posts: posts || [],
        pagination: { page, limit, total: count, totalPages },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// === POST: Đăng bài mới ===
export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json(
      { error: "Vui lòng đăng nhập để đăng bài." },
      { status: 401 }
    );

  const supabase = getSupabaseAdmin();

  try {
    const { title, content } = await request.json();

    if (!title || !content) {
      return NextResponse.json(
        { error: "Tiêu đề và nội dung không được để trống." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("posts")
      .insert({
        author_id: userId,
        title,
        content,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      { message: "Đăng bài thành công!", post: data },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
