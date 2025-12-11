"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { Loader2, Save, ArrowLeft, X, Undo2 } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const formatCurrencyForInput = (value: string | number): string => {
  if (typeof value === "number") value = value.toString();
  const numericValue = value.replace(/\D/g, "");
  if (numericValue === "") return "";
  return new Intl.NumberFormat("vi-VN").format(parseInt(numericValue, 10));
};

const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(5, { message: "Name must be at least 5 characters." })
    .max(150, { message: "Name is too long (max 150 characters)." }),
  // .regex(/^[a-zA-Z0-9_]+$/, "No special characters"),

  description: z
    .string()
    .trim()
    .max(3000, { message: "Description is too long (max 3000 characters)." })
    .optional(),

  price: z
    .string()
    .min(1, { message: "Please enter price." })
    .refine(
      (val) => {
        const numericVal = parseInt(val.replace(/\D/g, ""), 10);
        return !isNaN(numericVal) && numericVal >= 1000;
      },
      { message: "Price must be at least 1,000 VND." }
    )
    .refine(
      (val) => {
        const numericVal = parseInt(val.replace(/\D/g, ""), 10);
        return numericVal <= 10000000000;
      },
      { message: "Price is too high." }
    ),

  brand_id: z.string().min(1, "Please select a brand."),

  condition: z.enum(["new", "used", "like_new", "custom"], {
    required_error: "Please select condition.",
  }),

  quantity: z
    .string()
    .min(1, { message: "Enter quantity." })
    .refine(
      (val) => {
        const num = parseInt(val, 10);
        return !isNaN(num) && num >= 1;
      },
      { message: "Quantity must be at least 1." }
    )
    .refine(
      (val) => {
        const num = parseInt(val, 10);
        return num <= 10000;
      },
      { message: "Quantity cannot exceed 10,000 items." }
    ),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useUser();
  const productId = params?.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const [initialImages, setInitialImages] = useState<string[]>([]);
  const [keptOldImages, setKeptOldImages] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "0",
      quantity: "1",
      condition: "new",
      brand_id: "",
    },
  });

  useEffect(() => {
    const initData = async () => {
      try {
        setIsLoading(true);

        const brandRes = await fetch("/api/admin/brands");
        const brandData = await brandRes.json();
        setBrands(brandData.brands || []);

        const productRes = await fetch(`/api/products/${productId}`);
        if (!productRes.ok) throw new Error("Product not found");
        const productData = await productRes.json();
        const product = productData.product;

        form.reset({
          name: product.name,
          description: product.description || "",
          price: formatCurrencyForInput(product.price),
          quantity: product.quantity.toString(),
          brand_id: product.brand_id || "",
          condition: product.condition,
        });

        let images: string[] = [];
        if (Array.isArray(product.image_urls)) {
          images = product.image_urls;
        } else if (typeof product.image_urls === "string") {
          try {
            images = JSON.parse(product.image_urls);
          } catch {}
        }

        setInitialImages(images);
        setKeptOldImages(images);
      } catch (error) {
        console.error("Error fetching data:", error);
        setServerError("Failed to load product data.");
      } finally {
        setIsLoading(false);
      }
    };

    if (user && productId) {
      initData();
    }
  }, [productId, user, form]);

  const onSubmit = async (values: ProductFormValues) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const totalImages = keptOldImages.length + selectedFiles.length;
      if (totalImages === 0) {
        throw new Error("Please have at least 1 image for the product.");
      }
      if (totalImages > 10) {
        throw new Error("Maximum 10 images allowed.");
      }

      for (const file of selectedFiles) {
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`File "${file.name}" is too large (max 5MB).`);
        }
      }

      let newImageUrls: string[] = [];
      if (selectedFiles.length > 0) {
        const uploadPromises = selectedFiles.map((file) =>
          uploadFileViaApi("products", file)
        );
        newImageUrls = await Promise.all(uploadPromises);
      }

      const finalImageUrls = [...keptOldImages, ...newImageUrls];

      const response = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          name: values.name.trim(),
          description: values.description?.trim(),
          price: values.price.replace(/\D/g, ""),
          quantity: parseInt(values.quantity, 10),
          imageUrls: finalImageUrls,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Update failed.");

      alert("Product updated successfully!");
      router.back();
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6">
      <Button
        variant="ghost"
        className="mb-4 pl-0 hover:bg-transparent"
        onClick={() => router.back()}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Edit Product</CardTitle>
          <CardDescription>Update your product details.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Tomica..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Price & Quantity */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (VND) *</FormLabel>
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
                      <FormLabel>Quantity *</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Brand */}
              <FormField
                control={form.control}
                name="brand_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Brand *</FormLabel>
                    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value
                              ? brands.find((b) => b.id === field.value)?.name
                              : "Select brand..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search brand..." />
                          <CommandList>
                            <CommandEmpty>Not found.</CommandEmpty>
                            <CommandGroup>
                              {brands.map((b) => (
                                <CommandItem
                                  value={b.name}
                                  key={b.id}
                                  onSelect={() => {
                                    form.setValue("brand_id", b.id);
                                    setPopoverOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      b.id === field.value
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {b.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Condition */}
              <FormField
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condition *</FormLabel>
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
                        <SelectItem value="like_new">Like New</SelectItem>
                        <SelectItem value="used">Used</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        className="h-32"
                        placeholder="Detailed description..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Images Management */}
              <FormItem>
                <FormLabel>Images *</FormLabel>
                <div className="space-y-4">
                  {/* Current Images List */}
                  {initialImages.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground font-medium">
                        Current Images:
                      </p>
                      <div className="grid grid-cols-4 gap-3">
                        {initialImages.map((url, idx) => {
                          const isKept = keptOldImages.includes(url);
                          return (
                            <div
                              key={idx}
                              className="relative group aspect-square rounded-md overflow-hidden border"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt="Product"
                                className={cn(
                                  "w-full h-full object-cover transition-all",
                                  !isKept && "opacity-30 grayscale blur-[1px]"
                                )}
                              />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                                {isKept ? (
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="h-8 w-8 rounded-full shadow-md"
                                    onClick={() =>
                                      setKeptOldImages((prev) =>
                                        prev.filter((img) => img !== url)
                                      )
                                    }
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    className="h-8 w-8 rounded-full shadow-md"
                                    onClick={() =>
                                      setKeptOldImages((prev) => [...prev, url])
                                    }
                                  >
                                    <Undo2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                              {!isKept && (
                                <div className="absolute inset-x-0 bottom-0 bg-red-600 text-white text-[10px] text-center py-0.5">
                                  Removed
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Add New Images */}
                  <div>
                    <p className="text-sm text-muted-foreground font-medium mb-2">
                      Add New Images:
                    </p>
                    <FormControl>
                      <ImageUploadPreview onFilesChange={setSelectedFiles} />
                    </FormControl>
                  </div>
                </div>
                <FormDescription>
                  Keep or upload at least 1 image. Total max 10 images.
                </FormDescription>
              </FormItem>

              {serverError && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200">
                  <p className="text-red-600 text-sm font-medium">
                    {serverError}
                  </p>
                </div>
              )}

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-4 w-4" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Save Changes
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
