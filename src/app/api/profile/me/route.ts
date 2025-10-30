// // src/app/api/profile/me/route.ts
// // Vá lỗi import 'cookie' trong hàm PATCH (lần nữa!)

// import { NextResponse } from "next/server";
// import { cookies } from "next/headers"; // Dùng cho GET
// import jwt from "jsonwebtoken";
// import { createClient } from "@supabase/supabase-js"; // Client cơ bản
// // === SỬA LẠI IMPORT NÀY ===
// import { parse as parseCookie } from "cookie"; // Dùng named import 'parse' cho hàm PATCH
// // ==========================

// // --- Cấu hình ---
// const COOKIE_NAME = "auth-token";
// const JWT_SECRET = process.env.JWT_SECRET;
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Dùng cho PATCH

// // --- Interface Payload JWT ---
// interface JwtPayload {
//   /* ... */
// }

// // === HÀM GET (Giữ nguyên như trước) ===
// export async function GET(request: Request) {
//   /* ... code hàm GET ... */
// }

// // === HÀM PATCH (Đã sửa lỗi import cookie) ===
// export async function PATCH(request: Request) {
//   // console.log("API /me PATCH: Bắt đầu");
//   if (!JWT_SECRET || !supabaseUrl || !supabaseServiceKey) {
//     /* ... check config ... */
//   }

//   // --- Lấy token từ header (dùng thư viện cookie đã sửa import) ---
//   let token: string | undefined = undefined;
//   try {
//     const cookieHeader = request.headers.get("cookie");
//     // console.log("API PATCH /me: Received Cookie Header:", cookieHeader);
//     if (cookieHeader) {
//       const cookiesParsed = parseCookie(cookieHeader); // <-- SỬA Ở ĐÂY: Dùng parseCookie
//       token = cookiesParsed[COOKIE_NAME];
//     }
//     // console.log("API PATCH /me: Token extracted via 'cookie' lib:", token ? "Tìm thấy" : "KHÔNG TÌM THẤY");
//   } catch (e) {
//     console.error("API PATCH /me: Lỗi đọc cookie header:", e);
//   }
//   // ===============================================

//   // --- Xác thực token ---
//   let userId: string;
//   try {
//     if (!token) throw new jwt.JsonWebTokenError("Token not found in header");
//     const decoded = jwt.verify(token, JWT_SECRET!) as JwtPayload; // Thêm ! cho JWT_SECRET
//     if (!decoded?.userId)
//       throw new Error("Invalid token payload (missing userId)");
//     userId = decoded.userId;
//     // console.log("API PATCH /me: User hợp lệ:", userId);
//   } catch (error) {
//     console.error("API PATCH /me: Lỗi xác thực token:", error);
//     return NextResponse.json(
//       { error: "Yêu cầu xác thực hoặc token không hợp lệ." },
//       { status: 401 }
//     );
//   }

//   // --- Khởi tạo Admin Client (Dùng Service Key) ---
//   let supabaseAdmin;
//   try {
//     supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!, {
//       // Thêm ! cho key
//       auth: { persistSession: false },
//     });
//     if (!supabaseAdmin) throw new Error("Admin client creation failed.");
//     // console.log("API PATCH /me: Admin Client created.");
//   } catch (clientError) {
//     /* ... lỗi client init ... */
//   }

//   // --- Xử lý logic cập nhật ---
//   try {
//     const body = await request.json();
//     const { fullName, username, avatarUrl } = body;
//     const updateData: {
//       full_name?: string;
//       username?: string;
//       avatar_url?: string;
//     } = {};

//     // --- Validation & Prepare Data (giữ nguyên logic) ---
//     // ... (code chuẩn bị updateData, check username unique bằng supabaseAdmin) ...
//     if (fullName !== undefined && fullName.trim() !== "")
//       updateData.full_name = fullName.trim();
//     if (username !== undefined) {
//       /* ... logic check unique ... */
//     }
//     if (
//       avatarUrl !== undefined &&
//       typeof avatarUrl === "string" &&
//       avatarUrl.startsWith("http")
//     )
//       updateData.avatar_url = avatarUrl;

//     if (Object.keys(updateData).length === 0) {
//       /* ... trả về profile hiện tại (dùng adminClient để fetch) ... */
//     }

//     // --- Update DB (DÙNG ADMIN CLIENT) ---
//     // console.log("API PATCH /me: Updating user (as admin):", userId, "with:", updateData);
//     const { data: updatedProfile, error: updateError } = await supabaseAdmin // <-- Dùng adminClient
//       .from("users")
//       .update(updateData)
//       .eq("id", userId)
//       .select("*")
//       .single();

//     // ... (Xử lý lỗi Update, PGRST116, 23505) ...
//     if (updateError) throw updateError;
//     if (!updatedProfile)
//       throw new Error("Update OK but no profile data returned.");

//     delete (updatedProfile as any).password_hash;
//     // console.log("API PATCH /me: Update thành công (admin).");
//     return NextResponse.json(
//       { profile: updatedProfile, message: "Cập nhật thành công!" },
//       { status: 200 }
//     );
//   } catch (error: unknown) {
//     // Catch lỗi trong logic update
//     console.error("API PATCH /me: LỖI BẤT NGỜ TRONG TRY BLOCK CHÍNH:", error);
//     let errorMessage = "Lỗi server không xác định khi cập nhật.";
//     // ... (xử lý lỗi chi tiết hơn) ...
//     return NextResponse.json({ error: errorMessage }, { status: 500 });
//   }
// }

// src/app/api/profile/me/route.ts
// GET uses basic client, PATCH uses Admin client with detailed error logging

import { NextResponse } from "next/server";
import { cookies } from "next/headers"; // Used for GET
import jwt from "jsonwebtoken";
import { createClient, SupabaseClient } from "@supabase/supabase-js"; // Basic client & Admin
import { parse as parseCookie } from "cookie"; // Used for PATCH

// --- Configuration ---
const COOKIE_NAME = "auth-token";
const JWT_SECRET = process.env.JWT_SECRET;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Used for PATCH

// --- JWT Payload Interface ---
interface JwtPayload {
  userId: string;
  email: string;
  role?: string;
}

// === GET Request: Fetch current user's profile ===
// Uses basic client + JWT verification. Relies on RLS for SELECT on 'users' table.
export async function GET(request: Request) {
  // console.log("API /me GET: Starting...");
  if (!JWT_SECRET || !supabaseUrl || !supabaseAnonKey) {
    console.error("API /me GET: Missing .env config");
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 500 }
    );
  }

  // --- Read Cookie using Next.js helper ---
  let token: string | undefined = undefined;
  try {
    console.log("API /me GET: Attempting to read cookies...");
    const cookieStore = cookies();
    token = cookieStore.get(COOKIE_NAME)?.value;
    console.log("API /me GET: Token read:", token ? "Found" : "Missing");
  } catch (error) {
    // Catch potential errors from cookies() itself
    console.error("API /me GET: Error reading cookies:", error);
    return NextResponse.json(
      { error: "Server error reading session." },
      { status: 500 }
    );
  }
  // ------------------------------------

  if (!token) {
    // console.log("API /me GET: No token found -> 401");
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  // --- Main Logic within Try/Catch ---
  try {
    // Verify Token
    // console.log("API /me GET: Verifying token...");
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    // console.log("API /me GET: Token valid, User ID:", decoded.userId);

    // Initialize Basic Client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Fetch Profile
    // console.log("API /me GET: Fetching profile...");
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select(
        "id, email, username, full_name, avatar_url, role, is_verified, reputation_score, created_at"
      )
      .eq("id", decoded.userId)
      .single();

    // Handle DB Errors
    if (profileError) {
      console.error("API /me GET: DB error fetching profile:", profileError);
      if (profileError.code === "PGRST116")
        return NextResponse.json(
          { error: "Profile not found." },
          { status: 404 }
        );
      return NextResponse.json({ error: "DB query error." }, { status: 500 });
    }
    // Handle case where query is successful but no data (shouldn't happen with .single())
    if (!userProfile) {
      console.error(
        `API /me GET: Query OK but profile is null/undefined for ID ${decoded.userId}?`
      );
      return NextResponse.json(
        { error: "Profile data not found (logic error)." },
        { status: 404 }
      );
    }

    // Remove sensitive data
    delete (userProfile as any).password_hash;
    // console.log("API /me GET: Success, returning profile.");
    // Return Success
    return NextResponse.json({ profile: userProfile }, { status: 200 });
  } catch (error: unknown) {
    // Catch JWT errors or unexpected errors
    console.error("API /me GET: ERROR IN MAIN TRY-CATCH:", error);
    let errorMessage = "Server error.";
    let statusCode = 500;
    if (error instanceof jwt.JsonWebTokenError) {
      errorMessage = "Invalid or expired token.";
      statusCode = 401;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    // Ensure a response is always returned on error
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
  // This line should be unreachable
  // console.error("API /me GET: !!! CRITICAL ERROR: Reached end without returning!");
  // return NextResponse.json({ error: 'Internal server error (unreachable code).' }, { status: 500 });
}

// === PATCH Request: Update current user's profile ===
// Uses Admin client (Service Key) to bypass RLS for update. Includes detailed error logging.
export async function PATCH(request: Request) {
  // console.log("API /me PATCH: Starting...");
  if (!JWT_SECRET || !supabaseUrl || !supabaseServiceKey) {
    console.error("API /me PATCH: Missing .env config");
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 500 }
    );
  }

  // --- Get token from header using 'cookie' library ---
  let token: string | undefined = undefined;
  try {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const cookiesParsed = parseCookie(cookieHeader); // Use parseCookie here
      token = cookiesParsed[COOKIE_NAME];
    }
    // console.log("API PATCH /me: Token from header:", token ? "Found" : "Missing");
  } catch (e) {
    console.error("API PATCH /me: Error parsing cookie header:", e);
  }

  // --- Verify token ---
  let userId: string;
  try {
    if (!token) throw new jwt.JsonWebTokenError("Token not found in header");
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (!decoded?.userId)
      throw new Error("Invalid token payload (missing userId)");
    userId = decoded.userId;
    // console.log("API PATCH /me: User valid:", userId);
  } catch (error) {
    console.error("API PATCH /me: Token verification failed:", error);
    return NextResponse.json(
      { error: "Authentication required or token invalid." },
      { status: 401 }
    );
  }

  // --- Initialize Admin Client (Service Key) ---
  let supabaseAdmin: SupabaseClient | null = null;
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
    if (!supabaseAdmin)
      throw new Error("Admin client creation returned null/undefined.");
    // console.log("API PATCH /me: Admin Client created.");
  } catch (clientError) {
    console.error("API PATCH /me: FAILED TO CREATE ADMIN CLIENT:", clientError);
    return NextResponse.json(
      { message: "Server config error (Admin Client)." },
      { status: 500 }
    );
  }

  // --- Process Update Logic ---
  try {
    const body = await request.json();
    // console.log("API PATCH /me: Received body:", body);
    const { fullName, username, avatarUrl } = body;
    const updateData: {
      full_name?: string;
      username?: string;
      avatar_url?: string;
    } = {};

    // --- Validation & Prepare Data ---
    // console.log("API PATCH /me: Preparing update data...");
    if (fullName !== undefined && fullName.trim() !== "")
      updateData.full_name = fullName.trim();
    if (username !== undefined) {
      const trimmedUsername = username.trim();
      if (trimmedUsername && trimmedUsername.length < 3)
        return NextResponse.json(
          { error: "Username too short." },
          { status: 400 }
        );
      // Check unique using Admin Client
      if (trimmedUsername) {
        // console.log("API PATCH /me: Checking username uniqueness for:", trimmedUsername);
        const { data: existing, error: checkUniqueError } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("username", trimmedUsername)
          .neq("id", userId)
          .maybeSingle();
        if (checkUniqueError) throw checkUniqueError; // Throw DB error
        if (existing)
          return NextResponse.json(
            { error: "Username already exists." },
            { status: 409 }
          );
        updateData.username = trimmedUsername;
      } else {
        // Handle setting username to null if needed (depends on DB schema)
        // updateData.username = null;
      }
    }
    if (
      avatarUrl !== undefined &&
      typeof avatarUrl === "string" &&
      avatarUrl.startsWith("http")
    ) {
      updateData.avatar_url = avatarUrl;
    }

    // If nothing to update, fetch current profile and return
    if (Object.keys(updateData).length === 0) {
      // console.log("API PATCH /me: No text fields changed.");
      const { data: currentProfile, error: currentError } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();
      if (currentError) {
        console.error(
          "API PATCH /me: Error fetching current profile:",
          currentError
        );
        throw currentError;
      }
      if (currentProfile) delete (currentProfile as any).password_hash;
      return NextResponse.json(
        { profile: currentProfile, message: "No profile details changed." },
        { status: 200 }
      );
    }

    // --- Update DB using Admin Client ---
    console.log(
      "API PATCH /me: Attempting DB update for user:",
      userId,
      "with data:",
      updateData
    ); // LOG BEFORE UPDATE
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from("users")
      .update(updateData)
      .eq("id", userId)
      .select("*") // Select all columns to return
      .single(); // Expect one row back

    // Log update results
    console.log("API PATCH /me: DB update completed."); // LOG AFTER UPDATE

    // Handle Update Errors (including not found - PGRST116)
    if (updateError) {
      console.error("API PATCH /me: DB UPDATE FAILED:", updateError); // Log detailed error
      if (updateError.code === "23505")
        return NextResponse.json(
          { error: "Username already exists (DB)." },
          { status: 409 }
        );
      if (updateError.code === "PGRST116")
        return NextResponse.json(
          { error: "User not found for update." },
          { status: 404 }
        );
      throw updateError; // Throw other DB errors
    }
    // Check if profile data was actually returned
    if (!updatedProfile) {
      console.error(
        "API PATCH /me: Update OK but profile data is missing after select?"
      );
      throw new Error(
        "Update successful but failed to retrieve updated profile."
      );
    }
    console.log("API PATCH /me: DB update successful, profile fetched."); // LOG SUCCESS

    delete (updatedProfile as any).password_hash; // Remove hash
    return NextResponse.json(
      { profile: updatedProfile, message: "Profile updated successfully!" },
      { status: 200 }
    ); // Return success
  } catch (error: unknown) {
    // Catch errors during update logic (DB, JSON parse, etc.)
    // === DETAILED ERROR LOGGING ADDED HERE ===
    console.error("API PATCH /me: UNEXPECTED ERROR IN MAIN TRY BLOCK:", error); // Log the raw error

    let errorMessage = "Server error during profile update.";
    let statusCode = 500;

    // Try to get more specific info from the error
    if (typeof error === "object" && error !== null) {
      // Is it a Supabase/PostgREST error?
      if ("code" in error && typeof error.code === "string") {
        console.error("Supabase/Postgres Error Code in Catch:", error.code);
        errorMessage = `Database Error (${error.code}).`;
        if (error.code === "23505") {
          errorMessage = "Data conflict (e.g., username already exists).";
          statusCode = 409;
        } else if (error.code === "PGRST116") {
          errorMessage = "Resource not found (PGRST116).";
          statusCode = 404;
        }
        // Add other specific codes if needed
      }
      // Is it a standard JS Error?
      else if ("message" in error && typeof error.message === "string") {
        errorMessage = error.message;
      }
    }
    // Is it just a string?
    else if (typeof error === "string") {
      errorMessage = error;
    }
    // ============================================

    // Return the analyzed error
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
  // This line should be unreachable
  // console.error("API PATCH /me: !!! CRITICAL ERROR: Reached end without returning!");
  // return NextResponse.json({ error: 'Internal server error (no return).' }, { status: 500 });
} // End of PATCH function
