// // src/app/page.tsx
// "use client";

// import { useEffect, useState } from "react";
// import { Loader2, AlertCircle } from "lucide-react";
// import { FilterSidebar } from "@/components/FilterSidebar";
// import { ProductCard } from "@/components/ProductCard";

// interface Seller {
//   username: string | null;
//   avatar_url: string | null;
//   is_verified: boolean;
// }
// interface Brand {
//   id: string;
//   name: string;
// }
// interface Product {
//   id: string;
//   name: string;
//   price: number;
//   condition: "new" | "used" | "like_new" | "custom" | null;
//   image_urls: string[] | null;
//   created_at: string;
//   seller: Seller | null;
//   brand: Brand | null;
// }

// export default function HomePage() {
//   const [products, setProducts] = useState<Product[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   // filter state
//   const [sort, setSort] = useState("created_at_desc");
//   const [filterVerified, setFilterVerified] = useState(false);
//   const [filterConditions, setFilterConditions] = useState<string[]>([]);
//   const [filterBrands, setFilterBrands] = useState<string[]>([]); // brand_id

//   useEffect(() => {
//     const fetchProducts = async () => {
//       setLoading(true);
//       setError(null);

//       const params = new URLSearchParams();
//       params.append("sort", sort);

//       if (filterVerified) {
//         params.append("verified", "true");
//       }

//       filterConditions.forEach((cond) => params.append("condition", cond));
//       filterBrands.forEach((brandId) => params.append("brand_id", brandId));

//       try {
//         const res = await fetch(`/api/products?${params.toString()}`);
//         if (!res.ok) {
//           const errData = await res.json().catch(() => ({}));
//           throw new Error(errData.error || "Không thể tải sản phẩm.");
//         }
//         const data = await res.json();
//         setProducts(data.products || []);
//       } catch (err: any) {
//         setError(err.message || "Không thể tải sản phẩm.");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchProducts();
//   }, [sort, filterVerified, filterConditions, filterBrands]);

//   return (
//     <div className="flex flex-col lg:flex-row gap-8">
//       <FilterSidebar
//         sort={sort}
//         setSort={setSort}
//         filterVerified={filterVerified}
//         setFilterVerified={setFilterVerified}
//         filterConditions={filterConditions}
//         setFilterConditions={setFilterConditions}
//         filterBrands={filterBrands}
//         setFilterBrands={setFilterBrands}
//       />

//       <main className="flex-1">
//         <h1 className="text-3xl font-bold tracking-tight mb-6">
//           Sản phẩm nổi bật
//         </h1>

//         {loading && (
//           <div className="flex justify-center items-center py-20">
//             <Loader2 className="h-10 w-10 animate-spin text-primary" />
//           </div>
//         )}

//         {error && (
//           <div className="flex justify-center items-center py-20 bg-destructive/10 border border-destructive/30 rounded-lg p-4">
//             <AlertCircle className="h-8 w-8 text-destructive mr-3" />
//             <p className="text-destructive font-medium">Lỗi: {error}</p>
//           </div>
//         )}

//         {!loading && !error && (
//           <>
//             {products.length === 0 ? (
//               <p className="text-center text-muted-foreground py-20">
//                 Không tìm thấy sản phẩm nào khớp với bộ lọc.
//               </p>
//             ) : (
//               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
//                 {products.map((product) => (
//                   <ProductCard key={product.id} product={product} />
//                 ))}
//               </div>
//             )}
//           </>
//         )}
//       </main>
//     </div>
//   );
// }

// src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { FilterSidebar } from "@/components/FilterSidebar";
import { ProductCard, ProductWithDetails } from "@/components/ProductCard"; // <-- IMPORT TYPE ĐÃ ĐỊNH NGHĨA

export default function HomePage() {
  // === SỬ DỤNG TYPE CHUẨN ===
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  // ==========================
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filter state
  const [sort, setSort] = useState("created_at_desc");
  const [filterVerified, setFilterVerified] = useState(false);
  const [filterConditions, setFilterConditions] = useState<string[]>([]);
  const [filterBrands, setFilterBrands] = useState<string[]>([]); // brand_id

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append("sort", sort);

      if (filterVerified) {
        params.append("verified", "true");
      }

      filterConditions.forEach((cond) => params.append("condition", cond));
      filterBrands.forEach((brandId) => params.append("brand_id", brandId));

      try {
        const res = await fetch(`/api/products?${params.toString()}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Không thể tải sản phẩm.");
        }
        const data = await res.json();
        setProducts(data.products || []);
      } catch (err: any) {
        setError(err.message || "Không thể tải sản phẩm.");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [sort, filterVerified, filterConditions, filterBrands]);

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <FilterSidebar
        sort={sort}
        setSort={setSort}
        filterVerified={filterVerified}
        setFilterVerified={setFilterVerified}
        filterConditions={filterConditions}
        setFilterConditions={setFilterConditions}
        filterBrands={filterBrands}
        setFilterBrands={setFilterBrands}
      />

      <main className="flex-1">
        <h1 className="text-3xl font-bold tracking-tight mb-6">
          Sản phẩm nổi bật
        </h1>

        {loading && (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="flex justify-center items-center py-20 bg-destructive/10 border border-destructive/30 rounded-lg p-4">
            <AlertCircle className="h-8 w-8 text-destructive mr-3" />
            <p className="text-destructive font-medium">Lỗi: {error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {products.length === 0 ? (
              <p className="text-center text-muted-foreground py-20">
                Không tìm thấy sản phẩm nào khớp với bộ lọc.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
