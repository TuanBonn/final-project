"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ImageUploadPreview } from "@/components/ImageUploadPreview";
import Link from "next/link";

// Validation Schema
const formSchema = z.object({
  name: z.string().min(5, "Product name must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  brand_id: z.string().min(1, "Please select a brand"),
  condition: z.enum(["new", "used", "like_new", "custom"]),
  startingBid: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Starting bid must be a positive number",
    }),
  endTime: z.date().refine((date) => date > new Date(), {
    message: "End time must be in the future",
  }),
  images: z.array(z.string()).min(1, "Please upload at least 1 image"),
});

export default function CreateAuctionPage() {
  const router = useRouter();
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      brand_id: "",
      condition: "new",
      startingBid: "",
      images: [],
    },
  });

  useEffect(() => {
    // Fetch brands
    const fetchBrands = async () => {
      try {
        const res = await fetch("/api/admin/brands");
        if (res.ok) {
          const data = await res.json();
          setBrands(data.brands || []);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchBrands();
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          imageUrls: values.images,
          endTime: values.endTime.toISOString(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create auction");
      }

      alert("Auction started successfully!");
      router.push("/auctions");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to convert File to Base64 string
  const convertFilesToBase64 = async (files: File[]): Promise<string[]> => {
    const promises = files.map((file) => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });
    });
    return Promise.all(promises);
  };

  return (
    <div className="container mx-auto py-10 max-w-3xl px-4">
      <Button variant="ghost" asChild className="mb-6">
        <Link href="/auctions">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Auctions
        </Link>
      </Button>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Create New Auction</h1>
          <p className="text-muted-foreground">
            Start a new auction immediately. Fill in the product details below.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Images Field - FIXED for compatibility */}
            <FormField
              control={form.control}
              name="images"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Images</FormLabel>
                  <FormControl>
                    {/* Sử dụng đúng tên prop 'onFilesChange' và xử lý chuyển đổi File -> Base64 */}
                    <ImageUploadPreview
                      // Nếu component cũ của bạn hỗ trợ 'value' để hiển thị ảnh đã chọn, hãy giữ lại.
                      // Nếu không, có thể bỏ dòng value={...} để tránh lỗi type.
                      // value={field.value}

                      // Quan trọng: Mapping đúng tên prop
                      onFilesChange={async (files: any[]) => {
                        // Kiểm tra nếu files là mảng File object thì convert
                        if (files.length > 0 && files[0] instanceof File) {
                          const base64Images = await convertFilesToBase64(
                            files
                          );
                          field.onChange(base64Images);
                        } else {
                          // Trường hợp component trả về mảng rỗng hoặc định dạng khác
                          field.onChange(files);
                        }
                      }}
                      maxFiles={5}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Hotwheels RLC 2024" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Brand */}
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

              {/* Condition */}
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
                        <SelectItem value="new">New (Sealed)</SelectItem>
                        <SelectItem value="like_new">Like New</SelectItem>
                        <SelectItem value="used">Used</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Starting Bid */}
              <FormField
                control={form.control}
                name="startingBid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Starting Bid (VND)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="50000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* End Time */}
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Time</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP HH:mm")
                            ) : (
                              <span>Pick a date & time</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <div className="p-4 bg-background border rounded-md">
                          <Input
                            type="datetime-local"
                            onChange={(e) =>
                              field.onChange(new Date(e.target.value))
                            }
                            min={new Date().toISOString().slice(0, 16)}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      The auction will start immediately and end at this time.
                    </FormDescription>
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your item details..."
                      className="resize-none min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start Auction Now
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
