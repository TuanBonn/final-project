// src/components/admin/AuctionActions.tsx
"use client";

import { useState } from "react";
import { MoreHorizontal, Loader2, Ban, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AuctionStatus } from "@prisma/client";

interface AuctionActionsProps {
  auction: { id: string; status: AuctionStatus };
  onActionSuccess: () => void;
}

export function AuctionActions({
  auction,
  onActionSuccess,
}: AuctionActionsProps) {
  const [isLoading, setIsLoading] = useState(false);

  const updateStatus = async (newStatus: AuctionStatus) => {
    if (!confirm("Bạn có chắc chắn muốn thay đổi trạng thái?")) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/auctions/${auction.id}`, {
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

        {auction.status !== "cancelled" && auction.status !== "ended" && (
          <DropdownMenuItem
            onClick={() => updateStatus("cancelled")}
            className="text-red-600"
          >
            <Ban className="mr-2 h-4 w-4" /> Hủy phiên đấu giá
          </DropdownMenuItem>
        )}

        {auction.status === "cancelled" && (
          <DropdownMenuItem
            onClick={() => updateStatus("active")}
            className="text-blue-600"
          >
            <CheckCircle className="mr-2 h-4 w-4" /> Khôi phục (Active)
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
