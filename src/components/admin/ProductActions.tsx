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

type ProductRow = {
  id: string;
  name: string;
  status: string;
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

  const currentAction = isHidden ? "Restore (Unhide)" : "Hide (Admin Ban)";
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
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to <strong>{currentAction}</strong> the
              product "<strong>{product.name}</strong>"?
              <br />
              <span className="mt-2 block text-sm">
                {isHidden
                  ? "The product will be visible again (if stock > 0)."
                  : "The product will be hidden from the marketplace. Seller cannot unhide it."}
              </span>
              {error && (
                <span className="text-red-500 block mt-2">{error}</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleStatus}
              disabled={isLoading}
              className={
                isHidden
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {isLoading ? (
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
              ) : (
                "Confirm"
              )}
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
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Đã xóa phần Edit Details */}

          {isAuction ? (
            <DropdownMenuItem disabled>
              <Lock className="mr-2 h-4 w-4" /> Auction Active (Locked)
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => setAlertOpen(true)}
              className={
                isHidden
                  ? "text-green-600 focus:text-green-600"
                  : "text-red-600 focus:text-red-600"
              }
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
