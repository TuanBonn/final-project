"use client";

import { useState } from "react";
import { MoreHorizontal, EyeOff, Eye, Loader2, Lock } from "lucide-react";
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

// Cập nhật type cho status
type ProductRow = {
  id: string;
  name: string;
  status: string; // 'available', 'sold', 'auction', 'hidden'
};

interface ProductActionsProps {
  product: ProductRow;
  onActionSuccess: () => void;
}

export function ProductActions({
  product,
  onActionSuccess,
}: ProductActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHidden = product.status === "hidden";
  const isAuction = product.status === "auction";

  // Nếu đang ẩn -> Hành động là Khôi phục. Ngược lại -> Ẩn.
  const currentAction = isHidden ? "Khôi phục (Bỏ ẩn)" : "Tạm Ẩn (Admin Hide)";
  const newStatus = isHidden ? "available" : "hidden";

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
      if (!response.ok) throw new Error(data.error);
      onActionSuccess();
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    const success = await callUpdateApi({ status: newStatus });
    if (success) setAlertOpen(false);
  };

  return (
    <>
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận hành động</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn muốn <strong>{currentAction}</strong> sản phẩm "
              <strong>{product.name}</strong>"?
              <br />
              {isHidden
                ? "Sản phẩm sẽ được hiển thị lại (nếu còn hàng)."
                : "Sản phẩm sẽ biến mất khỏi sàn. Người bán không thể tự mở lại."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleStatus}
              className={isHidden ? "bg-green-600" : "bg-red-600"}
            >
              {isLoading ? <Loader2 className="animate-spin" /> : "Xác nhận"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Quản trị</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {isAuction ? (
            <DropdownMenuItem disabled>
              <Lock className="mr-2 h-4 w-4" /> Đang đấu giá (Khóa)
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => setAlertOpen(true)}
              className={isHidden ? "text-green-600" : "text-red-600"}
            >
              {isHidden ? (
                <Eye className="mr-2 h-4 w-4" />
              ) : (
                <EyeOff className="mr-2 h-4 w-4" />
              )}
              <span>{currentAction}</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
