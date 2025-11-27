// src/app/admin/products/page.tsx
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
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProductActions } from "@/components/admin/ProductActions";

interface ProductRow {
  id: string;
  name: string;
  price: number;
  quantity: number;
  status: "available" | "sold" | "auction"; // <-- CẬP NHẬT TYPE
  created_at: string;
  seller: {
    username: string | null;
  } | null;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchProducts = useCallback(
    async (searchQuery: string, isInitialLoad: boolean = false) => {
      if (isInitialLoad) setLoading(true);
      else setIsSearching(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (searchQuery) params.append("search", searchQuery);

        const response = await fetch(
          `/api/admin/products?${params.toString()}`
        );
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `Lỗi HTTP: ${response.status}`);
        }
        const data = await response.json();
        setProducts(data.products || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Lỗi không xác định.");
      } finally {
        setLoading(false);
        setIsSearching(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchProducts("", true);
  }, [fetchProducts]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts(searchTerm, false);
  };

  const handleActionSuccess = () => {
    fetchProducts(searchTerm, false);
  };

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
      <CardHeader>
        <CardTitle>Quản lý Sản phẩm ({products.length})</CardTitle>
        <CardDescription>
          Tìm kiếm và kiểm soát kho hàng toàn hệ thống.
        </CardDescription>
        <form
          onSubmit={handleSearchSubmit}
          className="relative pt-4 flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên sản phẩm..."
              className="w-full max-w-sm pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={isSearching}>
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tìm"}
          </Button>
        </form>
      </CardHeader>
      <CardContent>
        {isSearching && (
          <div className="flex justify-center items-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground text-sm">
              Đang tải...
            </span>
          </div>
        )}

        <div className="rounded-md border overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Sản phẩm</TableHead>
                <TableHead>Người bán</TableHead>
                <TableHead>Giá</TableHead>
                <TableHead>Kho</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày đăng</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isSearching && products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24">
                    Không tìm thấy sản phẩm nào.
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell
                      className="font-medium max-w-[250px] truncate"
                      title={product.name}
                    >
                      {product.name}
                    </TableCell>
                    <TableCell>@{product.seller?.username || "---"}</TableCell>
                    <TableCell>{formatCurrency(product.price)}</TableCell>
                    <TableCell>{product.quantity}</TableCell>
                    <TableCell>
                      {/* LOGIC BADGE MỚI */}
                      <Badge
                        variant={
                          product.status === "available"
                            ? "default"
                            : product.status === "auction"
                            ? "destructive" // Màu đỏ/cam cho đấu giá
                            : "secondary" // Màu xám cho Sold
                        }
                        className="whitespace-nowrap capitalize"
                      >
                        {product.status === "auction"
                          ? "Đang Đấu Giá"
                          : product.status === "available"
                          ? "Đang Bán"
                          : "Đã Ẩn / Hết"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(product.created_at).toLocaleDateString("vi-VN")}
                    </TableCell>
                    <TableCell className="text-right">
                      <ProductActions
                        product={product}
                        onActionSuccess={handleActionSuccess}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
