// src/app/api/auctions/[id]/finalize/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createNotification } from "@/lib/notification";

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
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: auctionId } = await ctx.params;
  const supabase = getSupabaseAdmin();

  try {
    // 1. Lấy info đấu giá
    const { data: auction } = await supabase
      .from("auctions")
      .select("*, product:products(name)")
      .eq("id", auctionId)
      .single();

    if (!auction)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const now = new Date();
    const endTime = new Date(auction.end_time);

    if (now < endTime) {
      return NextResponse.json(
        { message: "Phiên đấu giá chưa đến giờ kết thúc." },
        { status: 400 }
      );
    }

    if (auction.status === "ended" || auction.status === "cancelled") {
      return NextResponse.json(
        { message: "Phiên đấu giá đã được chốt trước đó." },
        { status: 200 }
      );
    }

    // 2. Tìm người thắng
    const { data: highestBid } = await supabase
      .from("bids")
      .select("*")
      .eq("auction_id", auctionId)
      .order("bid_amount", { ascending: false })
      .limit(1)
      .single();

    if (highestBid) {
      // A. Có người thắng -> Cập nhật winner
      await supabase
        .from("auctions")
        .update({
          status: "ended",
          winning_bidder_id: highestBid.bidder_id,
        })
        .eq("id", auctionId);

      // Sản phẩm vẫn giữ status 'auction' (đã set lúc tạo), chờ thanh toán

      await createNotification(supabase, {
        userId: highestBid.bidder_id,
        title: "🏆 Chúc mừng chiến thắng!",
        message: `Bạn đã thắng đấu giá sản phẩm "${auction.product?.name}". Vui lòng vào thanh toán ngay.`,
        type: "auction",
        link: `/auctions/${auctionId}`,
      });

      await createNotification(supabase, {
        userId: auction.seller_id,
        title: "🏁 Phiên đấu giá kết thúc",
        message: `Sản phẩm "${auction.product?.name}" đã có người thắng. Chờ thanh toán.`,
        type: "auction",
        link: `/auctions/${auctionId}`,
      });
    } else {
      // B. Không ai mua -> Status ended
      await supabase
        .from("auctions")
        .update({ status: "ended" })
        .eq("id", auctionId);

      // Set status sản phẩm thành 'auction' (hoặc giữ nguyên vì nó đã là auction)
      // Điều này đảm bảo nó bị khóa, người dùng muốn bán lại phải tạo mới
      await supabase
        .from("products")
        .update({ status: "auction" })
        .eq("id", auction.product_id);

      await createNotification(supabase, {
        userId: auction.seller_id,
        title: "⚠️ Đấu giá thất bại",
        message: `Phiên "${auction.product?.name}" đã kết thúc nhưng không có lượt đặt giá nào. Sản phẩm đã được lưu kho (trạng thái Auction).`,
        type: "auction",
        link: `/auctions/${auctionId}`,
      });
    }

    return NextResponse.json(
      { message: "Đã chốt phiên đấu giá thành công." },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
