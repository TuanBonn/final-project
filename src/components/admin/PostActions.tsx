// src/components/admin/PostActions.tsx
"use client";

import { useState } from "react";
import { MoreHorizontal, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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

interface PostActionsProps {
  post: { id: string; title?: string; content?: string };
  type: "forum" | "wall"; // <-- THÊM PROP NÀY
  onActionSuccess: () => void;
}

export function PostActions({ post, type, onActionSuccess }: PostActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      // Chọn API endpoint dựa trên type
      const endpoint =
        type === "forum"
          ? `/api/admin/posts/${post.id}`
          : `/api/admin/wall-posts/${post.id}`;

      const res = await fetch(endpoint, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Xóa thất bại");
      onActionSuccess();
      setDialogOpen(false);
    } catch (error) {
      alert("Lỗi khi xóa bài viết");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa bài viết?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa bài này? Hành động này không thể hoàn
              tác.
              <br />
              <span className="italic text-xs text-muted-foreground mt-2 block truncate">
                "{post.title || post.content || "Không có tiêu đề"}"
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{" "}
              Xóa vĩnh viễn
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
          <DropdownMenuItem
            onClick={() => setDialogOpen(true)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" /> Xóa bài viết
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
