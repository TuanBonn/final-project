// // src/app/api/admin/payments/[id]/route.ts
// import { NextResponse, type NextRequest } from "next/server";
// import { createClient, SupabaseClient } from "@supabase/supabase-js";
// import { parse as parseCookie } from "cookie";
// import jwt from "jsonwebtoken";
// // Import hàm gửi mail
// import { sendWalletTransactionEmail } from "@/lib/mail";

// export const runtime = "nodejs";

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
// const JWT_SECRET = process.env.JWT_SECRET;
// const COOKIE_NAME = "auth-token";

// function getSupabaseAdmin(): SupabaseClient | null {
//   if (!supabaseUrl || !supabaseServiceKey) return null;
//   return createClient(supabaseUrl, supabaseServiceKey, {
//     auth: { persistSession: false },
//   });
// }

// async function verifyAdmin(request: NextRequest): Promise<boolean> {
//   if (!JWT_SECRET) return false;
//   try {
//     let token: string | undefined;
//     const cookieHeader = request.headers.get("cookie");
//     if (cookieHeader) token = parseCookie(cookieHeader)[COOKIE_NAME];
//     if (!token) return false;
//     const decoded = jwt.verify(token, JWT_SECRET) as any;
//     return decoded.role === "admin";
//   } catch {
//     return false;
//   }
// }

// export async function PATCH(
//   request: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   if (!(await verifyAdmin(request))) {
//     return NextResponse.json({ error: "Forbidden" }, { status: 403 });
//   }

//   const { id } = await params;
//   const supabase = getSupabaseAdmin();

//   try {
//     const { status } = await request.json(); // 'succeeded' hoặc 'failed'

//     // 1. Lấy thông tin payment + Thông tin User (để lấy email)
//     const { data: payment } = await supabase!
//       .from("platform_payments")
//       .select("*, user:users(email, username, balance)") // <-- Lấy thêm email, username
//       .eq("id", id)
//       .single();

//     if (!payment)
//       return NextResponse.json({ error: "Not found" }, { status: 404 });

//     // Chỉ xử lý nếu đang pending
//     if (payment.status !== "pending") {
//       return NextResponse.json(
//         { error: "Giao dịch này đã được xử lý rồi." },
//         { status: 400 }
//       );
//     }

//     const userId = payment.user_id;
//     const amount = Number(payment.amount);
//     // Lấy thông tin user từ relation
//     // @ts-ignore
//     const userEmail = payment.user?.email;
//     // @ts-ignore
//     const userName = payment.user?.username || "User";
//     // @ts-ignore
//     const currentBalance = Number(payment.user?.balance || 0);

//     if (userId) {
//       // === LOGIC 1: DUYỆT NẠP TIỀN (Deposit -> Succeeded) ===
//       if (payment.payment_for_type === "deposit" && status === "succeeded") {
//         await supabase!
//           .from("users")
//           .update({ balance: currentBalance + amount })
//           .eq("id", userId);
//       }

//       // === LOGIC 2: TỪ CHỐI RÚT TIỀN (Withdrawal -> Failed) ===
//       else if (
//         payment.payment_for_type === "withdrawal" &&
//         status === "failed"
//       ) {
//         await supabase!
//           .from("users")
//           .update({ balance: currentBalance + amount })
//           .eq("id", userId);
//       }
//     }

//     // 3. Cập nhật trạng thái payment
//     const { error } = await supabase!
//       .from("platform_payments")
//       .update({ status })
//       .eq("id", id);

//     if (error) throw error;

//     // === 4. GỬI EMAIL THÔNG BÁO (MỚI) ===
//     if (userEmail) {
//       sendWalletTransactionEmail(
//         userEmail,
//         payment.payment_for_type, // 'deposit' | 'withdrawal'
//         status, // 'succeeded' | 'failed'
//         amount,
//         userName
//       ).catch((err) => console.error("Lỗi gửi mail wallet:", err));
//     }
//     // ====================================

//     return NextResponse.json(
//       { message: "Cập nhật thành công" },
//       { status: 200 }
//     );
//   } catch (error: any) {
//     console.error("Error processing payment:", error);
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }

// src/app/api/admin/payments/[id]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { parse as parseCookie } from "cookie";
import jwt from "jsonwebtoken";
import { sendWalletTransactionEmail } from "@/lib/mail";
import { createNotification } from "@/lib/notification"; // <-- Import helper

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = "auth-token";

function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  if (!JWT_SECRET) return false;
  try {
    let token: string | undefined;
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) token = parseCookie(cookieHeader)[COOKIE_NAME];
    if (!token) return false;
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded.role === "admin";
  } catch {
    return false;
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  try {
    const { status } = await request.json(); // 'succeeded' hoặc 'failed'

    // 1. Lấy thông tin payment + Thông tin User
    const { data: payment } = await supabase!
      .from("platform_payments")
      .select("*, user:users(email, username, balance)")
      .eq("id", id)
      .single();

    if (!payment)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (payment.status !== "pending") {
      return NextResponse.json(
        { error: "Giao dịch này đã được xử lý rồi." },
        { status: 400 }
      );
    }

    const userId = payment.user_id;
    const amount = Number(payment.amount);
    // @ts-ignore
    const userEmail = payment.user?.email;
    // @ts-ignore
    const userName = payment.user?.username || "User";
    // @ts-ignore
    const currentBalance = Number(payment.user?.balance || 0);

    const formattedAmount = new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);

    if (userId) {
      // === LOGIC 1: DUYỆT NẠP TIỀN ===
      if (payment.payment_for_type === "deposit") {
        if (status === "succeeded") {
          // Cộng tiền
          await supabase!
            .from("users")
            .update({ balance: currentBalance + amount })
            .eq("id", userId);

          // Gửi thông báo
          createNotification(supabase!, {
            userId: userId,
            title: "✅ Nạp tiền thành công",
            message: `Số tiền ${formattedAmount} đã được cộng vào ví của bạn.`,
            type: "wallet",
            link: "/wallet",
          });
        } else {
          // Từ chối
          createNotification(supabase!, {
            userId: userId,
            title: "❌ Nạp tiền thất bại",
            message: `Yêu cầu nạp ${formattedAmount} của bạn bị từ chối.`,
            type: "wallet",
            link: "/wallet",
          });
        }
      }
      // === LOGIC 2: RÚT TIỀN ===
      else if (payment.payment_for_type === "withdrawal") {
        if (status === "succeeded") {
          // Gửi thông báo
          createNotification(supabase!, {
            userId: userId,
            title: "✅ Rút tiền thành công",
            message: `Admin đã chuyển khoản ${formattedAmount} vào tài khoản của bạn.`,
            type: "wallet",
            link: "/wallet",
          });
        } else {
          // Hoàn tiền
          await supabase!
            .from("users")
            .update({ balance: currentBalance + amount })
            .eq("id", userId);

          // Gửi thông báo
          createNotification(supabase!, {
            userId: userId,
            title: "❌ Rút tiền bị hoàn trả",
            message: `Yêu cầu rút tiền của bạn bị từ chối. Tiền đã hoàn về ví.`,
            type: "wallet",
            link: "/wallet",
          });
        }
      }
    }

    // 3. Cập nhật trạng thái payment
    const { error } = await supabase!
      .from("platform_payments")
      .update({ status })
      .eq("id", id);

    if (error) throw error;

    // 4. Gửi Email (Background)
    if (userEmail) {
      sendWalletTransactionEmail(
        userEmail,
        payment.payment_for_type,
        status,
        amount,
        userName
      ).catch((err) => console.error("Lỗi gửi mail wallet:", err));
    }

    return NextResponse.json(
      { message: "Cập nhật thành công" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error processing payment:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
