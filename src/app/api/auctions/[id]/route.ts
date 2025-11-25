// // src/app/api/auctions/[id]/route.ts
// import { NextResponse, type NextRequest } from "next/server";
// import { createClient, SupabaseClient } from "@supabase/supabase-js";

// export const runtime = "nodejs";

// // Dùng Service Key để bypass RLS (Public Read)
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// function getSupabaseAdmin() {
//   return createClient(supabaseUrl, supabaseServiceKey, {
//     auth: { persistSession: false },
//   });
// }

// export async function GET(
//   request: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   const { id: auctionId } = await params;

//   try {
//     const supabase = getSupabaseAdmin();

//     // 1. Lấy thông tin đấu giá + Sản phẩm + Seller
//     const { data: auction, error } = await supabase
//       .from("auctions")
//       .select(
//         `
//         id,
//         starting_bid,
//         start_time,
//         end_time,
//         status,
//         product:products ( name, description, image_urls, condition ),
//         seller:users!seller_id ( username, avatar_url, reputation_score )
//       `
//       )
//       .eq("id", auctionId)
//       .single();

//     if (error || !auction) {
//       return NextResponse.json(
//         { error: "Không tìm thấy phiên đấu giá" },
//         { status: 404 }
//       );
//     }

//     // 2. Lấy lịch sử đặt giá (Bids) - Sắp xếp mới nhất trước
//     const { data: bids } = await supabase
//       .from("bids")
//       .select(
//         `
//         id,
//         bid_amount,
//         created_at,
//         bidder:users ( username, avatar_url )
//       `
//       )
//       .eq("auction_id", auctionId)
//       .order("bid_amount", { ascending: false }); // Giá cao nhất lên đầu

//     // 3. Tính giá hiện tại
//     const highestBid = bids && bids.length > 0 ? Number(bids[0].bid_amount) : 0;
//     const currentPrice = Math.max(Number(auction.starting_bid), highestBid);

//     return NextResponse.json(
//       {
//         auction: {
//           ...auction,
//           currentPrice,
//           bids: bids || [],
//         },
//       },
//       { status: 200 }
//     );
//   } catch (error: any) {
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }

// src/app/api/auctions/[id]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: auctionId } = await params;

  try {
    const supabase = getSupabaseAdmin();

    // --- SỬA: Bỏ hết comment trong chuỗi select ---
    const { data: auction, error } = await supabase
      .from("auctions")
      .select(
        `
        id,
        product_id,
        starting_bid,
        start_time,
        end_time,
        status,
        product:products ( id, name, description, image_urls, condition ),
        seller:users!seller_id ( username, avatar_url, reputation_score )
      `
      )
      .eq("id", auctionId)
      .single();

    if (error) {
      console.error("Supabase Query Error:", error); // Log lỗi ra console server để dễ debug
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!auction) {
      return NextResponse.json(
        { error: "Không tìm thấy phiên đấu giá" },
        { status: 404 }
      );
    }

    const { data: bids } = await supabase
      .from("bids")
      .select(
        `
        id,
        bid_amount,
        created_at,
        bidder:users ( username, avatar_url )
      `
      )
      .eq("auction_id", auctionId)
      .order("bid_amount", { ascending: false });

    const highestBid = bids && bids.length > 0 ? Number(bids[0].bid_amount) : 0;
    const currentPrice = Math.max(Number(auction.starting_bid), highestBid);

    return NextResponse.json(
      {
        auction: {
          ...auction,
          currentPrice,
          bids: bids || [],
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
