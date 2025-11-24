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
import { cn } from "@/lib/utils";
import { ImageUploadPreview } from "@/components/ImageUploadPreview"; // <-- DÙNG COMPONENT MỚI

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
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, ArrowLeft, Trash2 } from "lucide-react";

// === HÀM FORMAT TIỀN ===
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

// Zod Schema
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

  // --- STATE QUẢN LÝ ẢNH ---
  const [existingImages, setExistingImages] = useState<string[]>([]); // Ảnh cũ (URL)
  const [newFiles, setNewFiles] = useState<File[]>([]); // Ảnh mới (File)

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "0",
    },
  });

  // Load data
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

        // 3. Set data vào form
        form.reset({
          name: p.name,
          description: p.description || "",
          price: p.price.toString(),
          condition: p.condition,
          brand_id: p.brand_id,
        });

        // 4. Set ảnh cũ
        setExistingImages(p.image_urls || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Lỗi không xác định.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [productId, form]);

  // --- Xóa ảnh CŨ khỏi danh sách (chỉ xóa state, chưa xóa DB ngay) ---
  const handleRemoveExistingImage = (urlToRemove: string) => {
    if (!confirm("Xóa ảnh này? (Sẽ áp dụng khi bấm Lưu)")) return;
    setExistingImages((prev) => prev.filter((url) => url !== urlToRemove));
  };

  // --- XỬ LÝ LƯU ---
  const onSubmit = async (values: ProductFormValues) => {
    setIsSaving(true);
    setError(null);
    try {
      let finalImageUrls = [...existingImages];

      // 1. Upload ảnh MỚI (nếu có)
      if (newFiles.length > 0) {
        const uploadPromises = newFiles.map((file) =>
          uploadFileViaApi("products", file)
        );
        const uploadedUrls = await Promise.all(uploadPromises);
        // Gộp ảnh cũ + ảnh mới vừa upload
        finalImageUrls = [...finalImageUrls, ...uploadedUrls];
      }

      // 2. Cập nhật DB
      const payload = {
        ...values,
        price: values.price.replace(/\D/g, ""), // Gửi số thô
        image_urls: finalImageUrls, // Gửi danh sách ảnh đã gộp
      };

      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Cập nhật thất bại.");

      alert("Cập nhật thành công!");
      router.push("/admin/products"); // Quay về danh sách
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- RENDER ---
  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !product) {
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

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Card Thông tin cơ bản */}
          <Card>
            <CardHeader>
              <CardTitle>Sửa thông tin sản phẩm</CardTitle>
              <CardDescription>ID: {product?.id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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

          {/* === CARD QUẢN LÝ ẢNH === */}
          <Card>
            <CardHeader>
              <CardTitle>Quản lý Hình ảnh</CardTitle>
              <CardDescription>
                Sắp xếp hoặc xóa ảnh cũ, và tải thêm ảnh mới.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 1. Ảnh HIỆN CÓ */}
              {existingImages.length > 0 && (
                <div>
                  <Label className="mb-3 block">
                    Ảnh hiện có ({existingImages.length})
                  </Label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                    {existingImages.map((url, index) => (
                      <div key={url} className="relative aspect-square group">
                        <Image
                          src={url}
                          alt={`Ảnh cũ ${index + 1}`}
                          fill
                          sizes="(max-width: 640px) 33vw, 20vw"
                          className="object-cover rounded-md border"
                        />
                        {/* Nút xóa ảnh cũ */}
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveExistingImage(url)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        {index === 0 && (
                          <Badge className="absolute bottom-1 left-1 bg-black/70 text-[10px] h-5">
                            Ảnh bìa cũ
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Chọn ảnh MỚI (Dùng Component) */}
              <div>
                <Label className="mb-3 block">Tải thêm ảnh mới</Label>
                {/* Truyền state setter xuống để lấy file */}
                <ImageUploadPreview onFilesChange={setNewFiles} />
              </div>
            </CardContent>
          </Card>

          {/* Lỗi Server */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <p>{error}</p>
            </div>
          )}

          {/* Nút Lưu */}
          <Button
            type="submit"
            disabled={isSaving}
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
