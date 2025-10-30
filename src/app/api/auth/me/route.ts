// // // src/app/api/auth/me/route.ts

// // import { NextResponse } from "next/server";
// // import { cookies } from "next/headers";
// // import jwt from "jsonwebtoken";
// // // Import Supabase SSR functions directly
// // import { createServerClient, type CookieOptions } from "@supabase/ssr";

// // // Ensure this matches the name used in login/logout APIs
// // const COOKIE_NAME = "auth-token";
// // const JWT_SECRET = process.env.JWT_SECRET;

// // // Define the expected structure of the JWT payload
// // interface JwtPayload {
// //   userId: string;
// //   email: string; // Include other data stored in the token if any
// // }

// // export async function GET(request: Request) {
// //   // console.log("Attempting GET /api/auth/me"); // Optional: Log start
// //   if (!JWT_SECRET) {
// //     console.error("API /me: JWT_SECRET is not configured in .env file!");
// //     return NextResponse.json(
// //       { error: "Server configuration error." },
// //       { status: 500 }
// //     );
// //   }

// //   const cookieStore = cookies();
// //   const token = cookieStore.get(COOKIE_NAME)?.value;
// //   // console.log("API /me: Token from cookie:", token); // Optional: Log token

// //   if (!token) {
// //     // console.log("API /me: No token found, returning null user"); // Optional: Log no token
// //     // No token means the user is not logged in
// //     return NextResponse.json({ user: null }, { status: 200 });
// //   }

// //   try {
// //     // 1. Verify the JWT signature and expiration
// //     const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
// //     // console.log("API /me: Token decoded successfully:", decoded); // Optional: Log decoded token

// //     // === CREATE SUPABASE CLIENT CORRECTLY FOR API ROUTE ===
// //     // Needed to fetch fresh profile data from the database
// //     const supabase = createServerClient(
// //       process.env.NEXT_PUBLIC_SUPABASE_URL!,
// //       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
// //       {
// //         cookies: {
// //           // Define the get function to read from the cookie store
// //           get(name: string) {
// //             return cookieStore.get(name)?.value;
// //           },
// //           // set/remove are not needed for a GET request that only reads
// //         },
// //       }
// //     );
// //     // =======================================================

// //     // 2. Fetch the user's profile from the database using the verified userId
// //     const { data: userProfile, error: profileError } = await supabase
// //       .from("users") // Make sure 'users' is your correct table name
// //       .select("id, email, username, full_name, avatar_url, role, is_verified")
// //       .eq("id", decoded.userId)
// //       .single(); // Expecting only one matching profile

// //     if (profileError) {
// //       console.error(
// //         "API /me: Error fetching profile for authenticated user:",
// //         profileError
// //       );
// //       // If profile fetch fails, maybe just return basic info from the token
// //       return NextResponse.json(
// //         { user: { id: decoded.userId, email: decoded.email } },
// //         { status: 200 }
// //       );
// //     }

// //     // console.log("API /me: Profile fetched successfully:", userProfile); // Optional: Log profile data
// //     // Return the full user profile fetched from the database
// //     return NextResponse.json({ user: userProfile }, { status: 200 });
// //   } catch (error) {
// //     // This block catches JWT verification errors (expired, invalid signature, etc.)
// //     console.error("API /me: Invalid token or other error:", error);
// //     // Optionally clear the invalid cookie here
// //     // cookieStore.set({ name: COOKIE_NAME, value: '', maxAge: 0, path: '/' });
// //     return NextResponse.json({ user: null }, { status: 200 }); // Treat as not logged in
// //   }
// // }

// // src/app/api/auth/me/route.ts

// import { NextResponse } from "next/server";
// import { cookies } from "next/headers";
// import jwt from "jsonwebtoken";
// // Client Supabase cơ bản - chỉ cần URL và Anon key
// import { createClient } from "@supabase/supabase-js";

// // Tên cookie JWT - phải khớp lúc đăng nhập/đăng xuất
// const COOKIE_NAME = "auth-token";
// // Khóa bí mật JWT - phải khớp lúc đăng nhập/đăng xuất và lấy từ .env
// const JWT_SECRET = process.env.JWT_SECRET;

// // Định nghĩa cấu trúc dữ liệu trong JWT (phải khớp lúc tạo token)
// interface JwtPayload {
//   userId: string;
//   email: string;
//   // Thêm role hay gì đó nếu bạn có nhét vào token lúc đăng nhập
// }

// // Hàm xử lý GET request
// export async function GET(request: Request) {
//   // console.log("API /me: Bắt đầu xử lý GET"); // Log cho vui nếu muốn

//   // Kiểm tra cái khóa bí mật JWT có chưa, không có thì server "ngủm"
//   if (!JWT_SECRET) {
//     console.error("API /me: **BÁO ĐỘNG ĐỎ** JWT_SECRET chưa cài trong .env!");
//     return NextResponse.json(
//       { error: "Lỗi cấu hình server nghiêm trọng." },
//       { status: 500 }
//     );
//   }

//   const cookieStore = cookies(); // Lấy kho cookie
//   const token = cookieStore.get(COOKIE_NAME)?.value; // Lôi cái token ra
//   // console.log("API /me: Token từ cookie:", token ? "Có" : "Không"); // Log xem có token không

//   // Không có token? -> Khách vãng lai -> trả về user null
//   if (!token) {
//     return NextResponse.json({ user: null }, { status: 200 });
//   }

//   try {
//     // Bước 1: Giải mã + Xác thực token
//     // Nếu sai/hết hạn -> văng lỗi -> nhảy xuống catch
//     const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
//     // console.log("API /me: Token hợp lệ, ID:", decoded.userId); // Log ID nếu cần

//     // Bước 2: Khởi tạo client Supabase cơ bản
//     // Chỉ cần URL + Anon Key là đủ để đọc data (nếu RLS cho phép)
//     const supabase = createClient(
//       process.env.NEXT_PUBLIC_SUPABASE_URL!,
//       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
//     );

//     // Bước 3: Dùng ID từ token, hỏi database lấy thông tin user
//     // console.log("API /me: Đang hỏi DB lấy profile ID:", decoded.userId); // Log
//     const { data: userProfile, error: profileError } = await supabase
//       .from("users") // Tên bảng user của bạn
//       .select(
//         "id, email, username, full_name, avatar_url, role, is_verified, reputation_score, created_at"
//       ) // Lấy hết info cần thiết
//       .eq("id", decoded.userId) // Tìm đúng người
//       .single(); // Chỉ mong có 1 người thôi

//     // Xử lý nếu DB báo lỗi hoặc không tìm thấy
//     if (profileError) {
//       console.error("API /me: Lỗi khi lấy profile từ DB:", profileError);
//       // Lỗi "Không tìm thấy" (PGRST116) thì trả về user cơ bản từ token
//       if (profileError.code === "PGRST116") {
//         console.warn(
//           `API /me: Không tìm thấy profile trong DB cho ID ${decoded.userId}, trả về data từ token.`
//         );
//         // Trả về thông tin tối thiểu có trong token
//         return NextResponse.json(
//           { user: { id: decoded.userId, email: decoded.email } },
//           { status: 200 }
//         );
//       }
//       // Lỗi khác thì báo lỗi server
//       return NextResponse.json(
//         { error: "Lỗi truy vấn cơ sở dữ liệu." },
//         { status: 500 }
//       );
//     }

//     // Bước 4: **CỰC KỲ QUAN TRỌNG:** Xóa cái password hash đi trước khi gửi về!
//     if (userProfile) {
//       delete (userProfile as any).password_hash; // Không bao giờ gửi hash về client
//     }

//     // console.log("API /me: Lấy profile thành công."); // Log
//     // Gửi thông tin user về cho Header/Trang Profile
//     return NextResponse.json({ user: userProfile }, { status: 200 });
//   } catch (error: unknown) {
//     // Bắt lỗi giải mã token (sai, hết hạn...)
//     console.error("API /me: Lỗi token hoặc lỗi khác:", error);
//     // Gặp lỗi token thì coi như chưa đăng nhập
//     return NextResponse.json({ user: null }, { status: 200 });
//   }
// }

// src/app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js"; // Client cơ bản

const COOKIE_NAME = "auth-token";
const JWT_SECRET = process.env.JWT_SECRET!;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface JwtPayload {
  userId: string;
  email: string;
  role?: string;
}

// Client Supabase cơ bản
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request: Request) {
  if (!JWT_SECRET)
    return NextResponse.json({ error: "Lỗi cấu hình JWT." }, { status: 500 });

  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return NextResponse.json({ user: null }, { status: 200 }); // Chưa đăng nhập

  try {
    // --- Verify Token ---
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // --- Fetch Fresh User Data (Optional but recommended) ---
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select(
        "id, email, username, full_name, avatar_url, role, is_verified, reputation_score, created_at"
      ) // Lấy info cần thiết
      .eq("id", decoded.userId)
      .single();

    if (profileError) {
      console.error("API /me: Lỗi lấy profile:", profileError);
      // Nếu lỗi DB, vẫn có thể trả về info cơ bản từ token
      return NextResponse.json(
        {
          user: {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role,
          },
        },
        { status: 200 }
      );
    }

    // --- Return Full Profile (Remove Hash!) ---
    if (userProfile) delete (userProfile as any).password_hash;
    return NextResponse.json({ user: userProfile }, { status: 200 });
  } catch (error) {
    // Token invalid or expired
    console.error("API /me: Lỗi Token:", error);
    return NextResponse.json({ user: null }, { status: 200 }); // Coi như chưa đăng nhập
  }
}
