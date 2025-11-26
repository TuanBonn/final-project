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
import { Loader2, Package, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ProductActions } from "@/components/admin/ProductActions";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  status: string;
  seller: { username: string } | null;
  created_at: string;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val
  );

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Phân trang
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [search, setSearch] = useState("");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        search,
      });
      const res = await fetch(`/api/admin/products?${params.toString()}`);
      const data = await res.json();

      setProducts(data.products || []);
      setTotalPages(data.totalPages || 1);
      setTotalItems(data.totalItems || 0);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchProducts();
    }, 500); // Debounce search
    return () => clearTimeout(timeout);
  }, [fetchProducts]);

  return (
    <Card className="h-full border-none shadow-none md:border md:shadow-sm overflow-hidden flex flex-col">
      <CardHeader className="px-4 md:px-6 flex-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-bold">
              Quản lý Sản phẩm
            </CardTitle>
            <CardDescription>
              Tổng số sản phẩm: <strong>{totalItems}</strong>
            </CardDescription>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Tìm theo tên hoặc ID..."
              className="pl-9 w-full bg-background"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1); // Reset về trang 1 khi tìm kiếm
              }}
            />
          </div>
        </div>
      </CardHeader>

      {/* === THAY ĐỔI: Thêm padding p-4 md:p-6 để bảng không dính sát mép === */}
      <CardContent className="p-4 md:p-6 flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex justify-center items-center py-20 h-64">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
          </div>
        ) : (
          /* === THAY ĐỔI: Thêm border và rounded-md cho container bảng === */
          <div className="w-full overflow-x-auto border rounded-md">
            <Table className="min-w-[1000px]">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[300px]">Tên sản phẩm</TableHead>
                  <TableHead className="w-[150px]">Người bán</TableHead>
                  <TableHead className="w-[150px]">Giá / Kho</TableHead>
                  <TableHead className="w-[150px]">Trạng thái</TableHead>
                  <TableHead className="w-[180px]">Ngày đăng</TableHead>
                  <TableHead className="w-[60px] text-right sticky right-0 bg-muted/50 shadow-sm"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id} className="hover:bg-muted/5 group">
                    <TableCell className="font-medium align-top py-4">
                      <div className="flex flex-col gap-1">
                        <span
                          className="font-semibold text-base truncate max-w-[280px]"
                          title={product.name}
                        >
                          {product.name}
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          ID: {product.id}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="align-top py-4">
                      <span className="text-sm font-medium">
                        @{product.seller?.username || "Ẩn danh"}
                      </span>
                    </TableCell>

                    <TableCell className="align-top py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">
                          {formatCurrency(product.price)}
                        </span>
                        <span className="text-xs text-muted-foreground mt-0.5">
                          Còn lại: {product.quantity}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="align-top py-4">
                      <Badge
                        variant={
                          product.status === "available"
                            ? "default"
                            : product.status === "auction"
                            ? "destructive"
                            : "secondary"
                        }
                        className="whitespace-nowrap capitalize"
                      >
                        {product.status === "auction"
                          ? "Đấu giá"
                          : product.status === "available"
                          ? "Đang bán"
                          : product.status === "sold"
                          ? "Đã ẩn"
                          : product.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="align-top py-4 text-sm text-muted-foreground">
                      {new Date(product.created_at).toLocaleDateString("vi-VN")}
                    </TableCell>

                    <TableCell className="text-right align-top py-4 sticky right-0 bg-background group-hover:bg-muted/5 border-l">
                      <ProductActions
                        product={product}
                        onActionSuccess={fetchProducts}
                      />
                    </TableCell>
                  </TableRow>
                ))}

                {products.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-40 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Package className="h-10 w-10 opacity-20" />
                        <p>Không tìm thấy sản phẩm nào.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        <div className="pt-4 mt-auto">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={
                    page === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>

              <PaginationItem>
                <span className="text-sm font-medium px-4">
                  Trang {page} / {totalPages}
                </span>
              </PaginationItem>

              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={
                    page === totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </CardContent>
    </Card>
  );
}
