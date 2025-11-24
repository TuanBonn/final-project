// src/app/api/group-buys/route.ts
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

// === GET: Lấy danh sách kèo thơm ===
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    // Lấy các kèo 'open'
    const { data: groupBuys, error } = await supabase
      .from("group_buys")
      .select(
        `
        id,
        product_name,
        product_images,
        price_per_unit,
        target_quantity,
        join_deadline,
        status,
        host:users!host_id ( username, avatar_url, reputation_score ),
        participants:group_buy_participants ( count )
      `
      )
      .eq("status", "open")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Format data
    const formatted = groupBuys?.map((gb: any) => ({
      id: gb.id,
      name: gb.product_name,
      image: gb.product_images?.[0] || null,
      price: Number(gb.price_per_unit),
      target: gb.target_quantity,
      current: gb.participants?.[0]?.count || 0,
      deadline: gb.join_deadline,
      host: gb.host,
      status: gb.status,
    }));

    return NextResponse.json({ groupBuys: formatted || [] }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// === POST: Tạo kèo mới ===
export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();
    const {
      productName,
      description,
      price,
      targetQuantity,
      deadline,
      imageUrls,
    } = body;

    if (!productName || !price || !targetQuantity || !deadline) {
      return NextResponse.json(
        { error: "Thiếu thông tin bắt buộc." },
        { status: 400 }
      );
    }

    const joinDeadline = new Date(deadline);
    if (joinDeadline <= new Date()) {
      return NextResponse.json(
        { error: "Hạn chót không hợp lệ." },
        { status: 400 }
      );
    }

    const { data: newGroupBuy, error } = await supabase
      .from("group_buys")
      .insert({
        host_id: userId,
        product_name: productName,
        product_description: description,
        price_per_unit: price.replace(/\D/g, ""),
        target_quantity: Number(targetQuantity),
        join_deadline: joinDeadline.toISOString(),
        product_images: imageUrls || [],
        status: "open",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      { message: "Tạo kèo thành công!", groupBuy: newGroupBuy },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
