// src/app/api/auctions/[id]/bid/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { parse as parseCookie } from "cookie";
import jwt from "jsonwebtoken";
import { createNotification } from "@/lib/notification";

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
    return NextResponse.json(
      { error: "Vui lòng đăng nhập để đấu giá." },
      { status: 401 }
    );

  const { id: auctionId } = await params;
  const supabase = getSupabaseAdmin();

  try {
    const { amount } = await request.json();
    const bidAmount = Number(amount);

    if (isNaN(bidAmount))
      return NextResponse.json({ error: "Giá không hợp lệ" }, { status: 400 });

    // 1. Lấy thông tin phiên đấu giá
    const { data: auction, error } = await supabase
      .from("auctions")
      .select(
        `
        id, seller_id, status, end_time, starting_bid,
        product:products ( name )
      `
      )
      .eq("id", auctionId)
      .single();

    if (error || !auction)
      return NextResponse.json(
        { error: "Phiên đấu giá không tồn tại" },
        { status: 404 }
      );

    // 2. Validate cơ bản
    if (auction.status !== "active") {
      return NextResponse.json(
        { error: "Phiên đấu giá này chưa bắt đầu hoặc đã kết thúc." },
        { status: 400 }
      );
    }
    if (new Date(auction.end_time) < new Date()) {
      return NextResponse.json(
        { error: "Thời gian đấu giá đã kết thúc." },
        { status: 400 }
      );
    }
    if (auction.seller_id === userId) {
      return NextResponse.json(
        { error: "Bạn không thể tự đấu giá sản phẩm của mình." },
        { status: 400 }
      );
    }

    // === 3. KIỂM TRA ĐÃ THAM GIA (ĐÃ TRẢ PHÍ) CHƯA ===
    const { data: participant } = await supabase
      .from("auction_participants")
      .select("user_id")
      .eq("auction_id", auctionId)
      .eq("user_id", userId)
      .single();

    if (!participant) {
      return NextResponse.json(
        { error: "Bạn chưa nộp phí tham gia phiên đấu giá này." },
        { status: 403 }
      );
    }
    // =================================================

    // 4. Validate Bước giá
    const { data: highestBidRecord } = await supabase
      .from("bids")
      .select("bid_amount, bidder_id")
      .eq("auction_id", auctionId)
      .order("bid_amount", { ascending: false })
      .limit(1)
      .single();

    const currentHighest = highestBidRecord
      ? Number(highestBidRecord.bid_amount)
      : Number(auction.starting_bid);

    if (highestBidRecord && highestBidRecord.bidder_id === userId) {
      return NextResponse.json(
        { error: "Bạn đang là người trả giá cao nhất rồi!" },
        { status: 400 }
      );
    }

    const MIN_STEP = 10000;

    if (bidAmount < currentHighest + MIN_STEP) {
      return NextResponse.json(
        {
          error: `Bạn phải ra giá cao hơn giá hiện tại ít nhất ${new Intl.NumberFormat(
            "vi-VN"
          ).format(MIN_STEP)}đ`,
        },
        { status: 400 }
      );
    }

    // 5. Tạo Bid mới
    const { error: insertError } = await supabase.from("bids").insert({
      auction_id: auctionId,
      bidder_id: userId,
      bid_amount: bidAmount,
    });

    if (insertError) throw insertError;

    // 6. Chống Snipe
    const now = new Date().getTime();
    const endTime = new Date(auction.end_time).getTime();
    const timeRemaining = endTime - now;

    if (timeRemaining < 2 * 60 * 1000) {
      const newEndTime = new Date(endTime + 2 * 60 * 1000);
      await supabase
        .from("auctions")
        .update({ end_time: newEndTime.toISOString() })
        .eq("id", auctionId);
    }

    // 7. Thông báo
    if (highestBidRecord && highestBidRecord.bidder_id !== userId) {
      createNotification(supabase, {
        userId: highestBidRecord.bidder_id,
        title: "⚠️ Bạn đã bị vượt giá!",
        message: `Có người vừa trả giá cao hơn bạn trong phiên "${auction.product?.name}".`,
        type: "auction",
        link: `/auctions/${auctionId}`,
      });
    }

    return NextResponse.json(
      { message: "Đặt giá thành công!" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Bid API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
