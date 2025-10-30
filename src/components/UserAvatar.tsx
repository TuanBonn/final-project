// // src/components/UserAvatar.tsx
// "use client";

// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Button } from "@/components/ui/button";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { useRouter } from "next/navigation";
// import Link from "next/link";
// import { useCallback } from "react"; // Import useCallback

// // Props nhận từ Header
// interface UserAvatarProps {
//   avatarUrl: string | null;
//   username: string | null;
//   fullName: string | null;
// }

// export default function UserAvatar({
//   avatarUrl,
//   username,
//   fullName,
// }: UserAvatarProps) {
//   const router = useRouter();

//   // Xử lý đăng xuất (gọi API)
//   const handleLogout = async () => {
//     try {
//       const response = await fetch("/api/auth/logout", { method: "POST" });
//       if (!response.ok) throw new Error("Logout failed");
//       router.push("/"); // Về trang chủ
//       router.refresh(); // Refresh lại (dù Header là client, refresh vẫn tốt)
//     } catch (error) {
//       console.error("Logout Error:", error);
//       alert("Logout failed.");
//     }
//   };

//   // Hàm lấy tên viết tắt (dùng useCallback cho ổn định)
//   const getInitials = useCallback((name: string | null): string => {
//     if (!name) return "??";
//     return name
//       .split(" ")
//       .map((n) => n[0])
//       .join("")
//       .toUpperCase()
//       .slice(0, 2);
//   }, []);

//   return (
//     <DropdownMenu>
//       {/* Nút bấm để mở menu, hiển thị Avatar */}
//       <DropdownMenuTrigger asChild>
//         <Button variant="ghost" className="relative h-9 w-9 rounded-full">
//           <Avatar className="h-9 w-9 border">
//             {" "}
//             {/* Thêm border nhẹ */}
//             <AvatarImage
//               src={avatarUrl || ""}
//               alt={username || "User Avatar"}
//             />
//             <AvatarFallback>{getInitials(fullName || username)}</AvatarFallback>
//           </Avatar>
//         </Button>
//       </DropdownMenuTrigger>
//       {/* Nội dung menu thả xuống */}
//       <DropdownMenuContent className="w-56" align="end" forceMount>
//         <DropdownMenuLabel className="font-normal">
//           <div className="flex flex-col space-y-1">
//             <p className="text-sm font-medium leading-none">
//               {fullName || username || "Người dùng"}
//             </p>
//             <p className="text-xs leading-none text-muted-foreground">
//               {username ? `@${username}` : "Chưa có username"}
//             </p>
//           </div>
//         </DropdownMenuLabel>
//         <DropdownMenuSeparator />
//         {/* Các lựa chọn trong menu */}
//         <DropdownMenuItem asChild>
//           <Link href="/profile" className="cursor-pointer">
//             Trang cá nhân
//           </Link>
//         </DropdownMenuItem>
//         <DropdownMenuItem asChild>
//           <Link href="/sell" className="cursor-pointer">
//             Đăng bán sản phẩm
//           </Link>
//         </DropdownMenuItem>
//         {/* Có thể thêm link Admin ở đây nếu check role */}
//         <DropdownMenuSeparator />
//         <DropdownMenuItem
//           onClick={handleLogout}
//           className="text-red-500 cursor-pointer focus:bg-red-50 focus:text-red-600"
//         >
//           Đăng xuất
//         </DropdownMenuItem>
//       </DropdownMenuContent>
//     </DropdownMenu>
//   );
// }

// src/components/UserAvatar.tsx
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation"; // Vẫn có thể cần router nếu chỉ push về /
import Link from "next/link";
import { useCallback } from "react";

// Props nhận từ Header
interface UserAvatarProps {
  avatarUrl: string | null;
  username: string | null;
  fullName: string | null;
}

export default function UserAvatar({
  avatarUrl,
  username,
  fullName,
}: UserAvatarProps) {
  const router = useRouter(); // Khai báo router

  // Xử lý đăng xuất (gọi API + ÉP TẢI LẠI TRANG)
  const handleLogout = async () => {
    console.log("UserAvatar: Đang thực hiện đăng xuất..."); // Log
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      console.log("UserAvatar: Trạng thái API Logout:", response.status); // Log

      if (!response.ok) {
        // Cố gắng đọc lỗi từ API nếu có
        const errorData = await response.json().catch(() => ({})); // Bắt lỗi nếu response không phải JSON
        console.error("UserAvatar: Lỗi API Logout:", errorData);
        throw new Error(errorData.message || "Đăng xuất thất bại.");
      }

      // Đăng xuất thành công phía server
      console.log("UserAvatar: Đăng xuất API thành công. Ép tải lại trang..."); // Log

      // === ÉP TẢI LẠI TRANG ===
      // Chuyển về trang chủ rồi mới reload để mượt hơn (tùy chọn)
      // router.push('/'); // Có thể dùng push trước nếu muốn về trang chủ
      // Hoặc reload ngay lập tức
      window.location.reload(); // Ép trình duyệt tải lại toàn bộ trang
      // =========================
    } catch (error) {
      console.error("UserAvatar: Lỗi khi đăng xuất:", error);
      alert(
        "Lỗi khi đăng xuất: " +
          (error instanceof Error ? error.message : "Lỗi không xác định")
      );
    }
  };

  // Hàm lấy tên viết tắt (dùng useCallback)
  const getInitials = useCallback((name: string | null): string => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, []);

  return (
    <DropdownMenu>
      {/* Nút bấm để mở menu, hiển thị Avatar */}
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9 border">
            <AvatarImage
              src={avatarUrl || ""}
              alt={username || "User Avatar"}
            />
            <AvatarFallback>{getInitials(fullName || username)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      {/* Nội dung menu thả xuống */}
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {fullName || username || "Người dùng"}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {username ? `@${username}` : "Chưa có username"}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* Các lựa chọn trong menu */}
        <DropdownMenuItem asChild>
          <Link href="/profile" className="cursor-pointer">
            Trang cá nhân
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/sell" className="cursor-pointer">
            Đăng bán sản phẩm
          </Link>
        </DropdownMenuItem>
        {/* Có thể thêm link Admin ở đây nếu check role */}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-red-500 cursor-pointer focus:bg-red-50 focus:text-red-600"
        >
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
