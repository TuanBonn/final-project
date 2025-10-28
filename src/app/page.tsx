// src/app/page.tsx
// KHÔNG cần import createClient nữa
// import { createClient } from '@/lib/supabase/server';
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import { Button } from "@/components/ui/button";
import { cookies } from "next/headers"; // Vẫn cần để fetch API từ Server Component

// Định nghĩa kiểu dữ liệu User (phải khớp với dữ liệu API trả về)
interface User {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  is_verified: boolean;
}

// Hàm fetch dữ liệu user từ API
async function getUserData(): Promise<{ user: User | null }> {
  try {
    // Lấy cookie trực tiếp để gửi kèm request
    const cookieStore = cookies();
    const token = cookieStore.get("auth-token")?.value; // Lấy token cookie

    // Gọi API /api/auth/me từ server-side
    // Phải cung cấp URL đầy đủ khi fetch từ Server Component
    // và gửi kèm cookie nếu API cần
    const res = await fetch(
      `${
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      }/api/auth/me`,
      {
        headers: {
          // Gửi cookie nếu API /api/auth/me cần đọc nó (API này đọc cookie server-side nên ok)
          Cookie: cookieStore.toString(),
        },
        cache: "no-store", // Không cache lại kết quả để luôn lấy trạng thái mới nhất
      }
    );

    if (!res.ok) {
      console.error("API /api/auth/me trả về lỗi:", res.status);
      return { user: null };
    }

    const data = await res.json();
    return data; // Trả về { user: User | null }
  } catch (error) {
    console.error("Lỗi khi fetch /api/auth/me:", error);
    return { user: null };
  }
}

export default async function Home() {
  // Gọi hàm fetch để lấy thông tin user
  const { user } = await getUserData();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Sàn Giao Dịch Mô Hình Xe</h1>

        {user ? (
          <div>
            {/* Hiển thị email hoặc username */}
            <p className="mb-4">Chào mừng trở lại, {user.email}!</p>
            {/* LogoutButton vẫn hoạt động vì nó gọi /api/auth/logout */}
            <LogoutButton />
          </div>
        ) : (
          <Button asChild>
            <Link href="/login">Đăng nhập / Đăng ký</Link>
          </Button>
        )}
      </div>
    </main>
  );
}

// Quan trọng: Thêm biến môi trường NEXT_PUBLIC_BASE_URL vào .env.local
// Ví dụ: NEXT_PUBLIC_BASE_URL=http://localhost:3000
