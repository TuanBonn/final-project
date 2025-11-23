// // src/app/admin/products/page.tsx
// "use client";

// import { useEffect, useState, useCallback } from "react";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { Badge } from "@/components/ui/badge";
// import { Loader2, AlertCircle, Search } from "lucide-react";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { ProductActions } from "@/components/admin/ProductActions";

// // Định nghĩa kiểu Product
// interface Product {
//   id: string;
//   name: string;
//   price: number;
//   status: "available" | "in_transaction" | "sold";
//   created_at: string;
//   seller: {
//     username: string | null;
//   } | null;
// }

// // Hàm format tiền
// const formatCurrency = (amount: number) => {
//   return new Intl.NumberFormat("vi-VN", {
//     style: "currency",
//     currency: "VND",
//   }).format(amount);
// };

// export default function AdminProductsPage() {
//   const [products, setProducts] = useState<Product[]>([]);
//   const [loading, setLoading] = useState(true); // Chỉ loading lần đầu
//   const [isSearching, setIsSearching] = useState(false); // Dùng cho refetch
//   const [error, setError] = useState<string | null>(null);
//   const [searchTerm, setSearchTerm] = useState("");

//   // === HÀM FETCH (ĐÃ SỬA LOGIC LOADING) ===
//   const fetchProducts = useCallback(
//     async (searchQuery: string, isInitialLoad: boolean = false) => {
//       // 1. Phân loại loading
//       if (isInitialLoad) {
//         setLoading(true);
//       } else {
//         setIsSearching(true);
//       }
//       setError(null);

//       try {
//         const params = new URLSearchParams();
//         if (searchQuery) params.append("search", searchQuery);

//         const response = await fetch(
//           `/api/admin/products?${params.toString()}`
//         );
//         if (!response.ok) {
//           const data = await response.json().catch(() => ({}));
//           throw new Error(data.error || `Lỗi HTTP: ${response.status}`);
//         }
//         const data = await response.json();
//         setProducts(data.products || []);
//       } catch (err: unknown) {
//         setError(err instanceof Error ? err.message : "Lỗi không xác định.");
//       } finally {
//         // 2. Tắt cả 2 loại loading
//         setLoading(false);
//         setIsSearching(false);
//       }
//     },
//     []
//   );

//   // Fetch lần đầu
//   useEffect(() => {
//     // 3. Đánh dấu đây là lần tải ĐẦU TIÊN
//     fetchProducts("", true);
//   }, [fetchProducts]);

//   // Xử lý bấm nút tìm
//   const handleSearchSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     // 4. Đây KHÔNG phải lần tải đầu tiên
//     fetchProducts(searchTerm, false);
//   };

//   // Hàm "bộ đàm" cho component Action
//   const handleActionSuccess = () => {
//     // 5. Đây KHÔNG phải lần tải đầu tiên
//     fetchProducts(searchTerm, false);
//   };

//   // --- Render UI ---
//   if (loading) {
//     return (
//       <div className="flex justify-center items-center py-20">
//         <Loader2 className="h-10 w-10 animate-spin text-primary" />
//       </div>
//     );
//   }

//   if (error) {
//     /* ... (giữ nguyên code render lỗi) ... */
//     return (
//       <div className="flex justify-center items-center py-20 bg-destructive/10 border border-destructive/30 rounded-lg p-4">
//         <AlertCircle className="h-8 w-8 text-destructive mr-3" />
//         <p className="text-destructive font-medium">Lỗi: {error}</p>
//       </div>
//     );
//   }

//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle>Quản lý Sản phẩm ({products.length})</CardTitle>
//         <CardDescription>
//           Tìm kiếm và xem tất cả sản phẩm trong hệ thống.
//         </CardDescription>
//         <form
//           onSubmit={handleSearchSubmit}
//           className="relative pt-4 flex gap-2"
//         >
//           <div className="relative flex-1">
//             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//             <Input
//               placeholder="Tìm theo tên sản phẩm..."
//               className="w-full max-w-sm pl-9"
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//             />
//           </div>
//           <Button type="submit" disabled={isSearching}>
//             {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tìm"}
//           </Button>
//         </form>
//       </CardHeader>
//       <CardContent>
//         {/* Hiển thị loading nhỏ khi đang search/action */}
//         {isSearching && (
//           <div className="flex justify-center items-center py-4">
//             <Loader2 className="h-5 w-5 animate-spin text-primary" />
//             <span className="ml-2 text-muted-foreground text-sm">
//               Đang tải...
//             </span>
//           </div>
//         )}

//         <Table>
//           <TableHeader>{/* ... (giữ nguyên) ... */}</TableHeader>
//           <TableBody>
//             {!isSearching && products.length === 0 ? (
//               <TableRow>{/* ... (giữ nguyên) ... */}</TableRow>
//             ) : (
//               products.map((product) => (
//                 <TableRow key={product.id}>
//                   {/* ... (giữ nguyên các TableCell) ... */}
//                   <TableCell className="font-medium">{product.name}</TableCell>
//                   <TableCell>
//                     @{product.seller?.username || "Không rõ"}
//                   </TableCell>
//                   <TableCell>{formatCurrency(product.price)}</TableCell>
//                   <TableCell>
//                     <Badge
//                       variant={
//                         product.status === "available" ? "default" : "outline"
//                       }
//                       className={
//                         product.status === "sold"
//                           ? "bg-red-500 text-white"
//                           : product.status === "in_transaction"
//                           ? "bg-yellow-500 text-white"
//                           : ""
//                       }
//                     >
//                       {product.status}
//                     </Badge>
//                   </TableCell>
//                   <TableCell>
//                     {new Date(product.created_at).toLocaleDateString("vi-VN")}
//                   </TableCell>
//                   <TableCell className="text-right">
//                     <ProductActions
//                       product={product}
//                       onActionSuccess={handleActionSuccess} // Hàm "bộ đàm"
//                     />
//                   </TableCell>
//                 </TableRow>
//               ))
//             )}
//           </TableBody>
//         </Table>
//       </CardContent>
//     </Card>
//   );
// }

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
// === 1. IMPORT TỪ PRISMA ===
import { Product, ProductStatus } from "@prisma/client";
// =========================

// === 2. ĐỊNH NGHĨA TYPE CHO UI ===
// Sử dụng Pick để lấy các trường cần thiết từ Prisma Product
// Override lại 'price' (number) và 'created_at' (string) vì JSON API trả về như vậy
type ProductRow = Pick<Product, "id" | "name" | "status"> & {
  price: number;
  created_at: string;
  seller: {
    username: string | null;
  } | null;
};

// Hàm format tiền
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

export default function AdminProductsPage() {
  // === 3. SỬ DỤNG TYPE MỚI ===
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchProducts = useCallback(
    async (searchQuery: string, isInitialLoad: boolean = false) => {
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setIsSearching(true);
      }
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
          Tìm kiếm và xem tất cả sản phẩm trong hệ thống.
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

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sản phẩm</TableHead>
              <TableHead>Người bán</TableHead>
              <TableHead>Giá</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày đăng</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isSearching && products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24">
                  Không tìm thấy sản phẩm nào.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    @{product.seller?.username || "Không rõ"}
                  </TableCell>
                  <TableCell>{formatCurrency(product.price)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        // === DÙNG ENUM CỦA PRISMA ===
                        product.status === ProductStatus.available
                          ? "default"
                          : "outline"
                      }
                      className={
                        product.status === ProductStatus.sold
                          ? "bg-red-500 text-white"
                          : product.status === ProductStatus.in_transaction
                          ? "bg-yellow-500 text-white"
                          : ""
                      }
                    >
                      {product.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(product.created_at).toLocaleDateString("vi-VN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <ProductActions
                      // Truyền đúng kiểu mà ProductActions mong đợi (nếu component đó chưa sửa thì ép kiểu nhẹ)
                      product={{
                        id: product.id,
                        name: product.name,
                        status: product.status as
                          | "available"
                          | "in_transaction"
                          | "sold",
                      }}
                      onActionSuccess={handleActionSuccess}
                    />
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
