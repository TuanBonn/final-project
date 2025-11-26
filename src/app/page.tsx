// src/app/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, AlertCircle, Search } from "lucide-react"; // <-- Import icon Search
import { FilterSidebar } from "@/components/FilterSidebar";
import { ProductCard, ProductWithDetails } from "@/components/ProductCard";
import { Pagination } from "@/components/Pagination";
import { Input } from "@/components/ui/input"; // <-- Import Input

export default function HomePage() {
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State cho Phân trang
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // State cho Bộ lọc & Tìm kiếm
  const [search, setSearch] = useState(""); // <-- State tìm kiếm
  const [sort, setSort] = useState("created_at_desc");
  const [filterVerified, setFilterVerified] = useState(false);
  const [filterConditions, setFilterConditions] = useState<string[]>([]);
  const [filterBrands, setFilterBrands] = useState<string[]>([]);

  // Khi thay đổi bộ lọc -> Reset về trang 1
  const handleFilterChange = useCallback(() => {
    setPage(1);
  }, []);

  // Hàm fetch dữ liệu (dùng useCallback để tránh tạo lại hàm liên tục)
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("limit", "15");
    params.append("sort", sort);
    if (search) params.append("search", search); // <-- Gửi search lên API

    if (filterVerified) params.append("verified", "true");
    filterConditions.forEach((cond) => params.append("condition", cond));
    filterBrands.forEach((brandId) => params.append("brand_id", brandId));

    try {
      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Lỗi tải sản phẩm");
      }
      const data = await res.json();

      setProducts(data.products || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err: any) {
      setError(err.message || "Không thể tải sản phẩm.");
    } finally {
      setLoading(false);
    }
  }, [page, sort, filterVerified, filterConditions, filterBrands, search]);

  // Debounce: Đợi 500ms sau khi ngừng gõ mới gọi API
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchProducts();
    }, 500);

    // Scroll lên đầu trang khi đổi trang
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    return () => clearTimeout(timeout);
  }, [fetchProducts]);

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <FilterSidebar
        sort={sort}
        setSort={(val) => {
          setSort(val);
          handleFilterChange();
        }}
        filterVerified={filterVerified}
        setFilterVerified={(val) => {
          setFilterVerified(val);
          handleFilterChange();
        }}
        filterConditions={filterConditions}
        setFilterConditions={(val) => {
          setFilterConditions(val);
          handleFilterChange();
        }}
        filterBrands={filterBrands}
        setFilterBrands={(val) => {
          setFilterBrands(val);
          handleFilterChange();
        }}
      />

      <main className="flex-1">
        {/* === THANH TÌM KIẾM === */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm sản phẩm..."
            className="pl-10 h-12 text-base bg-background shadow-sm"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1); // Reset về trang 1 khi tìm kiếm
            }}
          />
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex justify-center items-center py-20 bg-destructive/10 border border-destructive/30 rounded-lg p-4">
            <AlertCircle className="h-8 w-8 text-destructive mr-3" />
            <p className="text-destructive font-medium">Lỗi: {error}</p>
          </div>
        ) : (
          <>
            {products.length === 0 ? (
              <p className="text-center text-muted-foreground py-20">
                Không tìm thấy sản phẩm nào khớp với bộ lọc.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* COMPONENT PHÂN TRANG */}
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  loading={loading}
                />
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
