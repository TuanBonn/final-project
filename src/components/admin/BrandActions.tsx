// src/components/admin/BrandActions.tsx
"use client";

import { useState } from "react";
import {
  MoreHorizontal,
  Trash2,
  Edit,
  Loader2,
  PackagePlus,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Kiểu Brand (nhận props từ page)
type BrandRow = {
  id: string;
  name: string;
};

interface BrandActionsProps {
  brand?: BrandRow; // Optional: Nếu không có brand -> là nút "Tạo mới"
  onActionSuccess: () => void; // "Bộ đàm"
}

export function BrandActions({ brand, onActionSuccess }: BrandActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State cho 2 loại dialog
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // State cho tên (dùng cho cả Edit và Create)
  const [name, setName] = useState(brand?.name || "");

  const isCreating = !brand; // Check xem đây là mode Create hay Edit

  // Hàm gọi API (Create/Edit)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const url = isCreating
        ? "/api/admin/brands"
        : `/api/admin/brands/${brand.id}`;
      const method = isCreating ? "POST" : "PATCH";

      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Hành động thất bại.");

      onActionSuccess(); // Báo cáo
      setIsEditOpen(false); // Đóng dialog
      if (isCreating) setName(""); // Reset form nếu là tạo mới
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
    } finally {
      setIsLoading(false);
    }
  };

  // Hàm gọi API (Delete)
  const handleDelete = async () => {
    if (isCreating) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/brands/${brand.id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Xóa thất bại.");
      onActionSuccess(); // Báo cáo
      setIsDeleteOpen(false); // Đóng dialog
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
    } finally {
      setIsLoading(false);
    }
  };

  // Nếu là nút "Tạo mới" (không có prop 'brand')
  if (isCreating) {
    return (
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogTrigger asChild>
          <Button>
            <PackagePlus className="mr-2 h-4 w-4" />
            Thêm Brand mới
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>Thêm Brand mới</DialogTitle>
              <DialogDescription>
                Nhập tên brand. (Ví dụ: "MiniGT", "Tomica"...)
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Tên Brand
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              {error && (
                <p className="col-span-4 text-red-600 text-sm text-center">
                  {error}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Lưu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  // Nếu là nút "Actions" (có prop 'brand')
  return (
    <>
      {/* Dialog Sửa */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>Sửa tên Brand</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name-edit" className="text-right">
                  Tên Brand
                </Label>
                <Input
                  id="name-edit"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              {error && (
                <p className="col-span-4 text-red-600 text-sm text-center">
                  {error}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Lưu thay đổi
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Xóa */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sếp chắc chưa?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                Hành động này sẽ xóa vĩnh viễn brand:
                <strong className="mx-1">{brand.name}</strong>.
                <p className="mt-2 text-yellow-600">
                  Lưu ý: Các sản phẩm đang dùng brand này sẽ bị set brand về
                  "Không có".
                </p>
                {error && (
                  <p className="text-red-600 mt-2 font-medium">{error}</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Vẫn Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Nút 3 chấm */}
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
          <DropdownMenuItem
            onClick={() => {
              setError(null);
              setIsEditOpen(true);
            }}
          >
            <Edit className="mr-2 h-4 w-4" />
            Sửa tên
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setError(null);
              setIsDeleteOpen(true);
            }}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Xóa Brand
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
