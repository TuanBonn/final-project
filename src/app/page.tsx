// src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { FilterSidebar } from "@/components/FilterSidebar";
import { ProductCard } from "@/components/ProductCard";

// Định nghĩa kiểu dữ liệu (SỬA LẠI BRAND)
interface Seller {
  username: string | null;
  avatar_url: string | null;
  is_verified: boolean;
}
interface Brand {
  // <-- Thêm kiểu Brand
  id: string;
  name: string;
}
interface Product {
  id: string;
  name: string;
  price: number;
  condition: "new" | "used" | "like_new" | "custom" | null;
  image_urls: string[] | null;
  created_at: string;
  seller: Seller | null;
  brand: Brand | null; // <-- Sửa: 'brand' giờ là một object
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- State cho bộ lọc ---
  const [sort, setSort] = useState("created_at_desc");
  const [filterVerified, setFilterVerified] = useState(false); // <-- Giữ state này
  const [filterConditions, setFilterConditions] = useState<string[]>([]);
  const [filterBrands, setFilterBrands] = useState<string[]>([]);
  // -------------------------

  // useEffect sẽ chạy lại mỗi khi state của filter thay đổi
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      console.log("HomePage: Đang fetch products với filter...");

      // 1. Xây dựng URLSearchParams (ĐÃ SỬA)
      const params = new URLSearchParams();
      params.append("sort", sort);

      // === SỬA LỖI LOGIC VERIFIED ===
      // Chỉ gửi param 'verified' KHI nó được check
      if (filterVerified) {
        params.append("verified", "true");
      }
      // ===========================

      filterConditions.forEach((cond) => params.append("condition", cond));
      filterBrands.forEach((brand) => params.append("brand", brand)); // Gửi TÊN

      try {
        // 2. Gọi API với các filter
        const response = await fetch(`/api/products?${params.toString()}`);
        console.log("HomePage: Fetch status:", response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("HomePage: Fetch failed:", errorData);
          throw new Error(
            errorData.error || `HTTP error! Status: ${response.status}`
          );
        }

        const data = await response.json();
        console.log("HomePage: Products received:", data.products?.length);
        setProducts(data.products || []);
      } catch (err: unknown) {
        console.error("HomePage: Lỗi fetch:", err);
        setError(
          err instanceof Error ? err.message : "Không thể tải sản phẩm."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [sort, filterVerified, filterConditions, filterBrands]); // Phụ thuộc

  // --- Render UI ---
  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* 1. Thanh Filter (Bên trái) */}
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

      {/* 2. Lưới sản phẩm (Bên phải) */}
      <main className="flex-1">
        <h1 className="text-3xl font-bold tracking-tight mb-6">
          Sản phẩm nổi bật
        </h1>

        {/* ... (Giữ nguyên Loading, Error) ... */}
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

        {/* Hiển thị sản phẩm */}
        {!loading && !error && (
          <>
            {products.length === 0 ? (
              <p className="text-center text-muted-foreground py-20">
                Không tìm thấy sản phẩm nào khớp với bộ lọc.
              </p>
            ) : (
              // Lưới 5 cột
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {products.map((product) => (
                  // Truyền product (đã có schema mới)
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
