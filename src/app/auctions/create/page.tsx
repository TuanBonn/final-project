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
  name: z.string().min(5, "Product name must be at least 5 characters"),
  description: z.string().optional(),
  brand_id: z.string({ required_error: "Please select a brand" }),
  condition: z.enum(["new", "used", "like_new", "custom"], {
    required_error: "Please select a condition",
  }),
  startingBid: z.string().min(1, "Enter starting bid"),
  startTime: z.string().refine((val) => val !== "", "Select start time"),
  endTime: z.string().refine((val) => val !== "", "Select end time"),
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
        throw new Error("Please select at least 1 product image.");

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
      if (!res.ok) throw new Error(data.error || "Failed to create auction.");

      alert("Auction created successfully!");
      router.push("/auctions");
    } catch (error: any) {
      setServerError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return <div className="text-center py-20">Please log in.</div>;

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Gavel className="h-6 w-6 text-primary" /> Create Auction Listing
          </CardTitle>
          <CardDescription>
            List your rare or custom die-cast cars on the auction marketplace.
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
                    <FormLabel>Product name *</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g. R34 Z-Tune Custom" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* COMPONENT CHỌN ẢNH */}
              <FormItem>
                <FormLabel>Product images *</FormLabel>
                <FormControl>
                  <ImageUploadPreview
                    onFilesChange={setSelectedFiles}
                    maxFiles={5}
                  />
                </FormControl>
                <FormDescription>
                  Choose up to 5 images. The first one will be used as the
                  cover.
                </FormDescription>
              </FormItem>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="brand_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select brand" />
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
                      <FormLabel>Condition</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="like_new">Like new</SelectItem>
                          <SelectItem value="used">Used</SelectItem>
                          <SelectItem value="custom">
                            Custom (modified)
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
                    <FormLabel>Detailed description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the condition and details..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="border-t pt-4 space-y-4">
                <h3 className="font-semibold">Auction settings</h3>
                <FormField
                  control={form.control}
                  name="startingBid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Starting bid (VND) *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="E.g. 50,000"
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
                        <FormLabel>Start time</FormLabel>
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
                        <FormLabel>End time</FormLabel>
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
                {isSubmitting ? "Creating..." : "Create auction now"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
