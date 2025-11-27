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
    if (!confirm("Are you sure you want to change the status?")) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/auctions/${auction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Update failed");
      onActionSuccess();
    } catch (error) {
      alert("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Nếu đã kết thúc -> Khóa nút (Disabled)
  const isEnded = auction.status === "ended";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 w-8 p-0"
          disabled={isLoading || isEnded} // <--- KHÓA TẠI ĐÂY
        >
          {isLoading ? (
            <Loader2 className="animate-spin h-4 w-4" />
          ) : (
            <MoreHorizontal className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Chỉ hiện Cancel nếu chưa cancel */}
        {auction.status !== "cancelled" && (
          <DropdownMenuItem
            onClick={() => updateStatus("cancelled")}
            className="text-red-600"
          >
            <Ban className="mr-2 h-4 w-4" /> Cancel Auction
          </DropdownMenuItem>
        )}

        {/* Cho phép khôi phục nếu đã Cancel */}
        {auction.status === "cancelled" && (
          <DropdownMenuItem
            onClick={() => updateStatus("active")}
            className="text-blue-600"
          >
            <CheckCircle className="mr-2 h-4 w-4" /> Restore (Set Active)
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
