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
import { Loader2 } from "lucide-react";
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
      { message: "Price is too high. Please check again." }
    ),

  brand_id: z
    .string({ required_error: "Please select a brand." })
    .min(1, "Please select a brand."),

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

export default function SellPage() {
  const router = useRouter();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: "", description: "", price: "0", quantity: "1" },
  });

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        setLoadingBrands(true);
        const res = await fetch("/api/admin/brands");
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setBrands(data.brands || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingBrands(false);
      }
    };
    fetchBrands();
  }, []);

  const onSubmit = async (values: ProductFormValues) => {
    setIsSubmitting(true);
    setServerError(null);

    if (!user) {
      setServerError("You need to login.");
      setIsSubmitting(false);
      return;
    }

    try {
      if (selectedFiles.length === 0) {
        throw new Error("Please upload at least 1 image of the product.");
      }
      if (selectedFiles.length > 10) {
        throw new Error("You can only upload a maximum of 10 images.");
      }

      for (const file of selectedFiles) {
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`File "${file.name}" is too large. Max size is 5MB.`);
        }
      }

      const uploadPromises = selectedFiles.map((file) =>
        uploadFileViaApi("products", file)
      );
      const imageUrls = await Promise.all(uploadPromises);

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          name: values.name.trim(),
          description: values.description?.trim(),
          price: values.price.replace(/\D/g, ""),
          quantity: parseInt(values.quantity, 10),
          imageUrls: imageUrls,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Listing failed.");

      alert("Listed successfully!");
      router.push("/");
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>List a Product</CardTitle>
          <CardDescription>Enter item details.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Product Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Tomica Limited Vintage..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Price and Quantity */}
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
                          placeholder="0"
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

              {/* Brand Selection */}
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
                        placeholder="Detailed description about the product state, origin, etc."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Images */}
              <FormItem>
                <FormLabel>Images *</FormLabel>
                <FormControl>
                  <ImageUploadPreview onFilesChange={setSelectedFiles} />
                </FormControl>
                <FormDescription>
                  Upload at least 1 image. Max size 5MB/file.
                </FormDescription>
              </FormItem>

              {/* Server Error Message */}
              {serverError && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200">
                  <p className="text-red-600 text-sm font-medium">
                    {serverError}
                  </p>
                </div>
              )}

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                  <Loader2 className="animate-spin mr-2" />
                ) : (
                  "List Item"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
