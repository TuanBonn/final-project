// src/app/admin/products/[id]/edit/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

// Định nghĩa Brand (lấy từ API /api/admin/brands)
interface Brand {
  id: string;
  name: string;
}

// Định nghĩa Product (lấy từ API /api/admin/products/[id])
interface ProductData {
  id: string;
  name: string;
  description: string | null;
  price: number;
  condition: "new" | "used" | "like_new" | "custom" | null;
  brand_id: string | null;
}

// Định nghĩa Zod Schema (giống /sell nhưng BỎ image)
const productSchema = z.object({
  name: z.string().min(5, { message: "Tên phải ít nhất 5 ký tự." }),
  description: z.string().optional(),
  price: z.coerce
    .number()
    .min(1000, { message: "Giá phải ít nhất 1,000 VND." }),
  condition: z.enum(["new", "used", "like_new", "custom"], {
    required_error: "Vui lòng chọn tình trạng.",
  }),
  brand_id: z.string({ required_error: "Vui lòng chọn hãng xe." }),
});
type ProductFormValues = z.infer<typeof productSchema>;

export default function AdminEditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [brands, setBrands] = useState<Brand[]>([]);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Khởi tạo form
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
    },
  });

  // Load data (Product và Brands)
  useEffect(() => {
    if (!productId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Lấy danh sách Brand (cho dropdown)
        const brandsRes = await fetch("/api/admin/brands"); // Dùng API ta tạo ở bước trước
        if (!brandsRes.ok) throw new Error("Không thể tải danh sách brands.");
        const brandsData = await brandsRes.json();
        setBrands(brandsData.brands || []);

        // 2. Lấy chi tiết Product (cho form)
        const productRes = await fetch(`/api/admin/products/${productId}`);
        if (!productRes.ok) throw new Error("Không thể tải chi tiết sản phẩm.");
        const productData = await productRes.json();

        // 3. Set data vào state và form
        setProduct(productData.product);
        form.reset({
          name: productData.product.name,
          description: productData.product.description || "",
          price: productData.product.price,
          condition: productData.product.condition,
          brand_id: productData.product.brand_id,
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Lỗi không xác định.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [productId, form]);

  // Xử lý khi nhấn nút Lưu
  const onSubmit = async (values: ProductFormValues) => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values), // Gửi toàn bộ form data
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Cập nhật thất bại.");

      alert("Cập nhật thành công!");
      router.push("/admin/products"); // Quay về trang danh sách
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
    } finally {
      setIsSaving(false);
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
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-8 w-8 text-destructive mb-3" />
        <p className="text-destructive font-medium mb-4">Lỗi: {error}</p>
        <Button variant="outline" asChild>
          <Link href="/admin/products">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Button variant="outline" size="sm" asChild className="mb-4">
        <Link href="/admin/products">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại danh sách
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Sửa chi tiết sản phẩm</CardTitle>
          <CardDescription>ID: {product?.id}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Tên Sản phẩm */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên sản phẩm *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Giá bán */}
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Giá bán (VND) *</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hãng xe (ĐÃ SỬA THÀNH DROPDOWN) */}
              <FormField
                control={form.control}
                name="brand_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hãng xe *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value} // Dùng defaultValue
                      value={field.value} // Và value (để sync)
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn hãng xe..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-60">
                        {brands.length === 0 ? (
                          <SelectItem value="loading" disabled>
                            Đang tải brand...
                          </SelectItem>
                        ) : (
                          brands.map((brand) => (
                            <SelectItem key={brand.id} value={brand.id}>
                              {brand.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tình trạng */}
              <FormField
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tình trạng *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn tình trạng..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="new">Mới (New)</SelectItem>
                        <SelectItem value="like_new">
                          Như mới (Like New)
                        </SelectItem>
                        <SelectItem value="used">Đã sử dụng (Used)</SelectItem>
                        <SelectItem value="custom">Hàng độ (Custom)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Mô tả */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mô tả</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Mô tả chi tiết..."
                        {...field}
                        // Đảm bảo giá trị null/undefined được xử lý
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Lỗi Server (nếu có) */}
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <p>{error}</p>
                </div>
              )}

              <Button type="submit" disabled={isSaving} className="w-full">
                {isSaving ? (
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                ) : null}
                {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
