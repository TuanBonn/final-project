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
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback } from "react";
import { Wallet, User, LogOut, PackagePlus, Package } from "lucide-react"; // <-- THÊM ICON

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
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.reload();
    } catch (error) {
      console.error("Logout error", error);
    }
  };

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
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9 border">
            <AvatarImage src={avatarUrl || ""} alt={username || "User"} />
            <AvatarFallback>{getInitials(fullName || username)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {fullName || username || "Người dùng"}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {username ? `@${username}` : ""}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/profile" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" /> Trang cá nhân
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link
            href="/wallet"
            className="cursor-pointer text-blue-600 font-medium"
          >
            <Wallet className="mr-2 h-4 w-4" /> Ví của tôi
          </Link>
        </DropdownMenuItem>

        {/* === MỚI: ĐƠN HÀNG === */}
        <DropdownMenuItem asChild>
          <Link href="/orders" className="cursor-pointer">
            <Package className="mr-2 h-4 w-4" /> Đơn hàng của tôi
          </Link>
        </DropdownMenuItem>
        {/* ==================== */}

        <DropdownMenuItem asChild>
          <Link href="/sell" className="cursor-pointer">
            <PackagePlus className="mr-2 h-4 w-4" /> Đăng bán sản phẩm
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-red-500 cursor-pointer focus:text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" /> Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
