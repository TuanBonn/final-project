"use client";

import { useState } from "react";
import {
  MoreHorizontal,
  Loader2,
  CheckCircle,
  XCircle,
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
    newStatus: "completed" | "cancelled";
    title: string;
    desc: string;
    isDestructive?: boolean;
  } | null>(null);

  const setupAction = (
    status: "completed" | "cancelled",
    title: string,
    desc: string,
    isDestructive = false
  ) => {
    setActionConfig({ newStatus: status, title, desc, isDestructive });
    setDialogOpen(true);
  };

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
      if (!res.ok) throw new Error(data.error || "Update failed.");

      alert(data.message);
      onActionSuccess();
      setDialogOpen(false);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

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
                ⚠️ This action will directly affect users&apos; wallet balances.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
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
              Confirm
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
            <DropdownMenuItem disabled>Completed</DropdownMenuItem>
          ) : (
            <>
              {/* DISPUTED CASE */}
              {transaction.status === "disputed" && (
                <>
                  <DropdownMenuItem
                    onClick={() =>
                      setupAction(
                        "completed",
                        "Resolve in Favor of Seller",
                        "The transaction will be completed. Funds will be transferred to the seller's wallet.",
                        false
                      )
                    }
                    className="text-green-600 focus:text-green-600"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" /> Seller Wins
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      setupAction(
                        "cancelled",
                        "Resolve in Favor of Buyer",
                        "The transaction will be cancelled. Funds will be refunded to the buyer's wallet.",
                        true
                      )
                    }
                    className="text-red-600 focus:text-red-600"
                  >
                    <XCircle className="mr-2 h-4 w-4" /> Buyer Wins (Refund)
                  </DropdownMenuItem>
                </>
              )}

              {/* OTHER CASES (ADMIN INTERVENTION) */}
              {transaction.status !== "disputed" && (
                <>
                  <DropdownMenuItem
                    onClick={() =>
                      setupAction(
                        "cancelled",
                        "Force Cancel Order",
                        "Use when an order is stuck or the user requests cancellation. Funds will be refunded to the buyer's wallet.",
                        true
                      )
                    }
                    className="text-red-600 focus:text-red-600"
                  >
                    <XCircle className="mr-2 h-4 w-4" /> Force Cancel
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() =>
                      setupAction(
                        "completed",
                        "Force Complete Order",
                        "Use when the buyer has received the item but forgot to confirm. Funds will be released to the seller.",
                        false
                      )
                    }
                  >
                    <CheckCircle className="mr-2 h-4 w-4" /> Force Complete
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
