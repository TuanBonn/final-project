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
    if (
      !confirm(`Are you sure you want to change the status to "${newStatus}"?`)
    )
      return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/group-buys/${groupBuy.id}`, {
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
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Only show valid actions based on current status */}
        {groupBuy.status === "open" && (
          <>
            <DropdownMenuItem
              onClick={() => updateStatus("failed")}
              className="text-red-600"
            >
              <Ban className="mr-2 h-4 w-4" /> Cancel (Failed)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => updateStatus("successful")}
              className="text-green-600"
            >
              <CheckCircle className="mr-2 h-4 w-4" /> Mark as Successful
            </DropdownMenuItem>
          </>
        )}

        {groupBuy.status === "successful" && (
          <DropdownMenuItem
            onClick={() => updateStatus("completed")}
            className="text-blue-600"
          >
            <CheckCircle className="mr-2 h-4 w-4" /> Complete
          </DropdownMenuItem>
        )}

        {(groupBuy.status === "failed" || groupBuy.status === "completed") && (
          <DropdownMenuItem disabled>Finished</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
