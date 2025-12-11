import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { sendPasswordResetEmail } from "@/lib/mail";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email)
      return NextResponse.json(
        { error: "Vui lòng nhập email." },
        { status: 400 }
      );

    const supabaseAdmin = getSupabaseAdmin();

    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id, username, email")
      .eq("email", email)
      .single();

    if (!user) {
      return NextResponse.json(
        { message: "Nếu email tồn tại, hệ thống đã gửi link reset." },
        { status: 200 }
      );
    }

    const token = uuidv4();
    const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const { error } = await supabaseAdmin
      .from("users")
      .update({
        reset_token: token,
        reset_token_expiry: expiry,
      })
      .eq("id", user.id);

    if (error) throw error;

    await sendPasswordResetEmail(user.email, token, user.username || "User");

    return NextResponse.json(
      { message: "Đã gửi email hướng dẫn. Vui lòng kiểm tra hộp thư." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Forgot Password Error:", error);
    return NextResponse.json({ error: "Lỗi server." }, { status: 500 });
  }
}
