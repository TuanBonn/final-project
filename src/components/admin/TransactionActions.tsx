// src/components/admin/TransactionActions.tsx
"use client";

import { useState } from "react";
import {
  MoreHorizontal,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ShieldAlert,
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
  const [actionConfig, setActionConfig] = useState<{
    newStatus: "completed" | "cancelled"; // Admin chỉ quan tâm 2 trạng thái cuối này
    title: string;
    desc: string;
    isDestructive?: boolean;
  } | null>(null);

  // Hàm chuẩn bị hành động
  const setupAction = (
    status: "completed" | "cancelled",
    title: string,
    desc: string,
    isDestructive = false
  ) => {
    setActionConfig({ newStatus: status, title, desc, isDestructive });
    setDialogOpen(true);
  };

  // Hàm thực thi API
  const executeAction = async () => {
    if (!actionConfig) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: actionConfig.newStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi cập nhật");

      alert(data.message);
      onActionSuccess();
      setDialogOpen(false);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Nếu đơn đã xong, không làm gì thêm (trừ khi muốn reopen - tính năng nâng cao)
  const isFinal =
    transaction.status === "completed" || transaction.status === "cancelled";

  return (
    <>
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {actionConfig?.isDestructive && (
                <ShieldAlert className="h-5 w-5 text-red-600" />
              )}
              {actionConfig?.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionConfig?.desc}
              <br />
              <span className="mt-2 block text-xs text-muted-foreground bg-muted p-2 rounded">
                ⚠️ Hành động này sẽ ảnh hưởng trực tiếp đến Ví tiền của người
                dùng.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeAction}
              disabled={isLoading}
              className={
                actionConfig?.isDestructive
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Admin Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {isFinal ? (
            <DropdownMenuItem disabled>Đã kết thúc</DropdownMenuItem>
          ) : (
            <>
              {/* === TRƯỜNG HỢP KHIẾU NẠI (DISPUTED) === */}
              {transaction.status === "disputed" && (
                <>
                  <DropdownMenuItem
                    onClick={() =>
                      setupAction(
                        "completed",
                        "Xử Thắng cho Người Bán",
                        "Giao dịch sẽ hoàn tất. Tiền sẽ được chuyển vào ví Người bán.",
                        false
                      )
                    }
                    className="text-green-600 focus:text-green-600"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" /> Xử Seller Thắng
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      setupAction(
                        "cancelled",
                        "Xử Thắng cho Người Mua",
                        "Giao dịch sẽ bị Hủy. Tiền sẽ được HOÀN LẠI ví Người mua.",
                        true
                      )
                    }
                    className="text-red-600 focus:text-red-600"
                  >
                    <XCircle className="mr-2 h-4 w-4" /> Xử Buyer Thắng (Refund)
                  </DropdownMenuItem>
                </>
              )}

              {/* === CÁC TRƯỜNG HỢP KHÁC (CAN THIỆP) === */}
              {transaction.status !== "disputed" && (
                <>
                  <DropdownMenuItem
                    onClick={() =>
                      setupAction(
                        "cancelled",
                        "Buộc Hủy Đơn (Force Cancel)",
                        "Dùng khi đơn hàng bị treo hoặc người dùng yêu cầu hủy. Tiền sẽ được hoàn về ví người mua.",
                        true
                      )
                    }
                    className="text-red-600 focus:text-red-600"
                  >
                    <XCircle className="mr-2 h-4 w-4" /> Buộc Hủy Đơn
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() =>
                      setupAction(
                        "completed",
                        "Buộc Hoàn Tất (Force Complete)",
                        "Dùng khi khách đã nhận hàng nhưng quên xác nhận. Tiền sẽ chuyển cho Seller.",
                        false
                      )
                    }
                  >
                    <CheckCircle className="mr-2 h-4 w-4" /> Buộc Hoàn Tất
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
