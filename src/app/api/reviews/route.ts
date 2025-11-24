// src/app/api/reviews/route.ts
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

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();

  try {
    const { transactionId, rating, comment } = await request.json();

    if (!transactionId || !rating) {
      return NextResponse.json({ error: "Thiếu thông tin." }, { status: 400 });
    }

    // 1. Kiểm tra giao dịch (Phải là của user này, đã hoàn thành, và chưa được review)
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select("id, status, buyer_id, seller_id")
      .eq("id", transactionId)
      .single();

    if (txError || !transaction)
      return NextResponse.json(
        { error: "Giao dịch không tồn tại." },
        { status: 404 }
      );

    if (transaction.buyer_id !== userId)
      return NextResponse.json(
        { error: "Bạn không có quyền đánh giá đơn này." },
        { status: 403 }
      );
    if (transaction.status !== "completed")
      return NextResponse.json(
        { error: "Chỉ được đánh giá khi đơn hàng đã hoàn tất." },
        { status: 400 }
      );

    // Kiểm tra đã review chưa (dựa vào relation transaction-review 1-1)
    const { data: existingReview } = await supabase
      .from("reviews")
      .select("id")
      .eq("transaction_id", transactionId)
      .maybeSingle();

    if (existingReview)
      return NextResponse.json(
        { error: "Bạn đã đánh giá đơn hàng này rồi." },
        { status: 400 }
      );

    // 2. Tạo Review
    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .insert({
        transaction_id: transactionId,
        reviewer_id: userId,
        reviewee_id: transaction.seller_id, // Người bán bị đánh giá
        rating: rating,
        comment: comment,
      })
      .select()
      .single();

    if (reviewError) throw reviewError;

    // 3. Cập nhật điểm uy tín cho người bán (Reputation Score)
    // Logic đơn giản: Cộng thêm số sao vào điểm uy tín
    const { error: updateError } = await supabase.rpc("increment_reputation", {
      user_id: transaction.seller_id,
      amount: rating,
    });

    // Fallback nếu chưa có RPC: Update thủ công (không safe lắm nhưng chạy được)
    if (updateError) {
      const { data: seller } = await supabase
        .from("users")
        .select("reputation_score")
        .eq("id", transaction.seller_id)
        .single();
      if (seller) {
        await supabase
          .from("users")
          .update({ reputation_score: seller.reputation_score + rating })
          .eq("id", transaction.seller_id);
      }
    }

    return NextResponse.json(
      { message: "Đánh giá thành công!", review },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
