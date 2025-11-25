// src/app/api/transactions/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { parse as parseCookie } from "cookie";
import jwt from "jsonwebtoken";
import { sendOrderConfirmationEmail } from "@/lib/mail";
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

function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) return null;
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
  try {
    const buyerId = await getUserId(request);
    if (!buyerId) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để mua hàng." },
        { status: 401 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Lỗi cấu hình server.");

    const { productId, paymentMethod, quantity, auctionId } =
      await request.json();
    const buyQty = quantity ? parseInt(quantity) : 1;

    if (!productId || !paymentMethod) {
      return NextResponse.json(
        { error: "Thiếu thông tin đơn hàng." },
        { status: 400 }
      );
    }
    if (buyQty < 1) {
      return NextResponse.json(
        { error: "Số lượng không hợp lệ." },
        { status: 400 }
      );
    }

    // 1. Lấy thông tin sản phẩm
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, price, status, seller_id, name, quantity")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: "Sản phẩm không tồn tại." },
        { status: 404 }
      );
    }

    let totalAmount = 0;

    if (auctionId) {
      // --- ĐẤU GIÁ ---
      const { data: auction } = await supabaseAdmin
        .from("auctions")
        .select("status, winning_bidder_id, starting_bid")
        .eq("id", auctionId)
        .single();

      if (!auction)
        return NextResponse.json(
          { error: "Đấu giá không tồn tại." },
          { status: 404 }
        );

      // Kiểm tra quyền người thắng
      const { data: highestBid } = await supabaseAdmin
        .from("bids")
        .select("bid_amount, bidder_id")
        .eq("auction_id", auctionId)
        .order("bid_amount", { ascending: false })
        .limit(1)
        .single();

      if (highestBid?.bidder_id !== buyerId) {
        return NextResponse.json(
          { error: "Bạn không phải người thắng cuộc." },
          { status: 403 }
        );
      }

      const winningPrice = highestBid
        ? Number(highestBid.bid_amount)
        : Number(auction.starting_bid);
      totalAmount = winningPrice;
    } else {
      // --- MUA THƯỜNG ---
      if (product.status !== "available") {
        return NextResponse.json(
          { error: "Sản phẩm này đã ngừng bán." },
          { status: 409 }
        );
      }
      if (product.seller_id === buyerId) {
        return NextResponse.json(
          { error: "Bạn không thể tự mua hàng của mình." },
          { status: 400 }
        );
      }
      if (product.quantity < buyQty) {
        return NextResponse.json(
          { error: `Chỉ còn ${product.quantity} sản phẩm.` },
          { status: 409 }
        );
      }
      totalAmount = Number(product.price) * buyQty;
    }

    // === 2. XỬ LÝ THANH TOÁN QUA VÍ ===
    let transactionStatus = "initiated";
    if (paymentMethod === "wallet") {
      const { data: buyer } = await supabaseAdmin
        .from("users")
        .select("balance")
        .eq("id", buyerId)
        .single();

      const currentBalance = Number(buyer?.balance || 0);
      if (currentBalance < totalAmount) {
        return NextResponse.json(
          { error: "Số dư ví không đủ." },
          { status: 400 }
        );
      }

      // TRỪ TIỀN
      await supabaseAdmin
        .from("users")
        .update({ balance: currentBalance - totalAmount })
        .eq("id", buyerId);

      transactionStatus = "buyer_paid";

      await supabaseAdmin.from("platform_payments").insert({
        user_id: buyerId,
        amount: totalAmount,
        payment_for_type: "withdrawal",
        status: "succeeded",
        currency: "VND",
      });
    }

    // 3. Cập nhật kho
    const qtyToDeduct = auctionId ? product.quantity : buyQty;
    const newStock = Math.max(0, product.quantity - qtyToDeduct);
    const newStatus = newStock === 0 ? "sold" : "available";

    await supabaseAdmin
      .from("products")
      .update({ quantity: newStock, status: newStatus })
      .eq("id", productId);

    // 4. Tạo Giao dịch
    const { data: transaction, error: txError } = await supabaseAdmin
      .from("transactions")
      .insert({
        product_id: productId,
        buyer_id: buyerId,
        seller_id: product.seller_id,
        amount: totalAmount,
        status: transactionStatus,
        payment_method: paymentMethod,
        quantity: buyQty,
        platform_commission: 0,
      })
      .select()
      .single();

    if (txError) {
      console.error("Lỗi tạo transaction:", txError);
      return NextResponse.json(
        { error: "Không thể tạo đơn hàng." },
        { status: 500 }
      );
    }

    // === CẬP NHẬT TRẠNG THÁI AUCTION THÀNH 'ended' ===
    // Điều này sẽ ẩn phiên đấu giá khỏi danh sách active/scheduled
    if (auctionId) {
      await supabaseAdmin
        .from("auctions")
        .update({ status: "ended" })
        .eq("id", auctionId);
    }

    // 5. Gửi Email & Thông báo
    const { data: buyerInfo } = await supabaseAdmin
      .from("users")
      .select("email, username")
      .eq("id", buyerId)
      .single();

    if (buyerInfo?.email) {
      sendOrderConfirmationEmail(
        buyerInfo.email,
        transaction.id,
        product.name,
        totalAmount,
        buyQty
      ).catch((err) => console.error("Lỗi gửi mail background:", err));
    }

    createNotification(supabaseAdmin, {
      userId: product.seller_id,
      title: auctionId
        ? "🏆 Người thắng đấu giá đã thanh toán!"
        : "🎉 Có đơn hàng mới!",
      message: `Khách hàng ${buyerInfo?.username || "Ẩn danh"} vừa mua "${
        product.name
      }".`,
      type: "order",
      link: "/orders?type=sell",
    });

    return NextResponse.json(
      { message: "Đặt hàng thành công!", transactionId: transaction.id },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("API Transaction Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
