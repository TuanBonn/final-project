"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShieldCheck, Edit, Package } from "lucide-react";
import { useUser } from "@/contexts/UserContext";

// Định nghĩa kiểu dữ liệu cho Product
export interface ProductWithDetails {
  id: string;
  name: string;
  price: number;
  condition?: string;
  status?: string;
  image_urls: string[] | null;
  created_at?: string;
  seller_id?: string;
  seller?: {
    username: string;
    avatar_url?: string | null;
    is_verified?: boolean;
  };
  brand?: {
    name: string;
  };
}

interface ProductCardProps {
  product: ProductWithDetails;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount
  );

export function ProductCard({ product }: ProductCardProps) {
  const { user } = useUser();

  // Kiểm tra quyền sở hữu để hiện nút sửa
  const isOwner = user && user.id === product.seller_id;

  // Lấy ảnh đầu tiên hoặc ảnh placeholder
  const mainImage =
    product.image_urls && product.image_urls.length > 0
      ? product.image_urls[0]
      : null;

  return (
    <div className="group relative h-full">
      {/* Link bao quanh toàn bộ Card */}
      <Link href={`/products/${product.id}`} className="block h-full">
        <Card className="h-full overflow-hidden hover:shadow-lg transition-all duration-300 border-muted bg-card flex flex-col">
          {/* === PHẦN ẢNH === */}
          <div className="relative aspect-square w-full bg-muted overflow-hidden">
            {mainImage ? (
              <Image
                src={mainImage}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50">
                <Package className="h-12 w-12 mb-2" />
                <span className="text-xs">No Image</span>
              </div>
            )}

            {/* Badge Tình trạng (Mới/Cũ) */}
            {product.condition && (
              <div className="absolute top-2 left-2">
                <Badge
                  variant={
                    product.condition === "new" ? "default" : "secondary"
                  }
                  className="shadow-sm opacity-90 capitalize"
                >
                  {product.condition.replace(/_/g, " ")}
                </Badge>
              </div>
            )}

            {/* Badge Trạng thái (Nếu không phải available) */}
            {product.status && product.status !== "available" && (
              <div className="absolute top-2 right-2">
                <Badge
                  variant="destructive"
                  className="shadow-sm opacity-90 uppercase text-[10px]"
                >
                  {product.status}
                </Badge>
              </div>
            )}
          </div>

          {/* === PHẦN NỘI DUNG === */}
          <CardContent className="p-3 flex-1 flex flex-col gap-2">
            {/* Tên sản phẩm */}
            <h3
              className="font-medium text-base line-clamp-2 group-hover:text-primary transition-colors"
              title={product.name}
            >
              {product.name}
            </h3>

            {/* Giá tiền */}
            <div className="mt-auto">
              <p className="text-lg font-bold text-orange-600">
                {formatCurrency(Number(product.price))}
              </p>
            </div>
          </CardContent>

          {/* === PHẦN FOOTER (Người bán) === */}
          <CardFooter className="p-3 pt-0 border-t bg-muted/20 flex items-center gap-2 mt-auto">
            <Avatar className="h-6 w-6 border shadow-sm">
              <AvatarImage src={product.seller?.avatar_url || ""} />
              <AvatarFallback className="text-[10px]">
                {product.seller?.username?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <span className="text-xs text-muted-foreground truncate">
                {product.seller?.username || "Ẩn danh"}
              </span>
              {product.seller?.is_verified && (
                <ShieldCheck className="h-3 w-3 text-blue-600 flex-shrink-0" />
              )}
            </div>
          </CardFooter>
        </Card>
      </Link>

      {/* === NÚT SỬA NHANH (Chỉ hiện cho chủ sở hữu) === */}
      {isOwner && (
        <Link
          href={`/sell/${product.id}/edit`}
          className="absolute top-2 right-2 z-20 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-md text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-blue-50 hover:scale-110"
          title="Sửa sản phẩm này"
          onClick={(e) => e.stopPropagation()} // Ngăn chặn click vào Link cha
        >
          <Edit className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
