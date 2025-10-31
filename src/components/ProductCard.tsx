// src/components/ProductCard.tsx
import Link from "next/link";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle } from "lucide-react"; // Icon cho "Verified"

// Định nghĩa kiểu dữ liệu (import từ file types chung nếu có)
interface Seller {
  username: string | null;
  avatar_url: string | null;
  is_verified: boolean;
}
interface Product {
  id: string;
  name: string;
  price: number;
  image_urls: string[] | null;
  seller: Seller | null;
}

// Hàm format tiền
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};
// Hàm lấy tên viết tắt
const getInitials = (name: string | null): string => {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export function ProductCard({ product }: { product: Product }) {
  const sellerUsername = product.seller?.username || "Ẩn danh";
  const sellerAvatar = product.seller?.avatar_url || "";
  const isVerified = product.seller?.is_verified === true;
  const productUrl = `/products/${product.id}`; // Đường dẫn tới trang chi tiết (làm sau)
  const sellerUrl = `/user/${sellerUsername}`; // Đường dẫn tới trang user (làm sau)

  return (
    <Card className="overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 flex flex-col h-full">
      {/* 1. Ảnh sản phẩm */}
      <Link
        href={productUrl}
        className="block aspect-square relative bg-muted overflow-hidden"
      >
        {product.image_urls && product.image_urls.length > 0 ? (
          <Image
            src={product.image_urls[0]} // Lấy ảnh đầu
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No Image
          </div>
        )}
      </Link>

      <div className="p-4 flex flex-col flex-grow">
        {/* 2. Tên sản phẩm + Badge */}
        <h3 className="font-semibold text-sm leading-snug tracking-tight truncate mb-2 min-h-[2.5rem] group">
          <Link href={productUrl} className="hover:underline">
            {/* Badge Verified (nếu có) */}
            {isVerified && (
              <Badge
                variant="outline"
                className="mr-1.5 border-green-600 text-green-600 bg-green-50 px-1 py-0 text-[10px] font-bold"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
            {product.name}
          </Link>
        </h3>

        {/* 3. Giá sản phẩm */}
        <p className="text-lg font-bold text-primary mb-3">
          {formatCurrency(product.price)}
        </p>

        {/* 4. Tên người bán (ở dưới cùng) */}
        <div className="mt-auto border-t pt-3">
          <Link
            href={sellerUrl}
            className="flex items-center gap-2 w-full group"
          >
            <Avatar className="h-6 w-6 border">
              <AvatarImage src={sellerAvatar} alt={sellerUsername} />
              <AvatarFallback className="text-xs">
                {getInitials(sellerUsername)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground group-hover:text-primary truncate">
              {sellerUsername}
            </span>
          </Link>
        </div>
      </div>
    </Card>
  );
}
