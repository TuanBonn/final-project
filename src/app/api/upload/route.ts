// src/app/api/upload/route.ts
// Tối ưu + Đảm bảo adminClient

import { type NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js"; // Import thêm SupabaseClient
import { v4 as uuidv4 } from "uuid";
import path from "node:path";
import jwt from "jsonwebtoken";
import { format } from "date-fns";
import { parse as parseCookie } from "cookie";

// --- Cấu hình ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = "auth-token";
const allowedImageTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];
const maxImageSize = 10 * 1024 * 1024; // 10MB
const ALLOWED_BUCKETS = ["avatars", "products", "posts"];

// --- Hàm xác thực JWT (Giữ nguyên) ---
interface JwtPayload {
  userId: string;
  [key: string]: unknown;
}
function getVerifiedUserIdFromToken(token: string | undefined): string | null {
  // console.log("[getVerifiedUserIdFromToken] Checking token..."); // Log nếu cần
  if (!JWT_SECRET) {
    console.error("JWT_SECRET missing!");
    return null;
  }
  if (!token) {
    console.log("[getVerifiedUserIdFromToken] No token found.");
    return null;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    // console.log("[getVerifiedUserIdFromToken] Token verified. UserID:", payload?.userId);
    return payload?.userId ?? null;
  } catch (error) {
    console.error(
      "[getVerifiedUserIdFromToken] Token verification failed:",
      error
    );
    return null;
  }
}

// --- Hàm xử lý POST request ---
export async function POST(req: NextRequest) {
  // console.log("API Upload: POST request started."); // Log

  // --- Kiểm tra cấu hình ---
  if (!supabaseUrl || !supabaseServiceKey || !JWT_SECRET) {
    console.error("API Upload: Server configuration missing!");
    return NextResponse.json(
      { message: "Lỗi cấu hình server." },
      { status: 500 }
    );
  }

  // --- Lấy token từ header ---
  let token: string | undefined = undefined;
  try {
    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader) {
      const cookies = parseCookie(cookieHeader);
      token = cookies[COOKIE_NAME];
    }
    // console.log("API Upload: Token from header:", token ? "Found" : "Not Found");
  } catch (e) {
    console.error("API Upload: Error parsing cookie header:", e);
  }

  // --- Xác thực User ---
  const userId = getVerifiedUserIdFromToken(token);
  if (!userId) {
    console.log("API Upload: Authentication failed (no valid user ID).");
    return NextResponse.json({ message: "Yêu cầu xác thực." }, { status: 401 });
  }
  // console.log("API Upload: User authenticated:", userId);

  // --- Bọc toàn bộ logic upload trong try...catch ---
  try {
    // --- Lấy FormData ---
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bucketName = formData.get("bucketName") as string | null;

    // --- Kiểm tra Input ---
    if (!file)
      return NextResponse.json({ message: "Không có file." }, { status: 400 });
    if (!bucketName || !ALLOWED_BUCKETS.includes(bucketName))
      return NextResponse.json(
        { error: "Bucket không hợp lệ." },
        { status: 400 }
      );
    if (!allowedImageTypes.includes(file.type))
      return NextResponse.json(
        { message: `Loại file không hợp lệ.` },
        { status: 400 }
      );
    if (file.size > maxImageSize)
      return NextResponse.json(
        { message: `File quá lớn (${maxImageSize / 1024 / 1024}MB max).` },
        { status: 413 }
      );

    // --- Tạo đường dẫn ---
    const fileExtension = path.extname(file.name).toLowerCase();
    const dateFolder = format(new Date(), "yyyy-MM-dd");
    const uniqueFileName = uuidv4();
    const storagePath = `${dateFolder}/${uniqueFileName}${fileExtension}`;

    // === KHỞI TẠO ADMIN CLIENT NGAY TRƯỚC KHI DÙNG ===
    let adminClient: SupabaseClient | null = null; // Khai báo kiểu rõ ràng
    try {
      adminClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      });
      if (!adminClient)
        throw new Error("Admin client creation returned null/undefined.");
      // console.log("API Upload: Admin Client created for upload."); // Log
    } catch (clientError) {
      console.error("API Upload: LỖI KHỞI TẠO ADMIN CLIENT:", clientError);
      return NextResponse.json(
        { message: "Lỗi cấu hình client Supabase." },
        { status: 500 }
      );
    }
    // ===========================================

    // --- Upload file ---
    // console.log(`API Upload: Uploading to: ${storagePath} in ${bucketName}`);
    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from(bucketName)
      .upload(storagePath, file, { upsert: false });

    // --- Xử lý lỗi Upload ---
    if (uploadError) {
      console.error(
        `API Upload: Lỗi Supabase Storage bucket '${bucketName}':`,
        uploadError
      );
      // Có thể thêm phân tích lỗi chi tiết ở đây nếu muốn
      return NextResponse.json(
        { message: `Lỗi Storage: ${uploadError.message}` },
        { status: 500 }
      );
    }
    if (!uploadData?.path) {
      console.error("[API Upload] Upload OK nhưng thiếu path:", uploadData);
      // Cố rollback
      await adminClient.storage
        .from(bucketName)
        .remove([storagePath])
        .catch((e) => console.error("Rollback failed", e));
      return NextResponse.json(
        { message: "Lỗi xử lý kết quả upload." },
        { status: 500 }
      );
    }
    // console.log(`API Upload: Upload thành công, path: ${uploadData.path}`);

    // --- Lấy URL công khai ---
    let publicUrl: string | undefined;
    try {
      const { data: urlData } = adminClient.storage
        .from(bucketName)
        .getPublicUrl(storagePath);
      if (!urlData?.publicUrl)
        throw new Error("Could not retrieve public URL after upload.");
      publicUrl = urlData.publicUrl;
      // console.log(`API Upload: Public URL: ${publicUrl}`);
    } catch (getUrlError) {
      console.error("API Upload: Lỗi khi lấy Public URL:", getUrlError);
      // Cố rollback
      await adminClient.storage
        .from(bucketName)
        .remove([storagePath])
        .catch((e) => console.error("Rollback failed", e));
      return NextResponse.json(
        { message: "Lỗi lấy URL sau khi upload." },
        { status: 500 }
      );
    }

    // --- Trả về thành công ---
    console.log("API Upload: Hoàn thành, trả về URL."); // Log cuối
    return NextResponse.json(
      { message: "Tải ảnh lên thành công!", publicUrl: publicUrl },
      { status: 200 }
    );
  } catch (error: unknown) {
    // --- Catch Lỗi Tổng ---
    console.error("[API Upload] LỖI BẤT NGỜ TRONG TRY BLOCK CHÍNH:", error);
    let errorMessage = "Lỗi server không xác định.";
    if (error instanceof Error) errorMessage = error.message;
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
