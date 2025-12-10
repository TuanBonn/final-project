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
// import { ProductActions } from "@/components/admin/ProductActions";

// interface ProductRow {
//   id: string;
//   name: string;
//   price: number;
//   quantity: number;
//   status: "available" | "sold" | "auction" | "hidden";
//   created_at: string;
//   seller: {
//     username: string | null;
//   } | null;
// }

// const formatCurrency = (amount: number) => {
//   return new Intl.NumberFormat("en-US", {
//     // Đổi sang en-US hoặc giữ vi-VN tùy bạn, ở đây giữ VND cho hợp lý
//     style: "currency",
//     currency: "VND",
//   }).format(amount);
// };

// export default function AdminProductsPage() {
//   const [products, setProducts] = useState<ProductRow[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState("");
//   const [isSearching, setIsSearching] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const fetchProducts = useCallback(
//     async (searchTerm = "", isInitialLoad = false) => {
//       if (isInitialLoad) setLoading(true);
//       else setIsSearching(true);
//       setError(null);

//       try {
//         const params = new URLSearchParams();
//         if (searchTerm) params.append("search", searchTerm);

//         const response = await fetch(
//           `/api/admin/products?${params.toString()}`
//         );
//         if (!response.ok) {
//           const data = await response.json().catch(() => ({}));
//           throw new Error(data.error || "Failed to load products");
//         }
//         const data = await response.json();
//         setProducts(data.products || []);
//       } catch (err: any) {
//         setError(err.message);
//       } finally {
//         setLoading(false);
//         setIsSearching(false);
//       }
//     },
//     []
//   );

//   // 1. Initial Load
//   useEffect(() => {
//     fetchProducts("", true);
//   }, [fetchProducts]);

//   // 2. Debounce Search
//   useEffect(() => {
//     const timeout = setTimeout(() => {
//       fetchProducts(search, false);
//     }, 500);
//     return () => clearTimeout(timeout);
//   }, [search, fetchProducts]);

//   if (loading) {
//     return (
//       <div className="flex justify-center items-center py-20">
//         <Loader2 className="h-10 w-10 animate-spin text-primary" />
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="flex justify-center items-center py-20 bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive">
//         <AlertCircle className="h-6 w-6 mr-2" />
//         <span>Error: {error}</span>
//       </div>
//     );
//   }

//   return (
//     <Card>
//       <CardHeader>
//         <div className="flex flex-col md:flex-row justify-between items-start gap-4">
//           <div>
//             <CardTitle>Product Management</CardTitle>
//             <CardDescription>
//               Manage inventory and product status across the system.
//             </CardDescription>
//           </div>

//           {/* Search Bar */}
//           <div className="relative w-full md:w-80">
//             <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
//             <Input
//               placeholder="Search product, seller..."
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//               className="pl-9"
//             />
//             {isSearching && (
//               <div className="absolute right-3 top-2.5">
//                 <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
//               </div>
//             )}
//           </div>
//         </div>
//       </CardHeader>

//       <CardContent>
//         <div className="rounded-md border overflow-x-auto">
//           <Table className="min-w-[800px]">
//             <TableHeader>
//               <TableRow>
//                 <TableHead>Product Name</TableHead>
//                 <TableHead>Seller</TableHead>
//                 <TableHead>Price</TableHead>
//                 <TableHead>Stock</TableHead>
//                 <TableHead>Status</TableHead>
//                 <TableHead>Date</TableHead>
//                 <TableHead className="text-right">Actions</TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {products.length === 0 ? (
//                 <TableRow>
//                   <TableCell
//                     colSpan={7}
//                     className="text-center py-10 text-muted-foreground"
//                   >
//                     No products found.
//                   </TableCell>
//                 </TableRow>
//               ) : (
//                 products.map((product) => (
//                   <TableRow key={product.id}>
//                     <TableCell
//                       className="font-medium max-w-[250px] truncate"
//                       title={product.name}
//                     >
//                       {product.name}
//                     </TableCell>
//                     <TableCell>@{product.seller?.username || "---"}</TableCell>
//                     <TableCell>{formatCurrency(product.price)}</TableCell>
//                     <TableCell>{product.quantity}</TableCell>
//                     <TableCell>
//                       <Badge
//                         variant={
//                           product.status === "available"
//                             ? "default"
//                             : product.status === "auction"
//                             ? "destructive"
//                             : "secondary"
//                         }
//                         className="capitalize"
//                       >
//                         {product.status}
//                       </Badge>
//                     </TableCell>
//                     <TableCell>
//                       {new Date(product.created_at).toLocaleDateString("en-GB")}
//                     </TableCell>
//                     <TableCell className="text-right">
//                       <ProductActions
//                         product={product}
//                         onActionSuccess={() => fetchProducts(search, false)}
//                       />
//                     </TableCell>
//                   </TableRow>
//                 ))
//               )}
//             </TableBody>
//           </Table>
//         </div>
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
  CardFooter,
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
import { Button } from "@/components/ui/button"; // [NEW] Import Button
import {
  Loader2,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"; // [NEW] Icons
import { Input } from "@/components/ui/input";
import { ProductActions } from "@/components/admin/ProductActions";

interface ProductRow {
  id: string;
  name: string;
  price: number;
  quantity: number;
  status: "available" | "sold" | "auction" | "hidden";
  created_at: string;
  seller: {
    username: string | null;
  } | null;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // [NEW] Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchProducts = useCallback(async (searchTerm = "", page = 1) => {
    // Don't set full loading on pagination change, just searching state or similar if needed
    if (page === 1 && !searchTerm) setLoading(true);
    else setIsSearching(true);

    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      params.append("page", page.toString());
      params.append("limit", "10"); // Keep limit 10 per page

      const response = await fetch(`/api/admin/products?${params.toString()}`);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load products");
      }

      const data = await response.json();
      setProducts(data.products || []);
      setTotalPages(data.totalPages || 1);
      setCurrentPage(data.currentPage || 1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  }, []);

  // 1. Initial Load
  useEffect(() => {
    fetchProducts("", 1);
  }, [fetchProducts]);

  // 2. Debounce Search
  useEffect(() => {
    const timeout = setTimeout(() => {
      // Reset to page 1 when searching
      fetchProducts(search, 1);
    }, 500);
    return () => clearTimeout(timeout);
  }, [search, fetchProducts]);

  // [NEW] Handle Page Change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      fetchProducts(search, newPage);
    }
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
      <div className="flex justify-center items-center py-20 bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive">
        <AlertCircle className="h-6 w-6 mr-2" />
        <span>Error: {error}</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <CardTitle>Product Management</CardTitle>
            <CardDescription>
              Manage inventory and product status across the system.
            </CardDescription>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search product, seller..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            {isSearching && (
              <div className="absolute right-3 top-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-10 text-muted-foreground"
                  >
                    No products found.
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
                      <Badge
                        variant={
                          product.status === "available"
                            ? "default"
                            : product.status === "auction"
                            ? "destructive"
                            : "secondary"
                        }
                        className="capitalize"
                      >
                        {product.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(product.created_at).toLocaleDateString("en-GB")}
                    </TableCell>
                    <TableCell className="text-right">
                      <ProductActions
                        product={product}
                        onActionSuccess={() =>
                          fetchProducts(search, currentPage)
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* [NEW] Pagination Footer */}
      <CardFooter className="flex items-center justify-between py-4">
        <div className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isSearching}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || isSearching}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
