// src/app/group-buys/create/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, UploadCloud, Users } from "lucide-react";
import { uploadFileViaApi } from "@/lib/storageUtils";
import { ImageUploadPreview } from "@/components/ImageUploadPreview";
import { useUser } from "@/contexts/UserContext";

const formatCurrencyForInput = (value: string | number): string => {
  if (typeof value === "number") value = value.toString();
  const numericValue = value.replace(/\D/g, "");
  if (numericValue === "") return "";
  return new Intl.NumberFormat("vi-VN").format(parseInt(numericValue, 10));
};

export default function CreateGroupBuyPage() {
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    productName: "",
    productDescription: "",
    pricePerUnit: "",
    targetQuantity: "",
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!user) {
      alert("Vui lòng đăng nhập.");
      router.push("/login");
      return;
    }

    if (selectedFiles.length === 0) {
      setServerError("Vui lòng chọn ít nhất 1 ảnh.");
      return;
    }

    setLoading(true);

    try {
      // 1. Upload ảnh
      const uploadPromises = selectedFiles.map((file) =>
        uploadFileViaApi("products", file)
      );
      const imageUrls = await Promise.all(uploadPromises);

      // 2. Gọi API tạo kèo
      const res = await fetch("/api/group-buys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: formData.productName,
          description: formData.productDescription,
          price: formData.pricePerUnit, // API sẽ tự replace non-digit
          targetQuantity: formData.targetQuantity,
          imageUrls: imageUrls,
          // Không gửi deadline nữa
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Tạo kèo thất bại");

      alert("Đã lên kèo thành công!");
      router.push("/group-buys");
    } catch (error: any) {
      setServerError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10 max-w-2xl px-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Users className="h-6 w-6 text-orange-600" /> Tạo Kèo Mua Chung
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tên SP */}
            <div className="space-y-2">
              <Label>Tên sản phẩm *</Label>
              <Input
                required
                value={formData.productName}
                onChange={(e) =>
                  setFormData({ ...formData, productName: e.target.value })
                }
                placeholder="Ví dụ: Set 5 xe Tomica Limited..."
              />
            </div>

            {/* Ảnh SP */}
            <div className="space-y-2">
              <Label>Hình ảnh *</Label>
              <ImageUploadPreview
                onFilesChange={setSelectedFiles}
                maxFiles={5}
              />
            </div>

            {/* Giá & Số lượng */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Giá mỗi suất (VNĐ) *</Label>
                <Input
                  required
                  value={formData.pricePerUnit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pricePerUnit: formatCurrencyForInput(e.target.value),
                    })
                  }
                  placeholder="100.000"
                />
              </div>
              <div className="space-y-2">
                <Label>Số lượng mục tiêu *</Label>
                <Input
                  required
                  type="number"
                  min="1"
                  value={formData.targetQuantity}
                  onChange={(e) =>
                    setFormData({ ...formData, targetQuantity: e.target.value })
                  }
                  placeholder="10"
                />
              </div>
            </div>

            {/* Mô tả */}
            <div className="space-y-2">
              <Label>Mô tả chi tiết & Điều khoản *</Label>
              <Textarea
                required
                className="h-32"
                value={formData.productDescription}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    productDescription: e.target.value,
                  })
                }
                placeholder="Mô tả về sản phẩm, quy định cọc, cam kết của Host..."
              />
            </div>

            {serverError && (
              <p className="text-red-500 text-sm">{serverError}</p>
            )}

            <Button
              type="submit"
              className="w-full py-6 text-lg bg-orange-600 hover:bg-orange-700"
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin mr-2" /> : null}
              Đăng Kèo Ngay
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
