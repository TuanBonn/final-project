// src/app/group-buys/create/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUser } from "@/contexts/UserContext";
import { uploadFileViaApi } from "@/lib/storageUtils";
import { ImageUploadPreview } from "@/components/ImageUploadPreview"; // Component chọn ảnh

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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, Users, AlertCircle } from "lucide-react";

const formatCurrencyForInput = (value: string | number): string => {
  if (typeof value === "number") value = value.toString();
  const numericValue = value.replace(/\D/g, "");
  if (numericValue === "") return "";
  return new Intl.NumberFormat("vi-VN").format(parseInt(numericValue, 10));
};

const groupBuySchema = z.object({
  productName: z.string().min(5, "Tên sản phẩm ít nhất 5 ký tự"),
  description: z.string().optional(),
  price: z.string().min(1, "Vui lòng nhập giá gom"),
  targetQuantity: z.string().min(1, "Nhập số lượng mục tiêu"),
  deadline: z.string().refine((val) => val !== "", "Chọn hạn chót"),
});

type GroupBuyFormValues = z.infer<typeof groupBuySchema>;

export default function CreateGroupBuyPage() {
  const router = useRouter();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const form = useForm<GroupBuyFormValues>({
    resolver: zodResolver(groupBuySchema),
    defaultValues: {
      productName: "",
      description: "",
      price: "",
      targetQuantity: "",
      deadline: "",
    },
  });

  const onSubmit = async (values: GroupBuyFormValues) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      if (selectedFiles.length === 0)
        throw new Error("Vui lòng chọn ít nhất 1 ảnh sản phẩm.");

      // 1. Upload ảnh
      const uploadPromises = selectedFiles.map((file) =>
        uploadFileViaApi("products", file)
      );
      const imageUrls = await Promise.all(uploadPromises);

      // 2. Gửi API
      const payload = {
        ...values,
        imageUrls,
      };

      const res = await fetch("/api/group-buys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Tạo kèo thất bại.");

      alert("Đã lên kèo thành công!");
      router.push("/group-buys");
    } catch (error: any) {
      setServerError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user)
    return <div className="text-center py-20">Vui lòng đăng nhập.</div>;

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Users className="h-6 w-6 text-orange-600" /> Tạo Kèo Mua Chung
          </CardTitle>
          <CardDescription>
            Gom đơn để mua được giá sỉ tốt nhất.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="productName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên sản phẩm *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ví dụ: Set 5 xe Hotwheels Fast & Furious"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Hình ảnh *</FormLabel>
                <FormControl>
                  <ImageUploadPreview
                    onFilesChange={setSelectedFiles}
                    maxFiles={5}
                  />
                </FormControl>
              </FormItem>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mô tả & Điều khoản</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Mô tả chi tiết sản phẩm, quy định cọc..."
                        {...field}
                        rows={4}
                      />
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
                      <FormLabel>Giá / món (VND) *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ví dụ: 50.000"
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
                  name="targetQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số lượng cần gom *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Ví dụ: 10"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hạn chót tham gia *</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {serverError && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md text-sm">
                  <AlertCircle className="h-4 w-4" /> {serverError}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-orange-600 hover:bg-orange-700 text-lg py-6"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  "Đăng Kèo Ngay"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
