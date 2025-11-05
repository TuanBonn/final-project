// // src/components/admin/ProductActions.tsx
// "use client";

// import { useState } from "react";
// import { MoreHorizontal, EyeOff, Eye, Loader2, Edit } from "lucide-react";
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

// // Kiểu ProductRow (nhận props từ page)
// type ProductRow = {
//   id: string;
//   name: string;
//   status: "available" | "in_transaction" | "sold";
// };

// interface ProductActionsProps {
//   product: ProductRow;
//   onActionSuccess: () => void; // "Bộ đàm"
// }

// export function ProductActions({
//   product,
//   onActionSuccess,
// }: ProductActionsProps) {
//   const [isLoading, setIsLoading] = useState(false);
//   const [alertOpen, setAlertOpen] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   // Quyết định hành động dựa trên trạng thái
//   const isAvailable = product.status === "available";
//   const currentAction = isAvailable ? "Gỡ (Ẩn)" : "Khôi phục";
//   const newStatus = isAvailable ? "sold" : "available";

//   // Hàm gọi API
//   const callUpdateApi = async (payload: object) => {
//     setIsLoading(true);
//     setError(null);
//     try {
//       const response = await fetch(`/api/admin/products/${product.id}`, {
//         method: "PATCH",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });

//       const data = await response.json();
//       if (!response.ok) throw new Error(data.error || "Hành động thất bại.");

//       onActionSuccess(); // Báo cáo cho cha
//       return true;
//     } catch (err: unknown) {
//       setError(err instanceof Error ? err.message : "Lỗi không xác định.");
//       return false;
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Hàm xử lý "Gỡ" / "Khôi phục"
//   const handleToggleStatus = async () => {
//     const success = await callUpdateApi({ status: newStatus });
//     if (success) {
//       setAlertOpen(false); // Đóng hộp thoại
//     }
//   };

//   // (Hàm xử lý Edit - Tương lai)
//   const handleEdit = () => {
//     alert("Chức năng 'Sửa chi tiết' sẽ được làm sau!");
//   };

//   return (
//     <>
//       {/* Hộp thoại xác nhận */}
//       <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle>Sếp chắc chưa?</AlertDialogTitle>
//             <AlertDialogDescription asChild>
//               <div>
//                 Sếp sắp{" "}
//                 <strong className="text-red-600">
//                   {currentAction.toLowerCase()}
//                 </strong>{" "}
//                 sản phẩm:
//                 <strong className="mx-1">{product.name}</strong>?
//                 {isAvailable
//                   ? " Sản phẩm sẽ bị ẩn khỏi trang bán hàng."
//                   : " Sản phẩm sẽ xuất hiện lại trên trang bán hàng."}
//                 {error && (
//                   <p className="text-red-600 mt-2 font-medium">{error}</p>
//                 )}
//               </div>
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel disabled={isLoading}>Hủy</AlertDialogCancel>
//             <AlertDialogAction
//               onClick={handleToggleStatus}
//               disabled={isLoading}
//               className={isAvailable ? "bg-red-600 hover:bg-red-700" : ""}
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
//           <DropdownMenuItem onClick={handleEdit} disabled={isLoading}>
//             <Edit className="mr-2 h-4 w-4" />
//             <span>Sửa chi tiết</span>
//           </DropdownMenuItem>
//           <DropdownMenuSeparator />
//           <DropdownMenuItem
//             onClick={() => {
//               setError(null);
//               setAlertOpen(true);
//             }}
//             disabled={isLoading}
//             className={
//               isAvailable
//                 ? "text-red-600 focus:text-red-600"
//                 : "text-green-600 focus:text-green-600"
//             }
//           >
//             {isAvailable ? (
//               <EyeOff className="mr-2 h-4 w-4" />
//             ) : (
//               <Eye className="mr-2 h-4 w-4" />
//             )}
//             <span>{currentAction} sản phẩm</span>
//           </DropdownMenuItem>
//         </DropdownMenuContent>
//       </DropdownMenu>
//     </>
//   );
// }

// src/components/admin/ProductActions.tsx
"use client";

import { useState } from "react";
import Link from "next/link"; // <-- IMPORT THÊM
import { MoreHorizontal, EyeOff, Eye, Loader2, Edit } from "lucide-react";
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

// Kiểu ProductRow (nhận props từ page)
type ProductRow = {
  id: string;
  name: string;
  status: "available" | "in_transaction" | "sold";
};

interface ProductActionsProps {
  product: ProductRow;
  onActionSuccess: () => void; // "Bộ đàm"
}

export function ProductActions({
  product,
  onActionSuccess,
}: ProductActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quyết định hành động dựa trên trạng thái
  const isAvailable = product.status === "available";
  const currentAction = isAvailable ? "Gỡ (Ẩn)" : "Khôi phục";
  const newStatus = isAvailable ? "sold" : "available";

  // Hàm gọi API (chỉ dùng cho Gỡ/Khôi phục)
  const callUpdateApi = async (payload: object) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Hành động thất bại.");

      onActionSuccess(); // Báo cáo cho cha
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Hàm xử lý "Gỡ" / "Khôi phục"
  const handleToggleStatus = async () => {
    const success = await callUpdateApi({ status: newStatus });
    if (success) {
      setAlertOpen(false); // Đóng hộp thoại
    }
  };

  // (Không cần hàm handleEdit nữa)

  return (
    <>
      {/* Hộp thoại xác nhận (Giữ nguyên) */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sếp chắc chưa?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                Sếp sắp{" "}
                <strong className="text-red-600">
                  {currentAction.toLowerCase()}
                </strong>{" "}
                sản phẩm:
                <strong className="mx-1">{product.name}</strong>?
                {isAvailable
                  ? " Sản phẩm sẽ bị ẩn khỏi trang bán hàng."
                  : " Sản phẩm sẽ xuất hiện lại trên trang bán hàng."}
                {error && (
                  <p className="text-red-600 mt-2 font-medium">{error}</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleStatus}
              disabled={isLoading}
              className={isAvailable ? "bg-red-600 hover:bg-red-700" : ""}
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
          <DropdownMenuLabel>Actions</DropdownMenuLabel>

          {/* === SỬA NÚT NÀY === */}
          <DropdownMenuItem asChild>
            <Link href={`/admin/products/${product.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              <span>Sửa chi tiết</span>
            </Link>
          </DropdownMenuItem>
          {/* ================= */}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setError(null);
              setAlertOpen(true);
            }}
            disabled={isLoading}
            className={
              isAvailable
                ? "text-red-600 focus:text-red-600"
                : "text-green-600 focus:text-green-600"
            }
          >
            {isAvailable ? (
              <EyeOff className="mr-2 h-4 w-4" />
            ) : (
              <Eye className="mr-2 h-4 w-4" />
            )}
            <span>{currentAction} sản phẩm</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
