"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  ArrowLeft,
  Save,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react";
import { uploadFileViaApi } from "@/lib/storageUtils";
import { ImageUploadPreview } from "@/components/ImageUploadPreview";

export default function EditProductPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    quantity: "",
    condition: "new",
    status: "available",
    brand_id: "",
  });

  const [currentImageUrls, setCurrentImageUrls] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/products/${id}`);
        if (!res.ok) throw new Error("Could not load product.");
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
        alert("Error loading product data.");
        router.push("/my-products");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const uploadedUrls = [];
      for (const file of newFiles) {
        const url = await uploadFileViaApi("products", file);
        if (url) uploadedUrls.push(url);
      }

      const finalImageUrls = [...currentImageUrls, ...uploadedUrls];

      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: formData.price,
          quantity: formData.quantity,
          condition: formData.condition,
          imageUrls: finalImageUrls,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      alert("Update successful!");
      router.push("/my-products");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(data.message);
      router.push("/my-products");
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
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Edit Product</CardTitle>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={saving}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete Product
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Product Name</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Images</Label>
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
              <ImageUploadPreview onFilesChange={setNewFiles} maxFiles={5} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price (VND)</Label>
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
                <Label>Stock Quantity</Label>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Condition</Label>
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
                    <SelectItem value="new">New 100%</SelectItem>
                    <SelectItem value="like_new">Like New</SelectItem>
                    <SelectItem value="used">Used</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Current Status</Label>
                <div className="flex items-center h-10">
                  {formData.status === "hidden" ? (
                    <Badge variant="destructive" className="bg-red-600">
                      Hidden by Admin (Locked)
                    </Badge>
                  ) : formData.status === "sold" || formData.quantity == "0" ? (
                    <Badge variant="secondary">Out of Stock / Hidden</Badge>
                  ) : (
                    <Badge variant="default" className="bg-green-600">
                      Active
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {formData.status === "hidden" && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-md text-sm flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <p>
                  This product is hidden by Admin due to violation. You can edit
                  the content but it will remain hidden until Admin unhides it.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Detailed Description</Label>
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
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
