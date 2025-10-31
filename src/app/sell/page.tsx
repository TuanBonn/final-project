// src/app/sell/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod"; // Thư viện validate
import { zodResolver } from "@hookform/resolvers/zod";
import { useUser } from "@/contexts/UserContext"; // Lấy user ID
import { uploadFileViaApi } from "@/lib/storageUtils"; // Hàm upload "thần thánh"

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
import { Label } from "@/components/ui/label";
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
import { Loader2, AlertCircle } from "lucide-react";

// Định nghĩa Schema (Luật chơi) cho form
const productSchema = z.object({
  name: z.string().min(5, { message: "Tên phải ít nhất 5 ký tự." }),
  description: z.string().optional(),
  price: z.coerce
    .number()
    .min(1000, { message: "Giá phải ít nhất 1,000 VND." }),
  brand: z.string().optional(),
  condition: z.enum(["new", "used", "like_new", "custom"], {
    required_error: "Vui lòng chọn tình trạng.",
  }),
  images: z
    .custom<FileList | null>(
      (files) => files instanceof FileList && files.length > 0,
      "Cần ít nhất 1 ảnh."
    )
    .refine(
      (files) =>
        Array.from(files ?? []).every((file) => file.size <= 5 * 1024 * 1024), // Check 5MB
      `Mỗi ảnh phải nhỏ hơn 5MB.`
    ),
});
type ProductFormValues = z.infer<typeof productSchema>;

export default function SellPage() {
  const router = useRouter();
  const { user } = useUser(); // Lấy user từ Context
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      brand: "",
      images: null,
    },
  });

  // Xử lý khi nhấn nút Đăng
  const onSubmit = async (values: ProductFormValues) => {
    setIsSubmitting(true);
    setServerError(null);
    console.log("Form values:", values);

    if (!user) {
      setServerError("Bạn cần đăng nhập để đăng bán.");
      setIsSubmitting(false);
      return;
    }

    try {
      // --- 1. Upload ảnh lên Storage (dùng API /api/upload) ---
      const imageUrls: string[] = [];
      if (values.images) {
        console.log(`Đang upload ${values.images.length} ảnh...`);
        for (const file of Array.from(values.images)) {
          // Gọi hàm tiện ích, truyền bucket 'products'
          const url = await uploadFileViaApi("products", file);
          imageUrls.push(url);
        }
        console.log("Tất cả ảnh đã upload:", imageUrls);
      }

      // --- 2. Gọi API POST /api/products để lưu vào DB ---
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          description: values.description,
          price: values.price,
          brand: values.brand,
          condition: values.condition,
          imageUrls: imageUrls, // Gửi mảng link ảnh
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Đăng bán thất bại.");

      // --- 3. Thành công! ---
      alert("Đăng bán thành công!");
      // Chuyển hướng đến trang sản phẩm vừa tạo (làm sau)
      // router.push(`/products/${data.product.id}`);
      router.push("/"); // Tạm thời về trang chủ
    } catch (err: unknown) {
      console.error("Lỗi khi đăng bán:", err);
      setServerError(
        err instanceof Error ? err.message : "Lỗi không xác định."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cần để Shadcn Form bind đúng kiểu 'file'
  const fileRef = form.register("images");

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Đăng bán sản phẩm mới</CardTitle>
          <CardDescription>
            Điền thông tin chi tiết món hàng của bạn.
          </CardDescription>
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
                      <Input
                        placeholder="Ví dụ: Tomica Premium Nissan GTR R34"
                        {...field}
                      />
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
                      <Input
                        type="number"
                        placeholder="Ví dụ: 250000"
                        {...field}
                      />
                    </FormControl>
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

              {/* Hãng xe */}
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hãng xe</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ví dụ: Tomica, MiniGT..."
                        {...field}
                      />
                    </FormControl>
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
                        placeholder="Mô tả chi tiết, tình trạng xước, full box..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Upload Ảnh */}
              <FormField
                control={form.control}
                name="images"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hình ảnh *</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        multiple
                        {...fileRef}
                      />
                    </FormControl>
                    <FormDescription>
                      Bạn có thể chọn nhiều ảnh. Ảnh đầu tiên sẽ là ảnh bìa.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Lỗi Server (nếu có) */}
              {serverError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <p>{serverError}</p>
                </div>
              )}

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                ) : null}
                {isSubmitting ? "Đang xử lý..." : "Đăng bán ngay"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
