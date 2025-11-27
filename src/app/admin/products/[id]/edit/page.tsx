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
import { ImageUploadPreview } from "@/components/ImageUploadPreview";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, AlertCircle, ArrowLeft, Trash2 } from "lucide-react";

const formatCurrencyForInput = (value: string | number): string => {
  if (typeof value === "number") value = value.toString();
  const numericValue = value.replace(/\D/g, "");
  if (numericValue === "") return "";
  return new Intl.NumberFormat("vi-VN").format(parseInt(numericValue, 10));
};

// Schema validation
const productSchema = z.object({
  name: z.string().min(5, { message: "Tên phải ít nhất 5 ký tự." }),
  description: z.string().optional(),
  price: z.string().min(1, "Vui lòng nhập giá."),
  quantity: z.string().min(1, "Vui lòng nhập số lượng."),
  condition: z.enum(["new", "used", "like_new", "custom"]),
  status: z.enum(["available", "sold", "auction"]), // <-- Cập nhật Enum
  brand_id: z.string().min(1, "Chọn hãng xe."),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function AdminEditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      quantity: "",
      status: "available",
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Brands
        const brandsRes = await fetch("/api/admin/brands");
        const brandsData = await brandsRes.json();
        setBrands(brandsData.brands || []);

        // Fetch Product
        const prodRes = await fetch(`/api/admin/products/${productId}`);
        if (!prodRes.ok) throw new Error("Lỗi tải sản phẩm");
        const { product } = await prodRes.json();

        form.reset({
          name: product.name,
          description: product.description || "",
          price: product.price.toString(),
          quantity: product.quantity.toString(),
          condition: product.condition,
          brand_id: product.brand_id,
          status: product.status, // Load status hiện tại
        });
        setExistingImages(product.image_urls || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [productId, form]);

  const onSubmit = async (values: ProductFormValues) => {
    setIsSaving(true);
    try {
      // Upload ảnh mới
      const newUrls = await Promise.all(
        newFiles.map((f) => uploadFileViaApi("products", f))
      );
      const finalImages = [...existingImages, ...newUrls];

      const payload = {
        ...values,
        price: values.price.replace(/\D/g, ""),
        quantity: values.quantity.replace(/\D/g, ""),
        image_urls: finalImages,
      };

      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Cập nhật thất bại");

      alert("Cập nhật thành công!");
      router.push("/admin/products");
    } catch (error) {
      alert("Lỗi khi lưu");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div className="max-w-2xl mx-auto">
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Sửa sản phẩm (Admin)</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên sản phẩm</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Giá (VND)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              formatCurrencyForInput(e.target.value)
                            )
                          }
                          value={formatCurrencyForInput(field.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kho</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tình trạng</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="new">Mới</SelectItem>
                          <SelectItem value="like_new">Like New</SelectItem>
                          <SelectItem value="used">Cũ</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* STATUS DROPDOWN MỚI */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trạng thái</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="available">
                            Đang bán (Available)
                          </SelectItem>
                          <SelectItem value="sold">
                            Ẩn / Hết hàng (Sold)
                          </SelectItem>
                          {/* Admin có thể set Auction nếu cần, nhưng thường là tự động */}
                          <SelectItem value="auction">
                            Đang Đấu Giá (Auction)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* ... (Phần Brand, Mô tả và Ảnh giữ nguyên như code cũ) ... */}

              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{" "}
                Lưu thay đổi
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
