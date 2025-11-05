// src/app/admin/products/[id]/edit/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import Link from "next/link";
import { uploadFileViaApi } from "@/lib/storageUtils";
import { cn } from "@/lib/utils"; // <-- SỬA LỖI: THÊM DÒNG NÀY

import { Button, buttonVariants } from "@/components/ui/button"; // <-- SỬA LỖI: THÊM buttonVariants
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
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label"; // <-- SỬA LỖI: THÊM DÒNG NÀY
import { Loader2, AlertCircle, ArrowLeft, Trash2, Upload } from "lucide-react";

// === HÀM FORMAT TIỀN (Thêm dấu chấm) ===
const formatCurrencyForInput = (value: string | number): string => {
  if (typeof value === "number") {
    value = value.toString();
  }
  const numericValue = (value || "").replace(/\D/g, "");
  if (numericValue === "") return "";
  return new Intl.NumberFormat("vi-VN").format(parseInt(numericValue, 10));
};

// Định nghĩa Brand
interface Brand {
  id: string;
  name: string;
}

// Định nghĩa Product (lấy từ API)
interface ProductData {
  id: string;
  name: string;
  description: string | null;
  price: number;
  condition: "new" | "used" | "like_new" | "custom" | null;
  brand_id: string | null;
  image_urls: string[] | null;
}

// Zod Schema (Sửa 'price' từ number -> string để format)
const productSchema = z.object({
  name: z.string().min(5, { message: "Tên phải ít nhất 5 ký tự." }),
  description: z.string().optional(),
  price: z
    .string()
    .min(1, { message: "Vui lòng nhập giá." })
    .refine(
      (value) => {
        const numericValue = parseInt(value.replace(/\D/g, ""), 10);
        return numericValue >= 1000;
      },
      { message: "Giá phải ít nhất 1,000 VND." }
    ),
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

  // --- STATE MỚI CHO ẢNH ---
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "0",
    },
  });

  // Load data (Product và Brands)
  useEffect(() => {
    if (!productId) return;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Lấy Brands
        const brandsRes = await fetch("/api/admin/brands");
        if (!brandsRes.ok) throw new Error("Không thể tải danh sách brands.");
        const brandsData = await brandsRes.json();
        setBrands(brandsData.brands || []);

        // 2. Lấy chi tiết Product
        const productRes = await fetch(`/api/admin/products/${productId}`);
        if (!productRes.ok) throw new Error("Không thể tải chi tiết sản phẩm.");
        const productData = await productRes.json();
        const p: ProductData = productData.product;
        setProduct(p);

        // 3. Set data vào form và state
        form.reset({
          name: p.name,
          description: p.description || "",
          price: p.price.toString(),
          condition: p.condition,
          brand_id: p.brand_id,
        });
        // 4. Set state ảnh
        setImageUrls(p.image_urls || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Lỗi không xác định.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [productId, form]);

  // --- HÀM MỚI: Xử lý upload file ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    setError(null);
    try {
      const uploadPromises = files.map((file) =>
        uploadFileViaApi("products", file)
      );
      const newUrls = await Promise.all(uploadPromises);
      setImageUrls((prev) => [...prev, ...newUrls]); // Thêm ảnh mới vào danh sách
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi upload ảnh.");
    } finally {
      setIsUploading(false);
      e.target.value = ""; // Reset input file
    }
  };

  // --- HÀM MỚI: Xóa ảnh khỏi danh sách (chỉ xóa state) ---
  const handleRemoveImage = (urlToRemove: string) => {
    setImageUrls((prev) => prev.filter((url) => url !== urlToRemove));
  };

  // --- SỬA LẠI: Xử lý khi nhấn nút Lưu ---
  const onSubmit = async (values: ProductFormValues) => {
    setIsSaving(true);
    setError(null);
    try {
      // Chuẩn bị payload
      const payload = {
        ...values,
        price: values.price.replace(/\D/g, ""), // Gửi số thô
        image_urls: imageUrls, // <-- Gửi danh sách ảnh đã cập nhật
      };

      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  // --- Render (Loading, Error) ---
  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !product) {
    // Chỉ hiển thị lỗi toàn trang nếu không load được product
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

  // --- RENDER FORM CHÍNH ---
  return (
    <div className="max-w-2xl mx-auto">
      <Button variant="outline" size="sm" asChild className="mb-4">
        <Link href="/admin/products">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại danh sách
        </Link>
      </Button>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Card Thông tin cơ bản */}
          <Card>
            <CardHeader>
              <CardTitle>Sửa thông tin sản phẩm</CardTitle>
              <CardDescription>ID: {product?.id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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

              {/* Giá bán (SỬA: Thêm format) */}
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Giá bán (VND) *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ví dụ: 250.000"
                        {...field}
                        onChange={(e) => {
                          field.onChange(
                            formatCurrencyForInput(e.target.value)
                          );
                        }}
                        value={formatCurrencyForInput(field.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hãng xe */}
              <FormField
                control={form.control}
                name="brand_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hãng xe *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn hãng xe..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-60">
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.name}
                          </SelectItem>
                        ))}
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
                      value={field.value || ""}
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
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* === CARD MỚI: QUẢN LÝ ẢNH === */}
          <Card>
            <CardHeader>
              <CardTitle>Quản lý Hình ảnh</CardTitle>
              <CardDescription>
                Xem, xóa ảnh cũ hoặc tải lên ảnh mới.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Khu vực hiển thị ảnh */}
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                {imageUrls.map((url, index) => (
                  <div key={url} className="relative aspect-square group">
                    <Image
                      src={url}
                      alt={`Ảnh sản phẩm ${index + 1}`}
                      fill
                      sizes="(max-width: 640px) 33vw, 20vw"
                      className="object-cover rounded-md border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon-sm"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveImage(url)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {index === 0 && (
                      <Badge className="absolute bottom-1 left-1">
                        Ảnh bìa
                      </Badge>
                    )}
                  </div>
                ))}
                {/* Khung loading khi upload */}
                {isUploading && (
                  <div className="relative aspect-square rounded-md border border-dashed flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
              </div>

              {/* Nút Upload (Chỗ này bị lỗi 'Label') */}
              <div>
                <Label
                  htmlFor="file-upload"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "cursor-pointer w-full"
                  )}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Tải thêm ảnh mới
                </Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Lỗi Server (nếu có) */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <p>{error}</p>
            </div>
          )}

          {/* Nút Lưu */}
          <Button
            type="submit"
            disabled={isSaving || isUploading}
            className="w-full"
            size="lg"
          >
            {isSaving ? (
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
            ) : null}
            {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
