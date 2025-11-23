// src/components/admin/TransactionActions.tsx
"use client";

import { useState } from "react";
import { MoreHorizontal, Loader2, CheckCircle, XCircle } from "lucide-react";
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
// Import Enum từ Prisma
import { TransactionStatus } from "@prisma/client";

interface TransactionActionsProps {
  transaction: { id: string; status: TransactionStatus };
  onActionSuccess: () => void;
}

export function TransactionActions({
  transaction,
  onActionSuccess,
}: TransactionActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<{
    status: TransactionStatus;
    title: string;
    desc: string;
  } | null>(null);

  const handleUpdate = async () => {
    if (!actionType) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: actionType.status }),
      });
      if (!res.ok) throw new Error("Lỗi cập nhật");
      onActionSuccess();
      setDialogOpen(false);
    } catch (error) {
      alert("Có lỗi xảy ra");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmAction = (
    status: TransactionStatus,
    title: string,
    desc: string
  ) => {
    setActionType({ status, title, desc });
    setDialogOpen(true);
  };

  return (
    <>
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{actionType?.title}</AlertDialogTitle>
            <AlertDialogDescription>{actionType?.desc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleUpdate} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xác nhận
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
          <DropdownMenuLabel>Hành động</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Nếu đang tranh chấp */}
          {transaction.status === "disputed" && (
            <>
              <DropdownMenuItem
                onClick={() =>
                  confirmAction(
                    "completed",
                    "Xử thắng cho Người bán",
                    "Giao dịch sẽ hoàn thành, tiền chuyển cho người bán."
                  )
                }
              >
                <CheckCircle className="mr-2 h-4 w-4 text-green-600" /> Xử thắng
                (Hoàn thành)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  confirmAction(
                    "cancelled",
                    "Xử thua (Hoàn tiền)",
                    "Giao dịch sẽ hủy, bạn cần hoàn tiền thủ công cho khách."
                  )
                }
              >
                <XCircle className="mr-2 h-4 w-4 text-red-600" /> Xử thua (Hủy)
              </DropdownMenuItem>
            </>
          )}

          {/* Nếu chưa xong */}
          {transaction.status !== "completed" &&
            transaction.status !== "cancelled" &&
            transaction.status !== "disputed" && (
              <DropdownMenuItem
                onClick={() =>
                  confirmAction(
                    "cancelled",
                    "Hủy giao dịch này?",
                    "Hành động không thể hoàn tác."
                  )
                }
              >
                <XCircle className="mr-2 h-4 w-4 text-red-600" /> Hủy bỏ
              </DropdownMenuItem>
            )}

          {(transaction.status === "completed" ||
            transaction.status === "cancelled") && (
            <DropdownMenuItem disabled>Đã kết thúc</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
