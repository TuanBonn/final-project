// src/components/admin/ProductActions.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Edit,
  Eye,
  Lock,
  RefreshCw, // Icon Gỡ ẩn/Khôi phục
  EyeOff, // Icon Ẩn
} from "lucide-react";
import Link from "next/link";

interface ProductActionsProps {
  product: {
    id: string;
    name: string;
    status: string; // Quan trọng để check 'auction', 'available', 'sold'
  };
  onActionSuccess?: () => void;
}

export function ProductActions({
  product,
  onActionSuccess,
}: ProductActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Check trạng thái
  const isAuction = product.status === "auction";
  const isSold = product.status === "sold";
  const isAvailable = product.status === "available";

  // 1. Hàm KHÔI PHỤC / GỠ ẨN (Đưa từ sold -> available)
  const handleRestore = async () => {
    if (isAuction) return;

    if (!confirm(`Bạn muốn GỠ ẨN sản phẩm "${product.name}" để bán lại?`))
      return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "available" }), // Đưa về available
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      alert("Đã gỡ ẩn thành công! Sản phẩm đã xuất hiện lại trên sàn.");
      if (onActionSuccess) onActionSuccess();
      router.refresh();
    } catch (error: any) {
      alert(error.message || "Lỗi khi gỡ ẩn sản phẩm");
    } finally {
      setLoading(false);
    }
  };

  // 2. Hàm TẠM ẨN (Đưa từ available -> sold)
  // Lưu ý: Ta dùng trạng thái 'sold' để ẩn sản phẩm khỏi danh sách mua
  const handleHide = async () => {
    if (isAuction) return;

    if (
      !confirm(
        `Bạn muốn TẠM ẨN sản phẩm "${product.name}"? Khách hàng sẽ không thấy sản phẩm này nữa.`
      )
    )
      return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "sold" }), // Đưa về sold (coi như ẩn)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      alert("Đã ẩn sản phẩm thành công.");
      if (onActionSuccess) onActionSuccess();
      router.refresh();
    } catch (error: any) {
      alert(error.message || "Lỗi khi ẩn sản phẩm");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Hành động</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => navigator.clipboard.writeText(product.id)}
        >
          Copy ID
        </DropdownMenuItem>
        <DropdownMenuSeparator />

        {/* Xem chi tiết (Luôn mở) */}
        <DropdownMenuItem asChild>
          <Link href={`/products/${product.id}`} target="_blank">
            <Eye className="mr-2 h-4 w-4" /> Xem chi tiết
          </Link>
        </DropdownMenuItem>

        {/* Sửa (Disable nếu là auction) */}
        <DropdownMenuItem
          asChild
          disabled={isAuction}
          className={isAuction ? "opacity-50 cursor-not-allowed" : ""}
        >
          {isAuction ? (
            <span className="flex items-center w-full">
              <Lock className="mr-2 h-4 w-4 text-yellow-600" /> Sửa (Bị khóa)
            </span>
          ) : (
            <Link href={`/admin/products/${product.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" /> Chỉnh sửa
            </Link>
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* --- LOGIC NÚT ẨN / GỠ ẨN --- */}

        {/* Nếu đang bán (available) -> Hiện nút TẠM ẨN */}
        {isAvailable && (
          <DropdownMenuItem
            onClick={handleHide}
            disabled={loading || isAuction}
            className="text-orange-600 focus:text-orange-600"
          >
            {loading ? (
              "Đang xử lý..."
            ) : (
              <>
                <EyeOff className="mr-2 h-4 w-4" /> Tạm ẩn sản phẩm
              </>
            )}
          </DropdownMenuItem>
        )}

        {/* Nếu đã bán/ẩn (sold) -> Hiện nút GỠ ẨN / KHÔI PHỤC */}
        {isSold && (
          <DropdownMenuItem
            onClick={handleRestore}
            disabled={loading || isAuction}
            className="text-blue-600 focus:text-blue-600"
          >
            {loading ? (
              "Đang xử lý..."
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" /> Gỡ ẩn / Khôi phục
              </>
            )}
          </DropdownMenuItem>
        )}

        {/* Nếu là Auction -> Thông báo khóa */}
        {isAuction && (
          <DropdownMenuItem
            disabled
            className="text-muted-foreground italic text-xs"
          >
            Sản phẩm đấu giá không thể Ẩn/Xóa
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
