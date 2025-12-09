"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Ban, Loader2 } from "lucide-react";

interface AuctionActionsProps {
  auctionId: string;
  currentStatus: string;
  onUpdate: () => void;
}

export function AuctionActions({
  auctionId,
  currentStatus,
  onUpdate,
}: AuctionActionsProps) {
  const [loading, setLoading] = useState(false);

  const handleCancelAuction = async () => {
    if (
      !confirm(
        "Are you sure you want to cancel this auction? Participants will be refunded."
      )
    )
      return;

    setLoading(true);
    try {
      const res = await fetch(`/api/auctions/${auctionId}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled", isAdmin: true }),
      });

      if (res.ok) {
        alert("Auction cancelled successfully.");
        onUpdate();
      } else {
        const errorData = await res.json();
        alert(`Error: ${errorData.error || "Failed to cancel auction"}`);
      }
    } catch (error) {
      console.error(error);
      alert("Connection error.");
    } finally {
      setLoading(false);
    }
  };

  // Chỉ hiển thị Action nếu trạng thái là "active"
  if (currentStatus !== "active") {
    return (
      <Button variant="ghost" size="icon" disabled className="opacity-50">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreHorizontal className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="text-red-600 focus:text-red-600 cursor-pointer"
          onClick={handleCancelAuction}
          disabled={loading}
        >
          <Ban className="mr-2 h-4 w-4" /> Cancel Auction
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
