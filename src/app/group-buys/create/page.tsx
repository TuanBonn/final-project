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
  return new Intl.NumberFormat("en-US").format(parseInt(numericValue, 10));
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
      alert("Please log in first.");
      router.push("/login");
      return;
    }

    if (selectedFiles.length === 0) {
      setServerError("Please select at least 1 image.");
      return;
    }

    setLoading(true);

    try {
      const uploadPromises = selectedFiles.map((file) =>
        uploadFileViaApi("products", file)
      );
      const imageUrls = await Promise.all(uploadPromises);

      const res = await fetch("/api/group-buys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: formData.productName,
          description: formData.productDescription,
          price: formData.pricePerUnit,
          targetQuantity: formData.targetQuantity,
          imageUrls: imageUrls,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create group buy.");

      alert("Group buy created successfully!");
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
            <Users className="h-6 w-6 text-orange-600" /> Create Group Buy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Product name */}
            <div className="space-y-2">
              <Label>Product name *</Label>
              <Input
                required
                value={formData.productName}
                onChange={(e) =>
                  setFormData({ ...formData, productName: e.target.value })
                }
                placeholder="Example: Set of 5 Tomica Limited cars..."
              />
            </div>

            {/* Images */}
            <div className="space-y-2">
              <Label>Images *</Label>
              <ImageUploadPreview
                onFilesChange={setSelectedFiles}
                maxFiles={5}
              />
            </div>

            {/* Price & Quantity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price per slot (VND) *</Label>
                <Input
                  required
                  value={formData.pricePerUnit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pricePerUnit: formatCurrencyForInput(e.target.value),
                    })
                  }
                  placeholder="100,000"
                />
              </div>
              <div className="space-y-2">
                <Label>Target quantity *</Label>
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

            {/* Description */}
            <div className="space-y-2">
              <Label>Detailed description & terms *</Label>
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
                placeholder="Describe the product, deposit rules, host commitments..."
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
              Create Group Buy
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
