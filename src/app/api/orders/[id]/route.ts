// // src/app/api/orders/[id]/route.ts
// import { NextResponse, type NextRequest } from "next/server";
// import { createClient, SupabaseClient } from "@supabase/supabase-js";
// import { parse as parseCookie } from "cookie";
// import jwt from "jsonwebtoken";

// export const runtime = "nodejs";

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
// const JWT_SECRET = process.env.JWT_SECRET;
// const COOKIE_NAME = "auth-token";

// interface JwtPayload {
//   userId: string;
//   [key: string]: unknown;
// }

// function getSupabaseAdmin(): SupabaseClient | null {
//   if (!supabaseUrl || !supabaseServiceKey) return null;
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
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   const userId = await getUserId(request);
//   if (!userId)
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//   const { id: orderId } = await params;
//   const supabase = getSupabaseAdmin();
//   if (!supabase)
//     return NextResponse.json({ error: "Config Error" }, { status: 500 });

//   try {
//     const { action } = await request.json();

//     // Lấy thông tin đơn hàng
//     const { data: order, error: fetchError } = await supabase
//       .from("transactions")
//       .select(
//         "id, status, buyer_id, seller_id, amount, platform_commission, product_id, quantity"
//       )
//       .eq("id", orderId)
//       .single();

//     if (fetchError || !order) {
//       return NextResponse.json(
//         { error: "Đơn hàng không tồn tại" },
//         { status: 404 }
//       );
//     }

//     let newStatus = order.status;
//     let successMessage = "Cập nhật thành công";

//     // --- LOGIC XỬ LÝ ---

//     // 1. HỦY ĐƠN
//     if (action === "cancel") {
//       if (order.buyer_id !== userId)
//         return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

//       if (!["initiated", "buyer_paid"].includes(order.status)) {
//         return NextResponse.json(
//           { error: "Không thể hủy đơn này" },
//           { status: 400 }
//         );
//       }

//       // HOÀN TIỀN (Nếu đã thanh toán qua Ví)
//       if (order.status === "buyer_paid") {
//         const { data: buyerWallet } = await supabase
//           .from("users")
//           .select("balance")
//           .eq("id", userId)
//           .single();

//         if (buyerWallet) {
//           // Cộng lại tiền vào User Balance
//           await supabase
//             .from("users")
//             .update({
//               balance: Number(buyerWallet.balance) + Number(order.amount),
//             })
//             .eq("id", userId);

//           // Ghi log lịch sử hoàn tiền
//           await supabase.from("platform_payments").insert({
//             user_id: userId,
//             amount: Number(order.amount),
//             payment_for_type: "deposit", // Coi như tiền nạp vào
//             status: "succeeded",
//             currency: "VND",
//             related_id: orderId, // Link tới đơn hàng để dễ tra cứu
//           });
//         }
//       }

//       newStatus = "cancelled";
//       successMessage = "Đã hủy đơn hàng";

//       // Hoàn lại kho
//       const orderQty = order.quantity || 1;
//       const { data: prod } = await supabase
//         .from("products")
//         .select("quantity")
//         .eq("id", order.product_id)
//         .single();

//       if (prod) {
//         await supabase
//           .from("products")
//           .update({
//             quantity: prod.quantity + orderQty,
//             status: "available",
//           })
//           .eq("id", order.product_id);
//       }
//     }

//     // 2. GỬI HÀNG
//     else if (action === "ship") {
//       if (order.seller_id !== userId)
//         return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
//       if (!["initiated", "buyer_paid"].includes(order.status))
//         return NextResponse.json(
//           { error: "Trạng thái không hợp lệ" },
//           { status: 400 }
//         );
//       newStatus = "seller_shipped";
//       successMessage = "Đã xác nhận gửi hàng";
//     }

//     // 3. NHẬN HÀNG -> CỘNG TIỀN CHO SELLER
//     else if (action === "confirm") {
//       if (order.buyer_id !== userId)
//         return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
//       if (order.status !== "seller_shipped")
//         return NextResponse.json(
//           { error: "Chưa thể xác nhận" },
//           { status: 400 }
//         );

//       newStatus = "completed";
//       successMessage = "Giao dịch hoàn tất!";

//       // Tính toán tiền
//       const commission = Number(order.amount) * 0.05; // Phí sàn 5%
//       const netAmount = Number(order.amount) - commission; // Tiền thực nhận

//       // A. Cộng tiền vào ví Seller
//       const { data: seller } = await supabase
//         .from("users")
//         .select("balance")
//         .eq("id", order.seller_id)
//         .single();

//       if (seller) {
//         await supabase
//           .from("users")
//           .update({ balance: Number(seller.balance) + netAmount })
//           .eq("id", order.seller_id);

//         // === BỔ SUNG: GHI LOG LỊCH SỬ CHO SELLER ===
//         await supabase.from("platform_payments").insert({
//           user_id: order.seller_id,
//           amount: netAmount,
//           payment_for_type: "deposit", // Dùng 'deposit' (tiền vào) hoặc bạn có thể thêm enum 'sales_revenue'
//           status: "succeeded",
//           currency: "VND",
//           related_id: orderId,
//         });
//         // ===========================================
//       }

//       // Lưu hoa hồng admin
//       await supabase
//         .from("transactions")
//         .update({ platform_commission: commission })
//         .eq("id", orderId);
//     }

//     // 4. KHIẾU NẠI
//     else if (action === "dispute") {
//       if (order.buyer_id !== userId)
//         return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
//       if (order.status !== "seller_shipped")
//         return NextResponse.json(
//           { error: "Trạng thái không hợp lệ" },
//           { status: 400 }
//         );
//       newStatus = "disputed";
//       successMessage = "Đã gửi khiếu nại.";
//     } else {
//       return NextResponse.json(
//         { error: "Hành động không xác định" },
//         { status: 400 }
//       );
//     }

//     // Cập nhật trạng thái đơn hàng
//     const { error: updateError } = await supabase
//       .from("transactions")
//       .update({ status: newStatus })
//       .eq("id", orderId);

//     if (updateError) throw updateError;

//     return NextResponse.json({ message: successMessage }, { status: 200 });
//   } catch (error: any) {
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }

// src/app/api/orders/[id]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { parse as parseCookie } from "cookie";
import jwt from "jsonwebtoken";
import { createNotification } from "@/lib/notification"; // <-- Import helper

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: orderId } = await params;
  const supabase = getSupabaseAdmin();
  if (!supabase)
    return NextResponse.json({ error: "Config Error" }, { status: 500 });

  try {
    const { action } = await request.json();

    // Lấy thông tin đơn hàng
    const { data: order, error: fetchError } = await supabase
      .from("transactions")
      .select(
        "id, status, buyer_id, seller_id, amount, platform_commission, product_id, quantity"
      )
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      return NextResponse.json(
        { error: "Đơn hàng không tồn tại" },
        { status: 404 }
      );
    }

    let newStatus = order.status;
    let successMessage = "Cập nhật thành công";

    // --- LOGIC XỬ LÝ ---

    // 1. HỦY ĐƠN
    if (action === "cancel") {
      if (order.buyer_id !== userId)
        return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

      if (!["initiated", "buyer_paid"].includes(order.status)) {
        return NextResponse.json(
          { error: "Không thể hủy đơn này" },
          { status: 400 }
        );
      }

      // HOÀN TIỀN (Nếu đã thanh toán qua Ví)
      if (order.status === "buyer_paid") {
        const { data: buyerWallet } = await supabase
          .from("users")
          .select("balance")
          .eq("id", userId)
          .single();

        if (buyerWallet) {
          // Cộng lại tiền vào User Balance
          await supabase
            .from("users")
            .update({
              balance: Number(buyerWallet.balance) + Number(order.amount),
            })
            .eq("id", userId);

          // Ghi log lịch sử hoàn tiền
          await supabase.from("platform_payments").insert({
            user_id: userId,
            amount: Number(order.amount),
            payment_for_type: "deposit",
            status: "succeeded",
            currency: "VND",
            related_id: orderId,
          });
        }
      }

      newStatus = "cancelled";
      successMessage = "Đã hủy đơn hàng";

      // Hoàn lại kho
      const orderQty = order.quantity || 1;
      const { data: prod } = await supabase
        .from("products")
        .select("quantity")
        .eq("id", order.product_id)
        .single();

      if (prod) {
        await supabase
          .from("products")
          .update({
            quantity: prod.quantity + orderQty,
            status: "available",
          })
          .eq("id", order.product_id);
      }

      // === THÔNG BÁO CHO NGƯỜI BÁN ===
      createNotification(supabase, {
        userId: order.seller_id,
        title: "❌ Đơn hàng đã bị hủy",
        message: `Khách hàng đã hủy đơn hàng ${formatCurrency(
          Number(order.amount)
        )}.`,
        type: "order",
        link: "/orders?type=sell",
      });
    }

    // 2. GỬI HÀNG
    else if (action === "ship") {
      if (order.seller_id !== userId)
        return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
      if (!["initiated", "buyer_paid"].includes(order.status))
        return NextResponse.json(
          { error: "Trạng thái không hợp lệ" },
          { status: 400 }
        );
      newStatus = "seller_shipped";
      successMessage = "Đã xác nhận gửi hàng";

      // === THÔNG BÁO CHO NGƯỜI MUA ===
      createNotification(supabase, {
        userId: order.buyer_id,
        title: "🚚 Đơn hàng đang được giao",
        message: `Shop đã gửi món hàng bạn đặt. Vui lòng chú ý điện thoại.`,
        type: "order",
        link: "/orders?type=buy",
      });
    }

    // 3. NHẬN HÀNG -> CỘNG TIỀN CHO SELLER
    else if (action === "confirm") {
      if (order.buyer_id !== userId)
        return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
      if (order.status !== "seller_shipped")
        return NextResponse.json(
          { error: "Chưa thể xác nhận" },
          { status: 400 }
        );

      newStatus = "completed";
      successMessage = "Giao dịch hoàn tất!";

      // Tính toán tiền
      const commission = Number(order.amount) * 0.05; // Phí sàn 5%
      const netAmount = Number(order.amount) - commission; // Tiền thực nhận

      // Cộng tiền vào ví Seller
      const { data: seller } = await supabase
        .from("users")
        .select("balance")
        .eq("id", order.seller_id)
        .single();

      if (seller) {
        await supabase
          .from("users")
          .update({ balance: Number(seller.balance) + netAmount })
          .eq("id", order.seller_id);

        // Ghi log lịch sử
        await supabase.from("platform_payments").insert({
          user_id: order.seller_id,
          amount: netAmount,
          payment_for_type: "deposit", // Tiền vào
          status: "succeeded",
          currency: "VND",
          related_id: orderId,
        });
      }

      // Lưu hoa hồng
      await supabase
        .from("transactions")
        .update({ platform_commission: commission })
        .eq("id", orderId);

      // === THÔNG BÁO CHO NGƯỜI BÁN ===
      createNotification(supabase, {
        userId: order.seller_id,
        title: "💰 Giao dịch thành công",
        message: `Khách đã nhận hàng. +${formatCurrency(
          netAmount
        )} đã được cộng vào ví.`,
        type: "wallet",
        link: "/wallet",
      });
    }

    // 4. KHIẾU NẠI
    else if (action === "dispute") {
      if (order.buyer_id !== userId)
        return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
      if (order.status !== "seller_shipped")
        return NextResponse.json(
          { error: "Trạng thái không hợp lệ" },
          { status: 400 }
        );
      newStatus = "disputed";
      successMessage = "Đã gửi khiếu nại.";

      // === THÔNG BÁO CHO NGƯỜI BÁN ===
      createNotification(supabase, {
        userId: order.seller_id,
        title: "⚠️ Có khiếu nại mới",
        message: `Khách hàng báo cáo vấn đề về đơn hàng. Vui lòng kiểm tra gấp.`,
        type: "order",
        link: "/orders?type=sell",
      });
    } else {
      return NextResponse.json(
        { error: "Hành động không xác định" },
        { status: 400 }
      );
    }

    // Cập nhật DB
    const { error: updateError } = await supabase
      .from("transactions")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (updateError) throw updateError;

    return NextResponse.json({ message: successMessage }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper format
const formatCurrency = (val: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val
  );
