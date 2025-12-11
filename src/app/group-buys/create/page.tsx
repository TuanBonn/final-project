"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUser } from "@/contexts/UserContext";
import { uploadFileViaApi } from "@/lib/storageUtils";
import { ImageUploadPreview } from "@/components/ImageUploadPreview";
import { Loader2, Users } from "lucide-react";

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
  FormDescription,
} from "@/components/ui/form";

const groupBuySchema = z.object({
  productName: z
    .string()
    .trim()
    .min(5, { message: "Product name must be at least 5 characters." })
    .max(150, { message: "Product name is too long (max 150 characters)." }),

  description: z
    .string()
    .trim()
    .min(20, { message: "Description must be at least 20 characters." })
    .max(5000, { message: "Description is too long (max 5000 characters)." }),

  pricePerUnit: z
    .string()
    .min(1, { message: "Please enter price." })
    .refine(
      (val) => {
        const numericVal = parseInt(val.replace(/\D/g, ""), 10);
        return !isNaN(numericVal) && numericVal >= 1000;
      },
      { message: "Price must be at least 1,000 VND." }
    ),

  targetQuantity: z
    .string()
    .min(1, { message: "Please enter target quantity." })
    .refine(
      (val) => {
        const num = parseInt(val, 10);
        return !isNaN(num) && num >= 2;
      },
      { message: "Target quantity must be at least 2." }
    )
    .refine(
      (val) => {
        const num = parseInt(val, 10);
        return num <= 1000;
      },
      { message: "Quantity seems too high for a group buy (max 1000)." }
    ),
});

type GroupBuyFormValues = z.infer<typeof groupBuySchema>;

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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const form = useForm<GroupBuyFormValues>({
    resolver: zodResolver(groupBuySchema),
    defaultValues: {
      productName: "",
      description: "",
      pricePerUnit: "",
      targetQuantity: "",
    },
  });

  const onSubmit = async (values: GroupBuyFormValues) => {
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
          productName: values.productName,
          description: values.description,
          price: values.pricePerUnit,
          targetQuantity: values.targetQuantity,
          imageUrls: imageUrls,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create group buy.");

      alert("Group buy created successfully!");
      router.push("/group-buys");
    } catch (error: any) {
      setServerError(error.message || "Something went wrong.");
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
          <CardDescription>
            Start a new group buy campaign for the community.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Product Name */}
              <FormField
                control={form.control}
                name="productName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Example: Set of 5 Tomica Limited cars..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Images (Manual Handling) */}
              <div className="space-y-2">
                <FormLabel
                  className={
                    serverError && selectedFiles.length === 0
                      ? "text-red-500"
                      : ""
                  }
                >
                  Images *
                </FormLabel>
                <ImageUploadPreview
                  onFilesChange={setSelectedFiles}
                  maxFiles={5}
                />
                <FormDescription>
                  Upload up to 5 images clearly showing the product.
                </FormDescription>
              </div>

              {/* Price & Quantity Grid */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pricePerUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per slot (VND) *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="100,000"
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
                      <FormLabel>Target quantity *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="2"
                          placeholder="10"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Detailed description & terms *</FormLabel>
                    <FormControl>
                      <Textarea
                        className="h-32"
                        placeholder="Describe the product, deposit rules, host commitments..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Server Error Display */}
              {serverError && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200">
                  <p className="text-red-600 text-sm font-medium">
                    {serverError}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full py-6 text-lg bg-orange-600 hover:bg-orange-700"
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                Create Group Buy
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
