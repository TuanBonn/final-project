// src/app/api/admin/auctions/check-overdue/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createNotification } from "@/lib/notification";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// === CONFIGURATION ===
// 1. Thời gian chờ thanh toán (Set cứng theo yêu cầu của bạn)
// Đổi thành 0 để test ngay lập tức với các phiên đang waiting.
// Đổi thành 24 khi chạy thực tế.
const PAYMENT_WINDOW_HOURS = 24;

// 2. Điểm phạt mặc định (Nếu chưa cấu hình trong DB)
const FALLBACK_PENALTY_SCORE = 20;

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

// === HÀM HOÀN TIỀN (REFUND HELPER) ===
async function processRefunds(
  supabase: SupabaseClient,
  auctionId: string,
  productName: string,
  excludeUserId?: string
) {
  // Lấy danh sách người tham gia
  const { data: participants } = await supabase
    .from("auction_participants")
    .select("user_id")
    .eq("auction_id", auctionId);

  if (participants && participants.length > 0) {
    const PARTICIPATION_FEE = 50000; // Phí tham gia cố định

    await Promise.all(
      participants.map(async (p) => {
        // Không hoàn tiền cho người bị loại trừ (Winner bùng kèo)
        if (p.user_id === excludeUserId) return;

        // 1. Lấy số dư hiện tại
        const { data: user } = await supabase
          .from("users")
          .select("balance")
          .eq("id", p.user_id)
          .single();

        if (user) {
          // 2. Cộng lại tiền vào ví
          await supabase
            .from("users")
            .update({ balance: Number(user.balance) + PARTICIPATION_FEE })
            .eq("id", p.user_id);

          // 3. Ghi log hoàn tiền (Để hiển thị Dashboard/Ví)
          await supabase.from("platform_payments").insert({
            user_id: p.user_id,
            amount: PARTICIPATION_FEE,
            currency: "VND",
            payment_for_type: "auction_fee_refund", // Loại giao dịch hoàn tiền
            status: "succeeded",
            withdrawal_info: {
              description: `Refund (Winner unpaid): ${productName}`,
              auction_id: auctionId,
            },
          });

          // 4. Gửi thông báo
          await createNotification(supabase, {
            userId: p.user_id,
            title: "💰 Auction Refund",
            message: `Auction "${productName}" cancelled due to unpaid winner. Participation fee refunded.`,
            type: "wallet",
            link: "/wallet",
          });
        }
      })
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();

  try {
    // === 1. LẤY CẤU HÌNH ĐIỂM PHẠT TỪ DB ===
    const { data: settings } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "AUCTION_PENALTY_SCORE")
      .single();

    const penaltyScore = settings?.value
      ? Number(settings.value)
      : FALLBACK_PENALTY_SCORE;

    // === 2. TÍNH TOÁN THỜI GIAN QUÁ HẠN ===
    // Logic: Nếu (Hiện tại - Giờ kết thúc) > Window => Quá hạn
    // Tương đương: Giờ kết thúc < (Hiện tại - Window)
    const deadline = new Date(
      Date.now() - PAYMENT_WINDOW_HOURS * 60 * 60 * 1000
    ).toISOString();

    console.log(`[Scan Overdue] Checking auctions ended before: ${deadline}`);

    // === 3. TÌM CÁC PHIÊN QUÁ HẠN ===
    // [FIX] Query đơn giản hóa để tránh lỗi 500 do sai tên relation
    const { data: overdueAuctions, error } = await supabase
      .from("auctions")
      .select(
        `
        id, winning_bidder_id, seller_id, 
        product:products(name)
      `
      )
      .eq("status", "waiting")
      .lt("end_time", deadline);

    if (error) {
      console.error("Query Error:", error);
      throw new Error(error.message);
    }

    if (!overdueAuctions || overdueAuctions.length === 0) {
      return NextResponse.json({
        message: "No overdue auctions found.",
        config: { penaltyScore, paymentWindowHours: PAYMENT_WINDOW_HOURS },
      });
    }

    let count = 0;

    // === 4. XỬ LÝ TỪNG PHIÊN ===
    await Promise.all(
      overdueAuctions.map(async (auction) => {
        const productName = auction.product?.name || "Product";
        const winnerId = auction.winning_bidder_id;

        // A. Hủy phiên đấu giá (Chuyển sang cancelled)
        await supabase
          .from("auctions")
          .update({ status: "cancelled" })
          .eq("id", auction.id);

        // B. Phạt người thắng (Nếu có)
        if (winnerId) {
          // Lấy điểm uy tín hiện tại của người thắng để trừ
          const { data: winner } = await supabase
            .from("users")
            .select("reputation_score")
            .eq("id", winnerId)
            .single();

          const currentScore = winner?.reputation_score || 0;
          const newScore = Math.max(0, currentScore - penaltyScore);

          // Cập nhật điểm uy tín mới
          await supabase
            .from("users")
            .update({ reputation_score: newScore })
            .eq("id", winnerId);

          // Thông báo phạt
          await createNotification(supabase, {
            userId: winnerId,
            title: "🚫 Auction Penalty",
            message: `You failed to pay for "${productName}". ${penaltyScore} reputation points deducted.`,
            type: "system",
          });
        }

        // C. Hoàn tiền cho những người khác (Trừ người thắng vi phạm)
        await processRefunds(
          supabase,
          auction.id,
          productName,
          winnerId || undefined
        );

        // D. Thông báo cho người bán
        await createNotification(supabase, {
          userId: auction.seller_id,
          title: "⚠️ Auction Cancelled",
          message: `Winner failed to pay for "${productName}" after ${PAYMENT_WINDOW_HOURS}h. Auction cancelled.`,
          type: "auction",
          link: `/auctions/${auction.id}`,
        });

        count++;
      })
    );

    return NextResponse.json({
      message: `Processed ${count} overdue auctions.`,
      config: { penaltyScore, paymentWindowHours: PAYMENT_WINDOW_HOURS },
    });
  } catch (error: any) {
    console.error("Scan Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
