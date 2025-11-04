// // src/components/admin/UserActions.tsx
// "use client";

// import { useState } from "react";
// // import { useRouter } from 'next/navigation'; // Bỏ
// import {
//   MoreHorizontal,
//   ShieldAlert,
//   ShieldCheck,
//   UserCog,
//   Loader2,
//   Award,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
// } from "@/components/ui/alert-dialog";

// // Kiểu UserRow
// type UserRow = {
//   id: string;
//   username: string | null;
//   status: "active" | "banned";
//   role?: "user" | "dealer" | "admin";
//   is_verified?: boolean;
// };

// // Props (thêm "bộ đàm")
// interface UserActionsProps {
//   user: UserRow;
//   onActionSuccess: () => void; // "Bộ đàm"
// }

// export function UserActions({ user, onActionSuccess }: UserActionsProps) {
//   const [isLoading, setIsLoading] = useState(false);
//   const [alertOpen, setAlertOpen] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const currentAction = user.status === "active" ? "Ban" : "Bỏ Ban";

//   // Hàm gọi API (dùng chung)
//   const callUpdateApi = async (payload: object) => {
//     setIsLoading(true);
//     setError(null);
//     try {
//       const response = await fetch(`/api/admin/users/${user.id}`, {
//         method: "PATCH",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });

//       const data = await response.json();
//       if (!response.ok) throw new Error(data.error || "Hành động thất bại.");

//       onActionSuccess(); // Báo cáo
//       return true;
//     } catch (err: unknown) {
//       console.error("Lỗi khi update user:", err);
//       setError(err instanceof Error ? err.message : "Lỗi không xác định.");
//       return false;
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Hàm "Ban" / "Bỏ Ban"
//   const handleToggleBan = async () => {
//     const newStatus = user.status === "active" ? "banned" : "active";
//     const success = await callUpdateApi({ status: newStatus });
//     if (success) setAlertOpen(false);
//   };

//   // Hàm "Đổi Role"
//   const handleToggleRole = async () => {
//     const newRole =
//       user.role === "dealer" || user.is_verified ? "user" : "dealer";
//     await callUpdateApi({ role: newRole });
//   };

//   return (
//     <>
//       {/* Hộp thoại xác nhận Ban/Bỏ Ban */}
//       <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle>Sếp chắc chưa?</AlertDialogTitle>

//             {/* === SỬA LỖI P TRONG P === */}
//             <AlertDialogDescription asChild>
//               <div>
//                 {" "}
//                 {/* Bọc nội dung bằng <div> */}
//                 Sếp sắp {currentAction.toLowerCase()} tài khoản
//                 <strong> {user.username || user.id}</strong>.
//                 {user.status === "active"
//                   ? " User này sẽ không thể đăng nhập được nữa."
//                   : " User này sẽ có thể đăng nhập trở lại."}
//                 {/* Giờ <p> nằm trong <div>, không còn là con của <p> nữa */}
//                 {error && (
//                   <p className="text-red-600 mt-2 font-medium">{error}</p>
//                 )}
//               </div>
//             </AlertDialogDescription>
//             {/* ======================= */}
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel disabled={isLoading}>Hủy</AlertDialogCancel>
//             <AlertDialogAction
//               onClick={handleToggleBan}
//               disabled={isLoading}
//               className="bg-red-600 hover:bg-red-700"
//             >
//               {isLoading ? (
//                 <Loader2 className="h-4 w-4 animate-spin" />
//               ) : (
//                 `Ok, ${currentAction}!`
//               )}
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>

//       {/* Nút 3 chấm */}
//       <DropdownMenu>
//         <DropdownMenuTrigger asChild>
//           <Button variant="ghost" className="h-8 w-8 p-0" disabled={isLoading}>
//             {isLoading ? (
//               <Loader2 className="h-4 w-4 animate-spin" />
//             ) : (
//               <MoreHorizontal className="h-4 w-4" />
//             )}
//           </Button>
//         </DropdownMenuTrigger>
//         <DropdownMenuContent align="end">
//           <DropdownMenuLabel>Hành động</DropdownMenuLabel>

//           {/* Nút "Đổi Role" (User <-> Dealer) */}
//           {user.role !== "admin" && (
//             <DropdownMenuItem
//               onClick={handleToggleRole}
//               disabled={isLoading}
//               className={
//                 user.is_verified
//                   ? "text-yellow-600 focus:text-yellow-600"
//                   : "text-green-600 focus:text-green-600"
//               }
//             >
//               <Award className="mr-2 h-4 w-4" />
//               <span>
//                 {user.is_verified ? "Hủy Dealer (về User)" : "Nâng cấp Dealer"}
//               </span>
//             </DropdownMenuItem>
//           )}

//           <DropdownMenuSeparator />

//           {/* Nút Ban / Bỏ Ban */}
//           <DropdownMenuItem
//             onClick={() => {
//               setError(null);
//               setAlertOpen(true);
//             }}
//             disabled={isLoading || user.role === "admin"} // Không cho Ban Admin
//             className={
//               user.status === "active"
//                 ? "text-red-600 focus:text-red-600"
//                 : "text-green-600 focus:text-green-600"
//             }
//           >
//             {user.status === "active" ? (
//               <ShieldAlert className="mr-2 h-4 w-4" />
//             ) : (
//               <ShieldCheck className="mr-2 h-4 w-4" />
//             )}
//             <span>{currentAction} tài khoản</span>
//           </DropdownMenuItem>
//         </DropdownMenuContent>
//       </DropdownMenu>
//     </>
//   );
// }

// src/components/admin/UserActions.tsx
"use client";

import { useState } from "react";
import {
  MoreHorizontal,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  Loader2,
  Award,
  BadgeCheck, // <-- SỬA LỖI 1: Tên đúng là BadgeCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Kiểu UserRow
type UserRow = {
  id: string;
  username: string | null;
  status: "active" | "banned";
  role?: "user" | "dealer" | "admin";
  is_verified?: boolean;
};

// Props (thêm "bộ đàm")
interface UserActionsProps {
  user: UserRow;
  onActionSuccess: () => void; // "Bộ đàm"
}

export function UserActions({ user, onActionSuccess }: UserActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentAction = user.status === "active" ? "Ban" : "Bỏ Ban";

  // Hàm gọi API (dùng chung)
  const callUpdateApi = async (payload: object) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Hành động thất bại.");

      onActionSuccess(); // Báo cáo
      return true;
    } catch (err: unknown) {
      console.error("Lỗi khi update user:", err);
      if (alertOpen) {
        setError(err instanceof Error ? err.message : "Lỗi không xác định.");
      } else {
        alert(err instanceof Error ? err.message : "Lỗi không xác định.");
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Hàm "Ban" / "Bỏ Ban"
  const handleToggleBan = async () => {
    const newStatus = user.status === "active" ? "banned" : "active";
    const success = await callUpdateApi({ status: newStatus });
    if (success) setAlertOpen(false);
  };

  // Hàm "Đổi Role"
  const handleToggleRole = async () => {
    const newRole = user.role === "dealer" ? "user" : "dealer";
    await callUpdateApi({ role: newRole });
  };

  // Hàm "Đổi Verify"
  const handleToggleVerify = async () => {
    const newVerified = !user.is_verified;
    await callUpdateApi({ is_verified: newVerified });
  };

  return (
    <>
      {/* Hộp thoại xác nhận Ban/Bỏ Ban */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sếp chắc chưa?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {" "}
                Sếp sắp {currentAction.toLowerCase()} tài khoản
                <strong> {user.username || user.id}</strong>.
                {user.status === "active"
                  ? " User này sẽ không thể đăng nhập được nữa."
                  : " User này sẽ có thể đăng nhập trở lại."}
                {error && (
                  <p className="text-red-600 mt-2 font-medium">{error}</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleBan}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `Ok, ${currentAction}!`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Nút 3 chấm */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Hành động</DropdownMenuLabel>

          {/* 1. Nút "Đổi Role" (User <-> Dealer) */}
          {user.role !== "admin" && (
            <DropdownMenuItem onClick={handleToggleRole} disabled={isLoading}>
              <Award className="mr-2 h-4 w-4" />
              <span>
                {user.role === "dealer"
                  ? "Hạ cấp (về User)"
                  : "Nâng cấp Dealer"}
              </span>
            </DropdownMenuItem>
          )}

          {/* 2. Nút "Verify" (True <-> False) */}
          {user.role !== "admin" && (
            <DropdownMenuItem
              onClick={handleToggleVerify}
              disabled={isLoading}
              className={
                user.is_verified
                  ? "text-yellow-600 focus:text-yellow-600"
                  : "text-green-600 focus:text-green-600"
              }
            >
              {/* === SỬA LỖI 2: Dùng tên đúng === */}
              <BadgeCheck className="mr-2 h-4 w-4" />
              <span>
                {user.is_verified ? "Hủy trạng thái Verify" : "Cấp Verify"}
              </span>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* 3. Nút Ban / Bỏ Ban (Giữ nguyên) */}
          <DropdownMenuItem
            onClick={() => {
              setError(null);
              setAlertOpen(true);
            }}
            disabled={isLoading || user.role === "admin"}
            className={
              user.status === "active"
                ? "text-red-600 focus:text-red-600"
                : "text-green-600 focus:text-green-600"
            }
          >
            {user.status === "active" ? (
              <ShieldAlert className="mr-2 h-4 w-4" />
            ) : (
              <ShieldCheck className="mr-2 h-4 w-4" />
            )}
            <span>{currentAction} tài khoản</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
