// src/app/sell/page.tsx
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
import { Loader2, AlertCircle } from "lucide-react";
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
  name: z.string().min(5, { message: "Name must be at least 5 characters." }),
  description: z.string().optional(),
  price: z.string().min(1, { message: "Please enter price." }),
  brand_id: z.string({ required_error: "Please select a brand." }),
  condition: z.enum(["new", "used", "like_new", "custom"], {
    required_error: "Please select condition.",
  }),
  quantity: z.string().min(1, { message: "Enter quantity." }),
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
      if (selectedFiles.length === 0)
        throw new Error("Select at least 1 image.");

      const uploadPromises = selectedFiles.map((file) =>
        uploadFileViaApi("products", file)
      );
      const imageUrls = await Promise.all(uploadPromises);

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          price: values.price.replace(/\D/g, ""),
          quantity: values.quantity,
          imageUrls: imageUrls,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Listing failed.");

      alert("Listed successfully!");
      router.push("/");
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Error.");
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

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Detailed description..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Images *</FormLabel>
                <FormControl>
                  <ImageUploadPreview onFilesChange={setSelectedFiles} />
                </FormControl>
                <FormDescription>
                  You can select multiple images.
                </FormDescription>
              </FormItem>

              {serverError && (
                <p className="text-red-600 text-sm">{serverError}</p>
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
