// // src/components/ProductCard.tsx
// import Link from "next/link";
// import Image from "next/image";
// import {
//   Card,
//   CardContent,
//   CardFooter,
//   CardHeader,
// } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { CheckCircle } from "lucide-react"; // Icon cho "Verified"

// // Định nghĩa kiểu dữ liệu (ĐÃ SỬA)
// interface Seller {
//   username: string | null;
//   avatar_url: string | null;
//   is_verified: boolean;
// }
// interface Brand {
//   // <-- Thêm kiểu Brand
//   id: string;
//   name: string;
// }
// interface Product {
//   id: string;
//   name: string;
//   price: number;
//   image_urls: string[] | null;
//   seller: Seller | null;
//   brand: Brand | null; // <-- Sửa: 'brand' giờ là một object
// }

// // Hàm format tiền
// const formatCurrency = (amount: number) => {
//   return new Intl.NumberFormat("vi-VN", {
//     style: "currency",
//     currency: "VND",
//   }).format(amount);
// };
// // Hàm lấy tên viết tắt
// const getInitials = (name: string | null): string => {
//   if (!name) return "??";
//   return name
//     .split(" ")
//     .map((n) => n[0])
//     .join("")
//     .toUpperCase()
//     .slice(0, 2);
// };

// export function ProductCard({ product }: { product: Product }) {
//   const sellerUsername = product.seller?.username || "Ẩn danh";
//   const sellerAvatar = product.seller?.avatar_url || "";
//   const isVerified = product.seller?.is_verified === true;
//   const productUrl = `/products/${product.id}`;
//   const sellerUrl = `/user/${sellerUsername}`;

//   return (
//     <Card className="overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 flex flex-col h-full">
//       {/* 1. Ảnh sản phẩm (Giữ nguyên) */}
//       <Link
//         href={productUrl}
//         className="block aspect-square relative bg-muted overflow-hidden"
//       >
//         {product.image_urls && product.image_urls.length > 0 ? (
//           <Image
//             src={product.image_urls[0]} // Lấy ảnh đầu
//             alt={product.name}
//             fill
//             sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw"
//             className="object-cover transition-transform duration-300 group-hover:scale-105"
//           />
//         ) : (
//           <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
//             No Image
//           </div>
//         )}
//       </Link>

//       <div className="p-4 flex flex-col flex-grow">
//         {/* 2. Tên sản phẩm + Badge */}
//         <h3 className="font-semibold text-sm leading-snug tracking-tight truncate mb-2 min-h-[2.5rem] group">
//           <Link href={productUrl} className="hover:underline">
//             {/* Badge Verified (nếu có) */}
//             {isVerified && (
//               <Badge
//                 variant="outline"
//                 className="mr-1.5 border-green-600 text-green-600 bg-green-50 px-1 py-0 text-[10px] font-bold"
//               >
//                 <CheckCircle className="h-3 w-3 mr-1" />
//                 Verified
//               </Badge>
//             )}
//             {product.name}
//           </Link>
//         </h3>

//         {/* 3. Giá sản phẩm */}
//         <p className="text-lg font-bold text-primary mb-3">
//           {formatCurrency(product.price)}
//         </p>

//         {/* 4. Brand (SỬA LẠI ĐỂ ĐỌC brand.name) */}
//         <p className="text-xs text-muted-foreground mb-3 truncate">
//           Hãng xe: {product.brand?.name || "Không rõ"}
//         </p>

//         {/* 5. Tên người bán (ở dưới cùng) */}
//         <div className="mt-auto border-t pt-3">
//           <Link
//             href={sellerUrl}
//             className="flex items-center gap-2 w-full group"
//           >
//             <Avatar className="h-6 w-6 border">
//               <AvatarImage src={sellerAvatar} alt={sellerUsername} />
//               <AvatarFallback className="text-xs">
//                 {getInitials(sellerUsername)}
//               </AvatarFallback>
//             </Avatar>
//             <span className="text-xs text-muted-foreground group-hover:text-primary truncate">
//               {sellerUsername}
//             </span>
//           </Link>
//         </div>
//       </div>
//     </Card>
//   );
// }

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
import { CheckCircle } from "lucide-react";
// === 1. IMPORT TỪ PRISMA ===
import { Product, Brand, User } from "@prisma/client";
// =========================

// === 2. ĐỊNH NGHĨA TYPE CHUẨN VÀ EXPORT ĐỂ DÙNG LẠI ===
// Type này mô tả một sản phẩm đầy đủ thông tin để hiển thị lên Card
export type ProductWithDetails = Pick<Product, "id" | "name"> & {
  price: number; // API trả về number, Prisma là Decimal
  image_urls: string[] | null; // API trả về mảng string, Prisma là Json
  seller: Pick<User, "username" | "avatar_url" | "is_verified"> | null;
  brand: Pick<Brand, "name" | "id"> | null;
};

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

export function ProductCard({ product }: { product: ProductWithDetails }) {
  const sellerUsername = product.seller?.username || "Ẩn danh";
  const sellerAvatar = product.seller?.avatar_url || "";
  const isVerified = product.seller?.is_verified === true;
  const productUrl = `/products/${product.id}`;
  const sellerUrl = `/user/${sellerUsername}`;

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

        {/* 4. Brand */}
        <p className="text-xs text-muted-foreground mb-3 truncate">
          Hãng xe: {product.brand?.name || "Không rõ"}
        </p>

        {/* 5. Tên người bán */}
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
