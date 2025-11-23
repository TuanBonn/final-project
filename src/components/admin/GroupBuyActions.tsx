// src/components/admin/GroupBuyActions.tsx
"use client";

import { useState } from "react";
import {
  MoreHorizontal,
  Loader2,
  XCircle,
  CheckCircle,
  Ban,
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
import { GroupBuyStatus } from "@prisma/client";

interface GroupBuyActionsProps {
  groupBuy: { id: string; status: GroupBuyStatus; productName: string };
  onActionSuccess: () => void;
}

export function GroupBuyActions({
  groupBuy,
  onActionSuccess,
}: GroupBuyActionsProps) {
  const [isLoading, setIsLoading] = useState(false);

  const updateStatus = async (newStatus: GroupBuyStatus) => {
    if (!confirm(`Bạn có chắc chắn muốn đổi trạng thái sang "${newStatus}"?`))
      return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/group-buys/${groupBuy.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Lỗi cập nhật");
      onActionSuccess();
    } catch (error) {
      alert("Có lỗi xảy ra");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="animate-spin h-4 w-4" />
          ) : (
            <MoreHorizontal className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Hành động</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Chỉ hiện các action hợp lý dựa trên trạng thái hiện tại */}
        {groupBuy.status === "open" && (
          <>
            <DropdownMenuItem
              onClick={() => updateStatus("failed")}
              className="text-red-600"
            >
              <Ban className="mr-2 h-4 w-4" /> Hủy kèo (Failed)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => updateStatus("successful")}
              className="text-green-600"
            >
              <CheckCircle className="mr-2 h-4 w-4" /> Duyệt thành công
            </DropdownMenuItem>
          </>
        )}

        {groupBuy.status === "successful" && (
          <DropdownMenuItem
            onClick={() => updateStatus("completed")}
            className="text-blue-600"
          >
            <CheckCircle className="mr-2 h-4 w-4" /> Hoàn tất (Completed)
          </DropdownMenuItem>
        )}

        {(groupBuy.status === "failed" || groupBuy.status === "completed") && (
          <DropdownMenuItem disabled>Đã kết thúc</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
