// src/app/sell/[id]/edit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft, Save, Trash2, X } from "lucide-react";
import { uploadFileViaApi } from "@/lib/storageUtils";
import { ImageUploadPreview } from "@/components/ImageUploadPreview";

export default function EditProductPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    quantity: "",
    condition: "new",
    status: "available",
    brand_id: "",
  });

  // Ảnh: Kết hợp ảnh cũ (URL string) và ảnh mới (File)
  const [currentImageUrls, setCurrentImageUrls] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  // 1. Fetch dữ liệu cũ
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/products/${id}`);
        if (!res.ok)
          throw new Error("Không thể tải sản phẩm hoặc bạn không có quyền.");
        const data = await res.json();
        const p = data.product;

        setFormData({
          name: p.name,
          description: p.description || "",
          price: p.price.toString(),
          quantity: p.quantity.toString(),
          condition: p.condition,
          status: p.status,
          brand_id: p.brand_id || "",
        });

        setCurrentImageUrls(p.image_urls || []);
      } catch (error) {
        alert("Lỗi tải dữ liệu sản phẩm.");
        router.push("/my-products"); // Quay về kho nếu lỗi
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, router]);

  // 2. Xử lý Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // A. Upload ảnh mới (nếu có)
      const uploadedUrls = [];
      for (const file of newFiles) {
        const url = await uploadFileViaApi("products", file);
        if (url) uploadedUrls.push(url);
      }

      // B. Gộp ảnh cũ (chưa bị xóa) + ảnh mới
      const finalImageUrls = [...currentImageUrls, ...uploadedUrls];

      // C. Gọi API Update
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: formData.price,
          quantity: formData.quantity,
          condition: formData.condition,
          status: formData.status,
          imageUrls: finalImageUrls,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      alert("Cập nhật thành công!");
      // === SỬA ĐỔI: Quay về trang Kho hàng của tôi ===
      router.push("/my-products");
      // ==============================================
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  // 3. Xóa sản phẩm
  const handleDelete = async () => {
    if (
      !confirm(
        "Bạn có chắc chắn muốn xóa sản phẩm này? Hành động này không thể hoàn tác."
      )
    )
      return;

    setSaving(true);
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert(data.message);
      // === SỬA ĐỔI: Quay về trang Kho hàng của tôi ===
      router.push("/my-products");
      // ==============================================
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin h-10 w-10" />
      </div>
    );

  return (
    <div className="container mx-auto py-8 max-w-3xl px-4">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Chỉnh sửa sản phẩm</CardTitle>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={saving}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Xóa sản phẩm
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tên */}
            <div className="space-y-2">
              <Label>Tên sản phẩm</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            {/* Ảnh */}
            <div className="space-y-2">
              <Label>Hình ảnh</Label>
              <p className="text-xs text-muted-foreground">
                Bạn có thể xóa ảnh cũ và thêm ảnh mới.
              </p>

              {/* Component Preview cho ảnh cũ */}
              <div className="flex flex-wrap gap-4 mb-4">
                {currentImageUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative w-24 h-24 border rounded overflow-hidden group"
                  >
                    <img
                      src={url}
                      alt="Old"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      className="absolute top-0 right-0 bg-red-600 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() =>
                        setCurrentImageUrls((prev) =>
                          prev.filter((_, i) => i !== idx)
                        )
                      }
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Component Upload cho ảnh mới */}
              <ImageUploadPreview onFilesChange={setNewFiles} maxFiles={5} />
            </div>

            {/* Giá & Kho */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Giá (VNĐ)</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Số lượng kho</Label>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            {/* Tình trạng & Trạng thái */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tình trạng</Label>
                <Select
                  value={formData.condition}
                  onValueChange={(val) =>
                    setFormData({ ...formData, condition: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Mới 100%</SelectItem>
                    <SelectItem value="like_new">Như mới (Like New)</SelectItem>
                    <SelectItem value="used">Đã qua sử dụng</SelectItem>
                    <SelectItem value="custom">Hàng Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Trạng thái hiển thị</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) =>
                    setFormData({ ...formData, status: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Đang bán</SelectItem>
                    <SelectItem value="sold">Tạm ẩn / Đã bán</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Mô tả */}
            <div className="space-y-2">
              <Label>Mô tả chi tiết</Label>
              <Textarea
                className="h-32"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu thay đổi
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
