// src/app/api/auth/logout/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Đặt tên cookie JWT của bạn ở đây (ví dụ: 'auth-token')
// Tên này PHẢI GIỐNG với tên bạn sẽ dùng khi tạo cookie lúc đăng nhập
const COOKIE_NAME = "auth-token";

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();

    // Kiểm tra xem cookie có tồn tại không
    if (!cookieStore.has(COOKIE_NAME)) {
      return NextResponse.json(
        { message: "Người dùng chưa đăng nhập." },
        { status: 200 } // Vẫn trả về 200 vì không có lỗi
      );
    }

    // Xóa cookie bằng cách set giá trị rỗng và maxAge = 0
    cookieStore.set({
      name: COOKIE_NAME,
      value: "",
      httpOnly: true, // Quan trọng: Đảm bảo cookie không bị truy cập bởi JavaScript phía client
      path: "/", // Đảm bảo path giống lúc tạo cookie
      maxAge: 0, // Hết hạn ngay lập tức
      // secure: process.env.NODE_ENV === 'production', // Chỉ gửi qua HTTPS khi deploy
      // sameSite: 'strict', // Tăng cường bảo mật CSRF
    });

    console.log("Đã xóa cookie:", COOKIE_NAME); // Log để debug

    return NextResponse.json(
      { message: "Đăng xuất thành công." },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Lỗi API Đăng xuất:", error);
    let errorMessage = "Đã xảy ra lỗi không mong muốn.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
