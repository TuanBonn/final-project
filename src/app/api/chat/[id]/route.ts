// src/app/api/chat/[id]/route.ts
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

// === GET MESSAGES ===
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: conversationId } = await params;
  const supabase = getSupabaseAdmin();

  try {
    // 1. Verify User is in conversation
    const { data: participant, error: checkError } = await supabase
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .eq("user_id", userId)
      .single();

    if (checkError || !participant) {
      return NextResponse.json(
        { error: "Bạn không có quyền xem cuộc trò chuyện này." },
        { status: 403 }
      );
    }

    // 2. Get messages
    const { data: messages, error } = await supabase
      .from("messages")
      .select(
        `
            id, content, created_at, sender_id,
            sender:users ( username, avatar_url )
        `
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true }); // Tin cũ nhất ở trên

    if (error) throw error;

    return NextResponse.json({ messages: messages || [] }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// === POST MESSAGE ===
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: conversationId } = await params;
  const supabase = getSupabaseAdmin();

  try {
    const { content } = await request.json();
    if (!content || !content.trim())
      return NextResponse.json({ error: "Empty message" }, { status: 400 });

    // Insert
    const { data: newMessage, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: content.trim(),
      })
      .select(
        `
                id, content, created_at, sender_id,
                sender:users ( username, avatar_url )
            `
      )
      .single();

    if (error) throw error;

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
