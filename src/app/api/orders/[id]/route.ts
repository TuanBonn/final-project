// // src/app/api/orders/[id]/route.ts
// import { NextResponse, type NextRequest } from "next/server";
// import { createClient, SupabaseClient } from "@supabase/supabase-js";
// import { parse as parseCookie } from "cookie";
// import jwt from "jsonwebtoken";
// import { createNotification } from "@/lib/notification";

// export const runtime = "nodejs";

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
// const JWT_SECRET = process.env.JWT_SECRET;
// const COOKIE_NAME = "auth-token";

// interface JwtPayload {
//   userId: string;
//   [key: string]: unknown;
// }

// function getSupabaseAdmin() {
//   return createClient(supabaseUrl, supabaseServiceKey, {
//     auth: { persistSession: false },
//   });
// }

// async function getUserId(request: NextRequest): Promise<string | null> {
//   if (!JWT_SECRET) return null;
//   try {
//     const cookieHeader = request.headers.get("cookie");
//     if (!cookieHeader) return null;
//     const token = parseCookie(cookieHeader)[COOKIE_NAME];
//     if (!token) return null;
//     const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
//     return decoded.userId;
//   } catch {
//     return null;
//   }
// }

// export async function PATCH(
//   request: NextRequest,
//   ctx: { params: Promise<{ id: string }> }
// ) {
//   const { id } = await ctx.params;
//   const userId = await getUserId(request);
//   if (!userId)
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//   const supabase = getSupabaseAdmin();

//   try {
//     const { action } = await request.json();

//     // Lấy thông tin đơn hàng
//     const { data: order } = await supabase
//       .from("transactions")
//       .select("*, product:products(name)")
//       .eq("id", id)
//       .single();

//     if (!order)
//       return NextResponse.json({ error: "Order not found" }, { status: 404 });

//     // === 1. HỦY ĐƠN (CANCEL) ===
//     if (action === "cancel") {
//       // ... (Giữ nguyên logic hủy như cũ)
//       if (order.buyer_id !== userId)
//         return NextResponse.json(
//           { error: "Chỉ người mua mới được hủy." },
//           { status: 403 }
//         );
//       if (order.auction_id || order.group_buy_id)
//         return NextResponse.json(
//           { error: "Không thể hủy đơn đặc biệt." },
//           { status: 403 }
//         );
//       if (order.status !== "initiated" && order.status !== "buyer_paid")
//         return NextResponse.json(
//           { error: "Trạng thái không hợp lệ." },
//           { status: 400 }
//         );

//       if (order.status === "buyer_paid" && order.payment_method === "wallet") {
//         const { data: buyer } = await supabase
//           .from("users")
//           .select("balance")
//           .eq("id", userId)
//           .single();
//         if (buyer) {
//           await supabase
//             .from("users")
//             .update({ balance: Number(buyer.balance) + Number(order.amount) })
//             .eq("id", userId);
//           await supabase.from("platform_payments").insert({
//             user_id: userId,
//             amount: order.amount,
//             payment_for_type: "withdrawal",
//             status: "succeeded",
//             currency: "VND",
//             related_id: id,
//           });
//         }
//       }

//       if (order.product_id) {
//         const { data: prod } = await supabase
//           .from("products")
//           .select("quantity")
//           .eq("id", order.product_id)
//           .single();
//         if (prod) {
//           await supabase
//             .from("products")
//             .update({ quantity: prod.quantity + (order.quantity || 1) })
//             .eq("id", order.product_id);
//         }
//       }

//       await supabase
//         .from("transactions")
//         .update({ status: "cancelled" })
//         .eq("id", id);
//       createNotification(supabase, {
//         userId: order.seller_id,
//         title: "Đơn bị hủy",
//         message: `Khách hủy đơn "${order.product?.name}".`,
//         type: "order",
//         link: "/orders?type=sell",
//       });
//       return NextResponse.json({ message: "Đã hủy đơn." }, { status: 200 });
//     }

//     // === 2. GỬI HÀNG (SHIP) ===
//     if (action === "ship") {
//       if (order.seller_id !== userId)
//         return NextResponse.json(
//           { error: "Quyền người bán." },
//           { status: 403 }
//         );
//       await supabase
//         .from("transactions")
//         .update({ status: "seller_shipped" })
//         .eq("id", id);
//       createNotification(supabase, {
//         userId: order.buyer_id,
//         title: "📦 Đơn hàng đang giao",
//         message: `Shop đã gửi đơn "${order.product?.name}".`,
//         type: "order",
//         link: "/orders",
//       });
//       return NextResponse.json(
//         { message: "Đã xác nhận gửi hàng." },
//         { status: 200 }
//       );
//     }

//     // === 3. NHẬN HÀNG (CONFIRM) - SỬA LOGIC TẠI ĐÂY ===
//     if (action === "confirm") {
//       if (order.buyer_id !== userId)
//         return NextResponse.json(
//           { error: "Quyền người mua." },
//           { status: 403 }
//         );
//       if (order.status !== "seller_shipped")
//         return NextResponse.json(
//           { error: "Trạng thái không hợp lệ" },
//           { status: 400 }
//         );

//       // Tính toán hoa hồng (Ví dụ 5%)
//       // Bạn có thể lấy tỷ lệ này từ bảng app_settings nếu muốn
//       const commissionRate = 0.05;
//       const commission = Number(order.amount) * commissionRate;
//       const netIncome = Number(order.amount) - commission;

//       const { data: seller } = await supabase
//         .from("users")
//         .select("balance")
//         .eq("id", order.seller_id)
//         .single();

//       if (seller) {
//         const currentBalance = Number(seller.balance);

//         // --- LOGIC CHO COD: TRỪ TIỀN NGƯỜI BÁN ---
//         if (order.payment_method === "cod") {
//           const newBalance = currentBalance - commission;

//           // 1. Trừ tiền ví
//           await supabase
//             .from("users")
//             .update({ balance: newBalance })
//             .eq("id", order.seller_id);

//           // 2. Ghi log trừ tiền (transaction_commission)
//           await supabase.from("platform_payments").insert({
//             user_id: order.seller_id,
//             amount: commission,
//             payment_for_type: "transaction_commission", // Loại log trừ tiền phí
//             status: "succeeded",
//             currency: "VND",
//             related_id: id,
//           });

//           // 3. Thông báo
//           createNotification(supabase, {
//             userId: order.seller_id,
//             title: "✅ Đơn COD hoàn tất",
//             message: `Khách đã nhận đơn COD "${order.product?.name}". Hệ thống đã trừ phí sàn ${commission}đ từ ví của bạn.`,
//             type: "wallet",
//             link: "/wallet",
//           });
//         }
//         // --- LOGIC CHO WALLET: CỘNG TIỀN NGƯỜI BÁN (TIỀN HÀNG - PHÍ) ---
//         else {
//           const newBalance = currentBalance + netIncome;

//           // 1. Cộng tiền ví
//           await supabase
//             .from("users")
//             .update({ balance: newBalance })
//             .eq("id", order.seller_id);

//           // 2. Ghi log cộng tiền (deposit)
//           await supabase.from("platform_payments").insert({
//             user_id: order.seller_id,
//             amount: netIncome,
//             payment_for_type: "deposit", // Loại log cộng tiền
//             status: "succeeded",
//             currency: "VND",
//             related_id: id,
//           });

//           // 3. Thông báo
//           createNotification(supabase, {
//             userId: order.seller_id,
//             title: "💰 Tiền về ví",
//             message: `Đơn "${order.product?.name}" hoàn tất. +${netIncome}đ vào ví (đã trừ phí sàn).`,
//             type: "wallet",
//             link: "/wallet",
//           });
//         }
//       }

//       // Update trạng thái đơn hàng -> Completed
//       await supabase
//         .from("transactions")
//         .update({
//           status: "completed",
//           platform_commission: commission,
//         })
//         .eq("id", id);

//       return NextResponse.json(
//         { message: "Đã xác nhận nhận hàng!" },
//         { status: 200 }
//       );
//     }

//     // === 4. KHIẾU NẠI (DISPUTE) ===
//     if (action === "dispute") {
//       await supabase
//         .from("transactions")
//         .update({ status: "disputed" })
//         .eq("id", id);
//       return NextResponse.json(
//         { message: "Đã gửi khiếu nại. Admin sẽ xem xét." },
//         { status: 200 }
//       );
//     }

//     return NextResponse.json({ error: "Invalid action" }, { status: 400 });
//   } catch (error: any) {
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }

// src/app/api/orders/[id]/route.ts
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

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();

  try {
    const { action } = await request.json();

    // Lấy thông tin đơn hàng
    const { data: order } = await supabase
      .from("transactions")
      .select("*, product:products(name)")
      .eq("id", id)
      .single();

    if (!order)
      return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // === 1. HỦY ĐƠN (CANCEL) ===
    if (action === "cancel") {
      if (order.buyer_id !== userId)
        return NextResponse.json(
          { error: "Chỉ người mua mới được hủy." },
          { status: 403 }
        );

      // Không cho hủy đơn Group Buy hoặc Auction đã chốt
      if (order.auction_id || order.group_buy_id)
        return NextResponse.json(
          { error: "Không thể hủy đơn đặc biệt (Đấu giá/Mua chung)." },
          { status: 403 }
        );

      if (order.status !== "initiated" && order.status !== "buyer_paid")
        return NextResponse.json(
          { error: "Trạng thái không hợp lệ." },
          { status: 400 }
        );

      // Hoàn tiền nếu đã thanh toán qua ví
      if (order.status === "buyer_paid" && order.payment_method === "wallet") {
        const { data: buyer } = await supabase
          .from("users")
          .select("balance")
          .eq("id", userId)
          .single();
        if (buyer) {
          await supabase
            .from("users")
            .update({ balance: Number(buyer.balance) + Number(order.amount) })
            .eq("id", userId);

          await supabase.from("platform_payments").insert({
            user_id: userId,
            amount: order.amount,
            payment_for_type: "deposit", // Refund tính là nạp lại
            status: "succeeded",
            currency: "VND",
            related_id: id,
          });
        }
      }

      // Hoàn tồn kho
      if (order.product_id) {
        const { data: prod } = await supabase
          .from("products")
          .select("quantity")
          .eq("id", order.product_id)
          .single();
        if (prod) {
          await supabase
            .from("products")
            .update({ quantity: prod.quantity + (order.quantity || 1) })
            .eq("id", order.product_id);
        }
      }

      await supabase
        .from("transactions")
        .update({ status: "cancelled" })
        .eq("id", id);

      createNotification(supabase, {
        userId: order.seller_id,
        title: "Đơn bị hủy",
        message: `Khách hủy đơn "${order.product?.name}".`,
        type: "order",
        link: "/orders?type=sell",
      });

      return NextResponse.json({ message: "Đã hủy đơn." }, { status: 200 });
    }

    // === 2. GỬI HÀNG (SHIP) ===
    if (action === "ship") {
      if (order.seller_id !== userId)
        return NextResponse.json(
          { error: "Quyền người bán." },
          { status: 403 }
        );

      await supabase
        .from("transactions")
        .update({ status: "seller_shipped" })
        .eq("id", id);

      createNotification(supabase, {
        userId: order.buyer_id,
        title: "📦 Đơn hàng đang giao",
        message: `Shop đã gửi đơn "${order.product?.name}".`,
        type: "order",
        link: "/orders",
      });

      return NextResponse.json(
        { message: "Đã xác nhận gửi hàng." },
        { status: 200 }
      );
    }

    // === 3. NHẬN HÀNG (CONFIRM) ===
    if (action === "confirm") {
      if (order.buyer_id !== userId)
        return NextResponse.json(
          { error: "Quyền người mua." },
          { status: 403 }
        );
      if (order.status !== "seller_shipped")
        return NextResponse.json(
          { error: "Trạng thái không hợp lệ" },
          { status: 400 }
        );

      // Tính toán hoa hồng (Ví dụ 5%)
      const commissionRate = 0.05;
      const commission = Number(order.amount) * commissionRate;
      const netIncome = Number(order.amount) - commission;

      const { data: seller } = await supabase
        .from("users")
        .select("balance")
        .eq("id", order.seller_id)
        .single();

      if (seller) {
        const currentBalance = Number(seller.balance);

        // --- LOGIC CHO COD: TRỪ TIỀN PHÍ TỪ VÍ NGƯỜI BÁN ---
        if (order.payment_method === "cod") {
          const newBalance = currentBalance - commission;

          // 1. Trừ tiền ví
          await supabase
            .from("users")
            .update({ balance: newBalance })
            .eq("id", order.seller_id);

          // 2. Ghi log trừ tiền phí
          await supabase.from("platform_payments").insert({
            user_id: order.seller_id,
            amount: commission,
            payment_for_type: "transaction_commission",
            status: "succeeded",
            currency: "VND",
            related_id: id,
          });

          createNotification(supabase, {
            userId: order.seller_id,
            title: "✅ Đơn COD hoàn tất",
            message: `Khách đã nhận đơn COD "${order.product?.name}". Hệ thống đã trừ phí sàn ${commission}đ.`,
            type: "wallet",
            link: "/wallet",
          });
        }
        // --- LOGIC CHO WALLET: CỘNG TIỀN (NET) VÀO VÍ NGƯỜI BÁN ---
        else {
          const newBalance = currentBalance + netIncome;

          // 1. Cộng tiền ví
          await supabase
            .from("users")
            .update({ balance: newBalance })
            .eq("id", order.seller_id);

          // 2. Ghi log cộng tiền
          await supabase.from("platform_payments").insert({
            user_id: order.seller_id,
            amount: netIncome,
            payment_for_type: "deposit", // Doanh thu bán hàng
            status: "succeeded",
            currency: "VND",
            related_id: id,
          });

          createNotification(supabase, {
            userId: order.seller_id,
            title: "💰 Tiền về ví",
            message: `Đơn "${order.product?.name}" hoàn tất. +${netIncome}đ vào ví.`,
            type: "wallet",
            link: "/wallet",
          });
        }
      }

      // Update trạng thái đơn hàng -> Completed
      await supabase
        .from("transactions")
        .update({
          status: "completed",
          platform_commission: commission,
        })
        .eq("id", id);

      // === [LOGIC MỚI: KIỂM TRA GROUP BUY COMPLETION] ===
      if (order.group_buy_id) {
        // 1. Kiểm tra xem còn đơn hàng nào CỦA GROUP BUY NÀY chưa hoàn thành không?
        const { count: unfinishedCount } = await supabase
          .from("transactions")
          .select("*", { count: "exact", head: true })
          .eq("group_buy_id", order.group_buy_id)
          .neq("status", "completed") // Đếm những đơn CHƯA completed
          .neq("status", "cancelled"); // Bỏ qua đơn đã hủy (nếu có)

        // 2. Nếu không còn đơn nào chưa xong (count == 0) -> Mark Group Buy as completed
        if (unfinishedCount === 0) {
          await supabase
            .from("group_buys")
            .update({ status: "completed" }) // Trạng thái này sẽ làm ẩn Group Buy khỏi list active
            .eq("id", order.group_buy_id);

          // Gửi thông báo cho Host là Group Buy đã hoàn tất 100%
          await createNotification(supabase, {
            userId: order.seller_id, // Host cũng là Seller trong ngữ cảnh này
            title: "🏁 Kèo Mua chung hoàn tất",
            message: `Tất cả đơn hàng của kèo "${order.product?.name}" đã giao thành công. Kèo đã được đóng lại.`,
            type: "system",
          });
        }
      }
      // =================================================

      return NextResponse.json(
        { message: "Đã xác nhận nhận hàng!" },
        { status: 200 }
      );
    }

    // === 4. KHIẾU NẠI (DISPUTE) ===
    if (action === "dispute") {
      await supabase
        .from("transactions")
        .update({ status: "disputed" })
        .eq("id", id);
      return NextResponse.json(
        { message: "Đã gửi khiếu nại. Admin sẽ xem xét." },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
