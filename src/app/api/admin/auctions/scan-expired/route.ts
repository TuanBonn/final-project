// src/app/api/admin/auctions/scan-expired/route.ts
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

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();

  try {
    const now = new Date().toISOString();

    // 1. Tìm các phiên 'active' đã hết hạn (end_time < now)
    // Limit 50 để xử lý từng đợt, tránh timeout nếu số lượng quá lớn
    const { data: expiredAuctions } = await supabase
      .from("auctions")
      .select(
        `id, seller_id, product:products(name), bids(bid_amount, bidder_id)`
      )
      .eq("status", "active")
      .lt("end_time", now)
      .limit(50);

    if (!expiredAuctions || expiredAuctions.length === 0) {
      return NextResponse.json({
        message: "No expired active auctions found.",
      });
    }

    let processedCount = 0;

    // 2. Xử lý từng phiên
    await Promise.allSettled(
      expiredAuctions.map(async (auction) => {
        const bids = auction.bids || [];
        const productName = auction.product?.name || "Product";

        if (bids.length === 0) {
          // CASE 1: Không có bid -> CANCELLED
          await supabase
            .from("auctions")
            .update({ status: "cancelled" })
            .eq("id", auction.id);

          await createNotification(supabase, {
            userId: auction.seller_id,
            title: "Auction Cancelled",
            message: `Auction "${productName}" ended with no bids.`,
            type: "auction",
            link: `/auctions/${auction.id}`,
          });
        } else {
          // CASE 2: Có bid -> WAITING (Chờ thanh toán)
          const winningBid = bids.sort(
            (a: any, b: any) => Number(b.bid_amount) - Number(a.bid_amount)
          )[0];

          if (winningBid) {
            await supabase
              .from("auctions")
              .update({
                status: "waiting",
                winning_bidder_id: winningBid.bidder_id,
              })
              .eq("id", auction.id);

            // Notify winner
            await createNotification(supabase, {
              userId: winningBid.bidder_id,
              title: "🎉 You Won!",
              message: `You won "${productName}". Please proceed to payment.`,
              type: "auction",
              link: `/auctions/${auction.id}`,
            });

            // Notify seller
            await createNotification(supabase, {
              userId: auction.seller_id,
              title: "Auction Ended",
              message: `Auction "${productName}" ended. Waiting for payment.`,
              type: "auction",
              link: `/auctions/${auction.id}`,
            });
          }
        }
        processedCount++;
      })
    );

    return NextResponse.json({
      message: `Processed ${processedCount} expired auctions.`,
      count: processedCount,
    });
  } catch (error: any) {
    console.error("Scan Expired Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
