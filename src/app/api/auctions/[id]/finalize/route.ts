// src/app/api/auctions/[id]/finalize/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: auctionId } = await params;
  const supabase = getSupabaseAdmin();

  try {
    // 1. Lấy info
    const { data: auction } = await supabase
      .from("auctions")
      .select("*, bids(bidder_id, bid_amount)")
      .eq("id", auctionId)
      .single();

    if (!auction)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    // 2. Check điều kiện kết thúc
    const now = new Date();
    const endTime = new Date(auction.end_time);

    if (now < endTime || auction.status === "ended") {
      return NextResponse.json(
        { message: "Chưa kết thúc hoặc đã chốt rồi." },
        { status: 200 }
      );
    }

    // 3. Tìm người thắng
    // (Sắp xếp bids bên trong application code hoặc query lại cho chắc)
    const { data: highestBid } = await supabase
      .from("bids")
      .select("*")
      .eq("auction_id", auctionId)
      .order("bid_amount", { ascending: false })
      .limit(1)
      .single();

    if (highestBid) {
      // Cập nhật người thắng
      await supabase
        .from("auctions")
        .update({
          status: "ended",
          winning_bidder_id: highestBid.bidder_id,
        })
        .eq("id", auctionId);

      // === TẠO ĐƠN HÀNG TỰ ĐỘNG (Vào giỏ/Đơn chờ thanh toán) ===
      await supabase.from("transactions").insert({
        product_id: auction.product_id,
        buyer_id: highestBid.bidder_id,
        seller_id: auction.seller_id,
        amount: highestBid.bid_amount,
        status: "initiated", // Chờ thanh toán
        payment_method: "cod", // Mặc định, user sẽ vào sửa lại sau
        quantity: 1,
        // Có thể thêm 1 trường đánh dấu đây là đơn đấu giá để UI xử lý riêng
      });

      // Gửi thông báo cho người thắng
      // ... (Code gọi createNotification)
    } else {
      // Không ai mua -> Cập nhật status ended
      await supabase
        .from("auctions")
        .update({ status: "ended" })
        .eq("id", auctionId);
    }

    return NextResponse.json(
      { message: "Đã chốt phiên đấu giá." },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
