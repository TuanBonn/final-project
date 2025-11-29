import { type NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import path from "node:path";
import jwt from "jsonwebtoken";
import { format } from "date-fns";
import { parse as parseCookie } from "cookie";

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
const maxImageSize = 10 * 1024 * 1024;
const ALLOWED_BUCKETS = ["avatars", "products", "posts"];

interface JwtPayload {
  userId: string;
  [key: string]: unknown;
}
function getVerifiedUserIdFromToken(token: string | undefined): string | null {
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

    return payload?.userId ?? null;
  } catch (error) {
    console.error(
      "[getVerifiedUserIdFromToken] Token verification failed:",
      error
    );
    return null;
  }
}

export async function POST(req: NextRequest) {
  if (!supabaseUrl || !supabaseServiceKey || !JWT_SECRET) {
    console.error("API Upload: Server configuration missing!");
    return NextResponse.json(
      { message: "Lỗi cấu hình server." },
      { status: 500 }
    );
  }

  let token: string | undefined = undefined;
  try {
    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader) {
      const cookies = parseCookie(cookieHeader);
      token = cookies[COOKIE_NAME];
    }
  } catch (e) {
    console.error("API Upload: Error parsing cookie header:", e);
  }

  const userId = getVerifiedUserIdFromToken(token);
  if (!userId) {
    console.log("API Upload: Authentication failed (no valid user ID).");
    return NextResponse.json({ message: "Yêu cầu xác thực." }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bucketName = formData.get("bucketName") as string | null;

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

    const fileExtension = path.extname(file.name).toLowerCase();
    const dateFolder = format(new Date(), "yyyy-MM-dd");
    const uniqueFileName = uuidv4();
    const storagePath = `${dateFolder}/${uniqueFileName}${fileExtension}`;

    let adminClient: SupabaseClient | null = null;
    try {
      adminClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      });
      if (!adminClient)
        throw new Error("Admin client creation returned null/undefined.");
    } catch (clientError) {
      console.error("API Upload: LỖI KHỞI TẠO ADMIN CLIENT:", clientError);
      return NextResponse.json(
        { message: "Lỗi cấu hình client Supabase." },
        { status: 500 }
      );
    }

    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from(bucketName)
      .upload(storagePath, file, { upsert: false });

    if (uploadError) {
      console.error(
        `API Upload: Lỗi Supabase Storage bucket '${bucketName}':`,
        uploadError
      );

      return NextResponse.json(
        { message: `Lỗi Storage: ${uploadError.message}` },
        { status: 500 }
      );
    }
    if (!uploadData?.path) {
      console.error("[API Upload] Upload OK nhưng thiếu path:", uploadData);

      await adminClient.storage
        .from(bucketName)
        .remove([storagePath])
        .catch((e) => console.error("Rollback failed", e));
      return NextResponse.json(
        { message: "Lỗi xử lý kết quả upload." },
        { status: 500 }
      );
    }

    let publicUrl: string | undefined;
    try {
      const { data: urlData } = adminClient.storage
        .from(bucketName)
        .getPublicUrl(storagePath);
      if (!urlData?.publicUrl)
        throw new Error("Could not retrieve public URL after upload.");
      publicUrl = urlData.publicUrl;
    } catch (getUrlError) {
      console.error("API Upload: Lỗi khi lấy Public URL:", getUrlError);

      await adminClient.storage
        .from(bucketName)
        .remove([storagePath])
        .catch((e) => console.error("Rollback failed", e));
      return NextResponse.json(
        { message: "Lỗi lấy URL sau khi upload." },
        { status: 500 }
      );
    }

    console.log("API Upload: Hoàn thành, trả về URL.");
    return NextResponse.json(
      { message: "Tải ảnh lên thành công!", publicUrl: publicUrl },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[API Upload] LỖI BẤT NGỜ TRONG TRY BLOCK CHÍNH:", error);
    let errorMessage = "Lỗi server không xác định.";
    if (error instanceof Error) errorMessage = error.message;
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
