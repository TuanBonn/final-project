// src/app/auctions/create/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUser } from "@/contexts/UserContext";
import { uploadFileViaApi } from "@/lib/storageUtils";
import { Brand } from "@prisma/client";
import { ImageUploadPreview } from "@/components/ImageUploadPreview"; // <-- DÙNG COMPONENT MỚI

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Loader2, Gavel, AlertCircle } from "lucide-react";

// Format tiền có dấu chấm
const formatCurrencyForInput = (value: string | number): string => {
  if (typeof value === "number") value = value.toString();
  const numericValue = value.replace(/\D/g, "");
  if (numericValue === "") return "";
  return new Intl.NumberFormat("vi-VN").format(parseInt(numericValue, 10));
};

const auctionSchema = z.object({
  name: z.string().min(5, "Tên sản phẩm ít nhất 5 ký tự"),
  description: z.string().optional(),
  brand_id: z.string({ required_error: "Vui lòng chọn hãng xe" }),
  condition: z.enum(["new", "used", "like_new", "custom"], {
    required_error: "Chọn tình trạng",
  }),
  startingBid: z.string().min(1, "Nhập giá khởi điểm"),
  startTime: z.string().refine((val) => val !== "", "Chọn thời gian bắt đầu"),
  endTime: z.string().refine((val) => val !== "", "Chọn thời gian kết thúc"),
});

type AuctionFormValues = z.infer<typeof auctionSchema>;

export default function CreateAuctionPage() {
  const router = useRouter();
  const { user } = useUser();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // State lưu file từ component
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const form = useForm<AuctionFormValues>({
    resolver: zodResolver(auctionSchema),
    defaultValues: {
      name: "",
      description: "",
      startingBid: "",
      startTime: "",
      endTime: "",
    },
  });

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const res = await fetch("/api/admin/brands");
        const data = await res.json();
        setBrands(data.brands || []);
      } catch (error) {
        console.error(error);
      }
    };
    fetchBrands();
  }, []);

  const onSubmit = async (values: AuctionFormValues) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      // 1. Validate
      if (selectedFiles.length === 0)
        throw new Error("Vui lòng chọn ít nhất 1 ảnh sản phẩm.");

      // 2. Upload song song
      const uploadPromises = selectedFiles.map((file) =>
        uploadFileViaApi("products", file)
      );
      const imageUrls = await Promise.all(uploadPromises);

      // 3. Submit API
      const payload = { ...values, imageUrls };
      const res = await fetch("/api/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Tạo đấu giá thất bại.");

      alert("Đã tạo phiên đấu giá thành công!");
      router.push("/auctions");
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
            <Gavel className="h-6 w-6 text-primary" /> Đăng Sản Phẩm Đấu Giá
          </CardTitle>
          <CardDescription>
            Đăng hàng hiếm, hàng độ của bạn lên sàn đấu giá.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên sản phẩm *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ví dụ: R34 Z-Tune Custom"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* COMPONENT CHỌN ẢNH */}
              <FormItem>
                <FormLabel>Hình ảnh sản phẩm *</FormLabel>
                <FormControl>
                  <ImageUploadPreview
                    onFilesChange={setSelectedFiles}
                    maxFiles={5}
                  />
                </FormControl>
                <FormDescription>
                  Chọn tối đa 5 ảnh. Ảnh đầu tiên sẽ là ảnh đại diện.
                </FormDescription>
              </FormItem>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="brand_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hãng xe</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn hãng" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {brands.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name}
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
                      <FormLabel>Tình trạng</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn tình trạng" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="new">Mới (New)</SelectItem>
                          <SelectItem value="like_new">
                            Như mới (Like New)
                          </SelectItem>
                          <SelectItem value="used">Đã dùng (Used)</SelectItem>
                          <SelectItem value="custom">
                            Độ chế (Custom)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mô tả chi tiết</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Mô tả kỹ về tình trạng..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="border-t pt-4 space-y-4">
                <h3 className="font-semibold">Thiết lập đấu giá</h3>
                <FormField
                  control={form.control}
                  name="startingBid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Giá khởi điểm (VND) *</FormLabel>
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
                          className="font-mono text-lg"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bắt đầu lúc</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kết thúc lúc</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {serverError && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md text-sm">
                  <AlertCircle className="h-4 w-4" /> {serverError}
                </div>
              )}

              <Button
                type="submit"
                className="w-full text-lg py-6"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Gavel className="mr-2 h-5 w-5" />
                )}
                {isSubmitting ? "Đang khởi tạo..." : "Đăng Đấu Giá Ngay"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
