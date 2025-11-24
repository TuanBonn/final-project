// src/app/api/forum/posts/[id]/comments/route.ts
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

// === GET COMMENTS ===
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  try {
    const supabase = getSupabaseAdmin();
    // Lấy comment, sắp xếp mới nhất lên đầu (hoặc cũ nhất tùy bạn)
    const { data: comments, error } = await supabase
      .from("comments")
      .select(
        `
        id, content, created_at,
        author:users!author_id ( username, avatar_url, full_name )
      `
      )
      .eq("post_id", postId)
      .order("created_at", { ascending: true }); // Cũ trước, mới sau (giống Facebook)

    if (error) throw error;

    return NextResponse.json({ comments: comments || [] }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// === POST COMMENT ===
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
    const { content } = await request.json();
    if (!content || content.trim() === "") {
      return NextResponse.json(
        { error: "Nội dung không được để trống." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        author_id: userId,
        content: content,
      })
      .select(
        `
        id, content, created_at,
        author:users!author_id ( username, avatar_url, full_name )
      `
      )
      .single();

    if (error) throw error;

    return NextResponse.json(
      { message: "Bình luận thành công!", comment: data },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
