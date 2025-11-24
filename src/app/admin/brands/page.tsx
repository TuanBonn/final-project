// src/app/admin/brands/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, AlertCircle } from "lucide-react";
import { BrandActions } from "@/components/admin/BrandActions";
// === 1. IMPORT TỪ PRISMA ===
import { Brand } from "@prisma/client";
// ========================

// === 2. ĐỊNH NGHĨA LẠI CHO KHỚP API JSON ===
// Prisma trả về Date object, nhưng qua API JSON nó thành chuỗi ISO string
type BrandRow = Omit<Brand, "created_at"> & { created_at: string };

export default function AdminBrandsPage() {
  // === 3. SỬ DỤNG TYPE MỚI ===
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hàm fetch
  const fetchBrands = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/admin/brands");
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Lỗi HTTP: ${response.status}`);
      }
      const data = await response.json();
      setBrands(data.brands || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center py-20 bg-destructive/10 border border-destructive/30 rounded-lg p-4">
        <AlertCircle className="h-8 w-8 text-destructive mr-3" />
        <p className="text-destructive font-medium">Lỗi: {error}</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Quản lý Brand ({brands.length})</CardTitle>
          <CardDescription>
            Thêm, sửa, xóa các hãng xe (dùng cho trang đăng bán).
          </CardDescription>
        </div>
        <BrandActions onActionSuccess={fetchBrands} />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên Brand</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {brands.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center h-24">
                  Chưa có brand nào.
                </TableCell>
              </TableRow>
            ) : (
              brands.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell className="font-medium">{brand.name}</TableCell>
                  <TableCell>
                    {new Date(brand.created_at).toLocaleDateString("vi-VN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <BrandActions brand={brand} onActionSuccess={fetchBrands} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
