// src/app/my-products/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Edit, Package, Eye, Plus } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useRouter } from "next/navigation";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount
  );

export default function MyProductsPage() {
  const { user } = useUser();
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Hàm fetch data
  const fetchMyProducts = useCallback(async () => {
    setLoading(true);
    try {
      // Gọi API ta vừa tạo
      const params = new URLSearchParams();
      if (search) params.append("search", search);

      const res = await fetch(`/api/my-products?${params.toString()}`);
      const data = await res.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error("Lỗi tải sản phẩm:", error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  // Debounce search: Đợi 500ms sau khi gõ xong mới tìm
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchMyProducts();
    }, 500);
    return () => clearTimeout(timeout);
  }, [fetchMyProducts]);

  if (!user) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-5xl px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Kho hàng của tôi</h1>
          <p className="text-muted-foreground">
            Quản lý, chỉnh sửa và theo dõi trạng thái sản phẩm.
          </p>
        </div>
        <Button asChild className="bg-orange-600 hover:bg-orange-700">
          <Link href="/sell">
            <Plus className="mr-2 h-4 w-4" /> Đăng bán mới
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm theo tên sản phẩm..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                Không tìm thấy sản phẩm nào.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-lg hover:bg-accent/5 transition-colors bg-card group"
                >
                  {/* Ảnh */}
                  <div className="relative w-20 h-20 shrink-0 bg-muted rounded-md overflow-hidden border">
                    {product.image_urls?.[0] ? (
                      <Image
                        src={product.image_urls[0]}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                        No Img
                      </div>
                    )}
                  </div>

                  {/* Thông tin */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3
                        className="font-semibold text-base truncate"
                        title={product.name}
                      >
                        {product.name}
                      </h3>
                      {/* Badge Status - ĐÃ SỬA LOGIC HIỂN THỊ */}
                      <Badge
                        variant={
                          product.quantity === 0
                            ? "secondary" // Nếu hết hàng -> Màu xám
                            : product.status === "available"
                            ? "default"
                            : product.status === "auction"
                            ? "destructive"
                            : "secondary"
                        }
                        className="shrink-0 text-[10px] uppercase"
                      >
                        {product.quantity === 0
                          ? "Sold" // Hiển thị chữ Sold
                          : product.status === "available"
                          ? "Đang bán"
                          : product.status === "sold"
                          ? "Đã ẩn"
                          : product.status}
                      </Badge>
                    </div>

                    <div className="text-sm text-muted-foreground flex items-center gap-3">
                      <span className="font-medium text-orange-600">
                        {formatCurrency(product.price)}
                      </span>
                      <span>•</span>
                      <span
                        className={
                          product.quantity === 0
                            ? "text-red-600 font-medium"
                            : ""
                        }
                      >
                        Kho: {product.quantity}
                      </span>
                      <span>•</span>
                      <span className="capitalize">
                        {product.condition.replace("_", " ")}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Đăng ngày:{" "}
                      {new Date(product.created_at).toLocaleDateString("vi-VN")}
                    </p>
                  </div>

                  {/* Hành động */}
                  <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="flex-1"
                    >
                      <Link href={`/products/${product.id}`}>
                        <Eye className="mr-2 h-3 w-3" /> Xem
                      </Link>
                    </Button>

                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={product.status === "auction"}
                      onClick={() => router.push(`/sell/${product.id}/edit`)}
                    >
                      <Edit className="mr-2 h-3 w-3" /> Sửa
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
