// // src/app/api/profile/me/route.ts

// import { NextResponse } from "next/server";
// import { cookies } from "next/headers";
// import jwt from "jsonwebtoken";
// import { createServerClient, type CookieOptions } from "@supabase/ssr"; // Cần để query DB

// const COOKIE_NAME = "auth-token";
// const JWT_SECRET = process.env.JWT_SECRET;

// interface JwtPayload {
//   userId: string;
//   email: string; // Hoặc thông tin khác trong token
// }

// export async function GET(request: Request) {
//   console.log("Attempting GET /api/profile/me"); // Log bắt đầu
//   if (!JWT_SECRET) {
//     console.error("API /profile/me: JWT_SECRET not configured");
//     return NextResponse.json(
//       { error: "Server configuration error." },
//       { status: 500 }
//     );
//   }

//   const cookieStore = cookies();
//   const token = cookieStore.get(COOKIE_NAME)?.value;
//   console.log(
//     "API /profile/me: Token from cookie:",
//     token ? "Exists" : "Not Found"
//   ); // Log token

//   if (!token) {
//     // Chưa đăng nhập, không thể lấy profile
//     console.log("API /profile/me: No token, denying access."); // Log
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//   }

//   try {
//     // 1. Xác thực token
//     const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
//     console.log("API /profile/me: Token decoded:", decoded.userId); // Log user ID

//     // === KHỞI TẠO SUPABASE CLIENT ĐỂ QUERY DB ===
//     const supabase = createServerClient(
//       process.env.NEXT_PUBLIC_SUPABASE_URL!,
//       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//       {
//         cookies: {
//           get(name: string) {
//             return cookieStore.get(name)?.value;
//           },
//         },
//       }
//     );
//     // ============================================

//     // 2. Lấy toàn bộ thông tin profile từ bảng 'users'
//     console.log("API /profile/me: Fetching profile for user:", decoded.userId); // Log
//     const { data: userProfile, error: profileError } = await supabase
//       .from("users") // Bảng users
//       .select("*") // Lấy tất cả các cột
//       .eq("id", decoded.userId)
//       .single(); // Chỉ mong đợi 1 kết quả

//     if (profileError) {
//       console.error("API /profile/me: Error fetching profile:", profileError);
//       if (profileError.code === "PGRST116") {
//         // Mã lỗi "No rows found"
//         return NextResponse.json(
//           { error: "Profile not found for authenticated user." },
//           { status: 404 }
//         );
//       }
//       throw profileError; // Ném lỗi khác để xuống catch
//     }

//     // 3. Quan trọng: Xóa password_hash trước khi trả về
//     if (userProfile) {
//       delete (userProfile as any).password_hash;
//     }

//     console.log("API /profile/me: Profile fetched successfully."); // Log
//     return NextResponse.json({ profile: userProfile }, { status: 200 });
//   } catch (error: unknown) {
//     // Lỗi xác thực token hoặc lỗi DB khác
//     console.error("API /profile/me: Error:", error);
//     let errorMessage = "An unexpected error occurred.";
//     let statusCode = 500;
//     if (error instanceof jwt.JsonWebTokenError) {
//       errorMessage = "Invalid token.";
//       statusCode = 401; // Unauthorized
//     } else if (error instanceof Error) {
//       errorMessage = error.message;
//     }

//     // Trả về lỗi Unauthorized nếu token không hợp lệ
//     return NextResponse.json({ error: errorMessage }, { status: statusCode });
//   }
// }

// src/app/api/profile/me/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { createServerClient, type CookieOptions } from "@supabase/ssr"; // Still need this for DB access

const COOKIE_NAME = "auth-token"; // Your JWT cookie name
const JWT_SECRET = process.env.JWT_SECRET; // Your secret key from .env

interface JwtPayload {
  userId: string;
  email: string; // Or whatever you put in your token
}

// --- GET Request: Fetch current user's profile ---
export async function GET(request: Request) {
  // console.log("Attempting GET /api/profile/me");
  if (!JWT_SECRET) {
    console.error("API GET /profile/me: JWT_SECRET not configured");
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 500 }
    );
  }

  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  // console.log("API GET /profile/me: Token found:", !!token);

  if (!token) {
    // console.log("API GET /profile/me: No token, denying access.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    // console.log("API GET /profile/me: User verified:", decoded.userId);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // console.log("API GET /profile/me: Fetching profile for user:", decoded.userId);
    const { data: userProfile, error: profileError } = await supabase
      .from("users") // Your user table
      .select("*") // Get all profile fields
      .eq("id", decoded.userId)
      .single();

    if (profileError) {
      console.error(
        "API GET /profile/me: Error fetching profile:",
        profileError
      );
      if (profileError.code === "PGRST116")
        return NextResponse.json(
          { error: "Profile not found." },
          { status: 404 }
        );
      throw profileError;
    }

    if (userProfile) delete (userProfile as any).password_hash; // Don't send the hash back!

    // console.log("API GET /profile/me: Profile fetched.");
    return NextResponse.json({ profile: userProfile }, { status: 200 });
  } catch (error: unknown) {
    // console.error('API GET /profile/me: Error:', error);
    let errorMessage = "An unexpected error occurred.";
    let statusCode = 500;
    if (error instanceof jwt.JsonWebTokenError) {
      errorMessage = "Invalid or expired token.";
      statusCode = 401;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}

// --- PATCH Request: Update current user's profile ---
export async function PATCH(request: Request) {
  // console.log("Attempting PATCH /api/profile/me");
  if (!JWT_SECRET) {
    console.error("API PATCH /profile/me: JWT_SECRET not configured");
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 500 }
    );
  }

  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    // console.log("API PATCH /profile/me: No token, denying access.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const userId = decoded.userId;
    // console.log("API PATCH /profile/me: User verified:", userId);

    const body = await request.json();
    const { fullName, username /*, avatarUrl */ } = body; // Destructure expected fields

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const updateData: { full_name?: string; username?: string } = {};

    // Validate and prepare update data
    if (fullName !== undefined) {
      const trimmedFullName = fullName.trim();
      if (trimmedFullName === "")
        return NextResponse.json(
          { error: "Full name cannot be empty." },
          { status: 400 }
        );
      updateData.full_name = trimmedFullName;
    }
    if (username !== undefined) {
      const trimmedUsername = username.trim();
      if (trimmedUsername.length > 0 && trimmedUsername.length < 3) {
        // Allow empty, but not too short
        return NextResponse.json(
          { error: "Username must be at least 3 characters (or empty)." },
          { status: 400 }
        );
      }
      // Check for uniqueness only if username is provided and potentially changed
      if (trimmedUsername) {
        const { data: existingUser, error: checkError } = await supabase
          .from("users")
          .select("id")
          .eq("username", trimmedUsername)
          .neq("id", userId) // Exclude self
          .maybeSingle();
        if (checkError) throw checkError;
        if (existingUser)
          return NextResponse.json(
            { error: "Username already taken." },
            { status: 409 }
          );
        updateData.username = trimmedUsername;
      } else {
        // Handle setting username to empty/null if your DB allows it
        // updateData.username = null; // Or handle as needed
      }
    }
    // TODO: Handle avatarUrl update logic (likely requires separate upload step first)

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: "No changes submitted." },
        { status: 200 }
      );
    }

    // console.log("API PATCH /profile/me: Updating user:", userId, "with data:", updateData);
    const { data: updatedProfile, error: updateError } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", userId)
      .select("*") // Select all fields to return updated profile
      .single();

    if (updateError) {
      console.error(
        "API PATCH /profile/me: Error updating profile:",
        updateError
      );
      // Handle specific DB errors like unique constraint violation
      if (updateError.code === "23505") {
        // Postgres unique violation code
        return NextResponse.json(
          { error: "Username already taken (database constraint)." },
          { status: 409 }
        );
      }
      throw updateError;
    }

    if (updatedProfile) delete (updatedProfile as any).password_hash; // ALWAYS remove hash

    // console.log("API PATCH /profile/me: Update successful.");
    return NextResponse.json(
      { profile: updatedProfile, message: "Profile updated successfully!" },
      { status: 200 }
    );
  } catch (error: unknown) {
    // console.error('API PATCH /profile/me: Error:', error);
    let errorMessage = "An unexpected error occurred.";
    let statusCode = 500;
    if (error instanceof jwt.JsonWebTokenError) {
      errorMessage = "Invalid or expired token.";
      statusCode = 401;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    // Add more specific error handling if needed
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
