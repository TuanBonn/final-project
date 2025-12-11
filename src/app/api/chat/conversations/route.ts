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

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();

  try {
    const { data: myConvos, error: convoError } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId);

    if (convoError) throw convoError;

    const conversationIds = myConvos.map((c) => c.conversation_id);

    if (conversationIds.length === 0) {
      return NextResponse.json({ conversations: [] }, { status: 200 });
    }

    const { data: conversations, error: dataError } = await supabase
      .from("conversations")
      .select(
        `
        id,
        updated_at:created_at, 
        participants:conversation_participants (
            user:users (id, username, full_name, avatar_url)
        ),
        messages (
            content,
            created_at
        )
      `
      )
      .in("id", conversationIds)
      .order("created_at", { ascending: false });

    if (dataError) throw dataError;

    const formatted = conversations.map((c: any) => {
      const partner = c.participants.find(
        (p: any) => p.user.id !== userId
      )?.user;

      const lastMessage =
        c.messages && c.messages.length > 0
          ? c.messages.sort(
              (a: any, b: any) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            )[0]
          : null;

      return {
        id: c.id,
        partner: partner || { username: "Unknown", avatar_url: null },
        lastMessage: lastMessage ? lastMessage.content : "Bắt đầu trò chuyện",
        updatedAt: lastMessage ? lastMessage.created_at : c.updated_at,
      };
    });

    formatted.sort(
      (a: any, b: any) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return NextResponse.json({ conversations: formatted }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  try {
    const { partnerId } = await request.json();
    if (!partnerId)
      return NextResponse.json({ error: "Missing partnerId" }, { status: 400 });
    if (userId === partnerId)
      return NextResponse.json(
        { error: "Cannot chat with yourself" },
        { status: 400 }
      );

    const { data: myConvos } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId);

    const myConvoIds = myConvos?.map((c) => c.conversation_id) || [];

    if (myConvoIds.length > 0) {
      const { data: existingConvo } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", partnerId)
        .in("conversation_id", myConvoIds)
        .maybeSingle();

      if (existingConvo) {
        return NextResponse.json({
          conversationId: existingConvo.conversation_id,
          isNew: false,
        });
      }
    }

    const { data: newConvo, error: createError } = await supabase
      .from("conversations")
      .insert({})
      .select()
      .single();

    if (createError) throw createError;

    await supabase.from("conversation_participants").insert([
      { conversation_id: newConvo.id, user_id: userId },
      { conversation_id: newConvo.id, user_id: partnerId },
    ]);

    return NextResponse.json({ conversationId: newConvo.id, isNew: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
