// src/components/admin/UserActions.tsx
"use client";

import { useState } from "react";
import {
  MoreHorizontal,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  Award,
  BadgeCheck,
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

type UserRow = {
  id: string;
  username: string | null;
  status: "active" | "banned";
  role?: "user" | "dealer" | "admin";
  is_verified?: boolean;
};

interface UserActionsProps {
  user: UserRow;
  onActionSuccess: () => void;
}

export function UserActions({ user, onActionSuccess }: UserActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentAction = user.status === "active" ? "Ban" : "Unban";

  const callUpdateApi = async (payload: object) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Action failed.");

      onActionSuccess();
      return true;
    } catch (err: unknown) {
      console.error("Error updating user:", err);
      if (alertOpen) {
        setError(err instanceof Error ? err.message : "Unknown error.");
      } else {
        alert(err instanceof Error ? err.message : "Unknown error.");
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleBan = async () => {
    const newStatus = user.status === "active" ? "banned" : "active";
    const success = await callUpdateApi({ status: newStatus });
    if (success) setAlertOpen(false);
  };

  const handleToggleRole = async () => {
    const newRole = user.role === "dealer" ? "user" : "dealer";
    await callUpdateApi({ role: newRole });
  };

  const handleToggleVerify = async () => {
    const newVerified = !user.is_verified;
    await callUpdateApi({ is_verified: newVerified });
  };

  return (
    <>
      {/* Confirmation Dialog for Ban/Unban */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                You are about to <strong>{currentAction.toLowerCase()}</strong>{" "}
                the user
                <strong> {user.username || user.id}</strong>.
                <br />
                {user.status === "active"
                  ? "This user will no longer be able to sign in."
                  : "This user will be able to sign in again."}
                {error && (
                  <p className="text-red-600 mt-2 font-medium">
                    Error: {error}
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleBan}
              disabled={isLoading}
              className={
                user.status === "active"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `Confirm ${currentAction}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dropdown Menu */}
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
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>

          {/* 1. Change Role */}
          {user.role !== "admin" && (
            <DropdownMenuItem onClick={handleToggleRole} disabled={isLoading}>
              <Award className="mr-2 h-4 w-4" />
              <span>
                {user.role === "dealer"
                  ? "Demote to User"
                  : "Promote to Dealer"}
              </span>
            </DropdownMenuItem>
          )}

          {/* 2. Toggle Verify */}
          {user.role !== "admin" && (
            <DropdownMenuItem
              onClick={handleToggleVerify}
              disabled={isLoading}
              className={
                user.is_verified
                  ? "text-yellow-600 focus:text-yellow-600"
                  : "text-green-600 focus:text-green-600"
              }
            >
              <BadgeCheck className="mr-2 h-4 w-4" />
              <span>{user.is_verified ? "Revoke Verify" : "Grant Verify"}</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* 3. Ban/Unban */}
          <DropdownMenuItem
            onClick={() => {
              setError(null);
              setAlertOpen(true);
            }}
            disabled={isLoading || user.role === "admin"}
            className={
              user.status === "active"
                ? "text-red-600 focus:text-red-600"
                : "text-green-600 focus:text-green-600"
            }
          >
            {user.status === "active" ? (
              <ShieldAlert className="mr-2 h-4 w-4" />
            ) : (
              <ShieldCheck className="mr-2 h-4 w-4" />
            )}
            <span>{currentAction} User</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
