// // src/app/sell/page.tsx
// "use client";

// import { useState, useEffect } from "react"; // <-- Thêm useEffect
// import { useRouter } from "next/navigation";
// import { useForm, Controller } from "react-hook-form"; // <-- Thêm Controller
// import { z } from "zod";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { useUser } from "@/contexts/UserContext";
// import { uploadFileViaApi } from "@/lib/storageUtils";

// import { Button } from "@/components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import {
//   Form,
//   FormControl,
//   FormDescription,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormMessage,
// } from "@/components/ui/form";
// import { Loader2, AlertCircle } from "lucide-react";
// import {
//   Command,
//   CommandEmpty,
//   CommandGroup,
//   CommandInput,
//   CommandItem,
//   CommandList,
// } from "@/components/ui/command";
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from "@/components/ui/popover";
// import { Check, ChevronsUpDown } from "lucide-react";
// import { cn } from "@/lib/utils";

// // Định nghĩa Brand
// interface Brand {
//   id: string;
//   name: string;
// }

// // === HÀM FORMAT TIỀN (CHO INPUT) ===
// const formatCurrencyForInput = (value: string | number): string => {
//   if (typeof value === "number") {
//     value = value.toString();
//   }
//   const numericValue = value.replace(/\D/g, "");
//   if (numericValue === "") return "";
//   return new Intl.NumberFormat("vi-VN").format(parseInt(numericValue, 10));
// };

// // === SỬA ZOD SCHEMA ===
// const productSchema = z.object({
//   name: z.string().min(5, { message: "Tên phải ít nhất 5 ký tự." }),
//   description: z.string().optional(),
//   price: z
//     .string() // <-- Sửa: Nhận string (vi 100.000)
//     .min(1, { message: "Vui lòng nhập giá." })
//     .refine(
//       (value) => {
//         const numericValue = parseInt(value.replace(/\D/g, ""), 10);
//         return numericValue >= 1000;
//       },
//       { message: "Giá phải ít nhất 1,000 VND." }
//     ),
//   brand_id: z.string({ required_error: "Vui lòng chọn hãng xe." }), // <-- Sửa: 'brand' thành 'brand_id'
//   condition: z.enum(["new", "used", "like_new", "custom"], {
//     required_error: "Vui lòng chọn tình trạng.",
//   }),
//   images: z
//     .custom<FileList | null>(
//       (files) => files instanceof FileList && files.length > 0,
//       "Cần ít nhất 1 ảnh."
//     )
//     .refine(
//       (files) =>
//         Array.from(files ?? []).every((file) => file.size <= 5 * 1024 * 1024),
//       `Mỗi ảnh phải nhỏ hơn 5MB.`
//     ),
// });
// type ProductFormValues = z.infer<typeof productSchema>;

// export default function SellPage() {
//   const router = useRouter();
//   const { user } = useUser();
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [serverError, setServerError] = useState<string | null>(null);

//   // State cho Brand
//   const [brands, setBrands] = useState<Brand[]>([]);
//   const [loadingBrands, setLoadingBrands] = useState(true);
//   const [popoverOpen, setPopoverOpen] = useState(false);

//   const form = useForm<ProductFormValues>({
//     resolver: zodResolver(productSchema),
//     defaultValues: {
//       name: "",
//       description: "",
//       price: "0",
//       images: null,
//     },
//   });

//   // --- Load Brands từ API ---
//   useEffect(() => {
//     const fetchBrands = async () => {
//       try {
//         setLoadingBrands(true);
//         const res = await fetch("/api/admin/brands"); // Dùng API có sẵn
//         if (!res.ok) throw new Error("Failed to fetch brands");
//         const data = await res.json();
//         setBrands(data.brands || []);
//       } catch (error) {
//         console.error(error);
//       } finally {
//         setLoadingBrands(false);
//       }
//     };
//     fetchBrands();
//   }, []);

//   // Xử lý khi nhấn nút Đăng
//   const onSubmit = async (values: ProductFormValues) => {
//     setIsSubmitting(true);
//     setServerError(null);

//     if (!user) {
//       setServerError("Bạn cần đăng nhập để đăng bán.");
//       setIsSubmitting(false);
//       return;
//     }

//     try {
//       // 1. Upload ảnh
//       const imageUrls: string[] = [];
//       if (values.images) {
//         for (const file of Array.from(values.images)) {
//           const url = await uploadFileViaApi("products", file);
//           imageUrls.push(url);
//         }
//       }

//       // 2. Gọi API POST
//       const response = await fetch("/api/products", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           name: values.name,
//           description: values.description,
//           price: values.price.replace(/\D/g, ""), // <-- Sửa: Gửi số thô
//           brand_id: values.brand_id, // <-- Sửa: Gửi brand_id
//           condition: values.condition,
//           imageUrls: imageUrls,
//         }),
//       });

//       const data = await response.json();
//       if (!response.ok) throw new Error(data.error || "Đăng bán thất bại.");

//       alert("Đăng bán thành công!");
//       router.push("/");
//     } catch (err: unknown) {
//       console.error("Lỗi khi đăng bán:", err);
//       setServerError(
//         err instanceof Error ? err.message : "Lỗi không xác định."
//       );
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const fileRef = form.register("images");

//   return (
//     <div className="max-w-2xl mx-auto">
//       <Card>
//         <CardHeader>
//           <CardTitle>Đăng bán sản phẩm mới</CardTitle>
//           <CardDescription>
//             Điền thông tin chi tiết món hàng của bạn.
//           </CardDescription>
//         </CardHeader>
//         <CardContent>
//           <Form {...form}>
//             <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
//               {/* Tên Sản phẩm */}
//               <FormField
//                 control={form.control}
//                 name="name"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>Tên sản phẩm *</FormLabel>
//                     <FormControl>
//                       <Input
//                         placeholder="Ví dụ: Tomica Premium Nissan GTR R34"
//                         {...field}
//                       />
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />

//               {/* Giá bán (ĐÃ SỬA) */}
//               <FormField
//                 control={form.control}
//                 name="price"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>Giá bán (VND) *</FormLabel>
//                     <FormControl>
//                       <Input
//                         placeholder="Ví dụ: 250.000"
//                         {...field}
//                         // Xử lý format khi gõ
//                         onChange={(e) => {
//                           field.onChange(
//                             formatCurrencyForInput(e.target.value)
//                           );
//                         }}
//                         // Xử lý giá trị khi load
//                         value={formatCurrencyForInput(field.value)}
//                       />
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />

//               {/* Tình trạng (Giữ nguyên) */}
//               <FormField
//                 control={form.control}
//                 name="condition"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>Tình trạng *</FormLabel>
//                     <Select
//                       onValueChange={field.onChange}
//                       defaultValue={field.value}
//                     >
//                       <FormControl>
//                         <SelectTrigger>
//                           <SelectValue placeholder="Chọn tình trạng..." />
//                         </SelectTrigger>
//                       </FormControl>
//                       <SelectContent>
//                         <SelectItem value="new">Mới (New)</SelectItem>
//                         <SelectItem value="like_new">
//                           Như mới (Like New)
//                         </SelectItem>
//                         <SelectItem value="used">Đã sử dụng (Used)</SelectItem>
//                         <SelectItem value="custom">Hàng độ (Custom)</SelectItem>
//                       </SelectContent>
//                     </Select>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />

//               {/* Hãng xe (ĐÃ SỬA THÀNH COMBOBOX) */}
//               <FormField
//                 control={form.control}
//                 name="brand_id"
//                 render={({ field }) => (
//                   <FormItem className="flex flex-col">
//                     <FormLabel>Hãng xe *</FormLabel>
//                     <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
//                       <PopoverTrigger asChild>
//                         <FormControl>
//                           <Button
//                             variant="outline"
//                             role="combobox"
//                             className={cn(
//                               "w-full justify-between",
//                               !field.value && "text-muted-foreground"
//                             )}
//                           >
//                             {field.value
//                               ? brands.find((brand) => brand.id === field.value)
//                                   ?.name
//                               : "Chọn hãng xe..."}
//                             <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
//                           </Button>
//                         </FormControl>
//                       </PopoverTrigger>
//                       <PopoverContent className="w-full p-0">
//                         <Command>
//                           <CommandInput placeholder="Tìm hãng xe..." />
//                           <CommandList>
//                             <CommandEmpty>
//                               {loadingBrands
//                                 ? "Đang tải..."
//                                 : "Không tìm thấy."}
//                             </CommandEmpty>
//                             <CommandGroup>
//                               {brands.map((brand) => (
//                                 <CommandItem
//                                   value={brand.name}
//                                   key={brand.id}
//                                   onSelect={() => {
//                                     form.setValue("brand_id", brand.id);
//                                     setPopoverOpen(false);
//                                   }}
//                                 >
//                                   <Check
//                                     className={cn(
//                                       "mr-2 h-4 w-4",
//                                       brand.id === field.value
//                                         ? "opacity-100"
//                                         : "opacity-0"
//                                     )}
//                                   />
//                                   {brand.name}
//                                 </CommandItem>
//                               ))}
//                             </CommandGroup>
//                           </CommandList>
//                         </Command>
//                       </PopoverContent>
//                     </Popover>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />

//               {/* Mô tả (Giữ nguyên) */}
//               <FormField
//                 control={form.control}
//                 name="description"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>Mô tả</FormLabel>
//                     <FormControl>
//                       <Textarea
//                         placeholder="Mô tả chi tiết, tình trạng xước, full box..."
//                         {...field}
//                       />
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />

//               {/* Upload Ảnh (Giữ nguyên) */}
//               <FormField
//                 control={form.control}
//                 name="images"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>Hình ảnh *</FormLabel>
//                     <FormControl>
//                       <Input
//                         type="file"
//                         accept="image/png, image/jpeg, image/webp"
//                         multiple
//                         {...fileRef}
//                       />
//                     </FormControl>
//                     <FormDescription>
//                       Bạn có thể chọn nhiều ảnh. Ảnh đầu tiên sẽ là ảnh bìa.
//                     </FormDescription>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />

//               {/* Lỗi Server (nếu có) */}
//               {serverError && (
//                 <div className="flex items-center gap-2 text-sm text-destructive">
//                   <AlertCircle className="h-4 w-4" />
//                   <p>{serverError}</p>
//                 </div>
//               )}

//               <Button type="submit" disabled={isSubmitting} className="w-full">
//                 {isSubmitting ? (
//                   <Loader2 className="animate-spin mr-2 h-4 w-4" />
//                 ) : null}
//                 {isSubmitting ? "Đang xử lý..." : "Đăng bán ngay"}
//               </Button>
//             </form>
//           </Form>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }

// src/app/sell/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUser } from "@/contexts/UserContext";
import { uploadFileViaApi } from "@/lib/storageUtils";
// === IMPORT TỪ PRISMA (Thay thế interface thủ công) ===
import { Brand } from "@prisma/client";
// ===================================================

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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

// (Đã xóa interface Brand thủ công ở đây)

// === HÀM FORMAT TIỀN (CHO INPUT) ===
const formatCurrencyForInput = (value: string | number): string => {
  if (typeof value === "number") {
    value = value.toString();
  }
  const numericValue = value.replace(/\D/g, "");
  if (numericValue === "") return "";
  return new Intl.NumberFormat("vi-VN").format(parseInt(numericValue, 10));
};

// === SỬA ZOD SCHEMA ===
const productSchema = z.object({
  name: z.string().min(5, { message: "Tên phải ít nhất 5 ký tự." }),
  description: z.string().optional(),
  price: z
    .string() // Nhận string (vi 100.000)
    .min(1, { message: "Vui lòng nhập giá." })
    .refine(
      (value) => {
        const numericValue = parseInt(value.replace(/\D/g, ""), 10);
        return numericValue >= 1000;
      },
      { message: "Giá phải ít nhất 1,000 VND." }
    ),
  brand_id: z.string({ required_error: "Vui lòng chọn hãng xe." }),
  condition: z.enum(["new", "used", "like_new", "custom"], {
    required_error: "Vui lòng chọn tình trạng.",
  }),
  images: z
    .custom<FileList | null>(
      (files) => files instanceof FileList && files.length > 0,
      "Cần ít nhất 1 ảnh."
    )
    .refine(
      (files) =>
        Array.from(files ?? []).every((file) => file.size <= 5 * 1024 * 1024),
      `Mỗi ảnh phải nhỏ hơn 5MB.`
    ),
});
type ProductFormValues = z.infer<typeof productSchema>;

export default function SellPage() {
  const router = useRouter();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // State cho Brand (Sử dụng Type từ Prisma)
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "0",
      images: null,
    },
  });

  // --- Load Brands từ API ---
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        setLoadingBrands(true);
        const res = await fetch("/api/admin/brands"); // Dùng API có sẵn
        if (!res.ok) throw new Error("Failed to fetch brands");
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

  // Xử lý khi nhấn nút Đăng
  const onSubmit = async (values: ProductFormValues) => {
    setIsSubmitting(true);
    setServerError(null);

    if (!user) {
      setServerError("Bạn cần đăng nhập để đăng bán.");
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Upload ảnh
      const imageUrls: string[] = [];
      if (values.images) {
        for (const file of Array.from(values.images)) {
          const url = await uploadFileViaApi("products", file);
          imageUrls.push(url);
        }
      }

      // 2. Gọi API POST
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          description: values.description,
          price: values.price.replace(/\D/g, ""), // Gửi số thô
          brand_id: values.brand_id,
          condition: values.condition,
          imageUrls: imageUrls,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Đăng bán thất bại.");

      alert("Đăng bán thành công!");
      router.push("/");
    } catch (err: unknown) {
      console.error("Lỗi khi đăng bán:", err);
      setServerError(
        err instanceof Error ? err.message : "Lỗi không xác định."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const fileRef = form.register("images");

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Đăng bán sản phẩm mới</CardTitle>
          <CardDescription>
            Điền thông tin chi tiết món hàng của bạn.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Tên Sản phẩm */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên sản phẩm *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ví dụ: Tomica Premium Nissan GTR R34"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Giá bán */}
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Giá bán (VND) *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ví dụ: 250.000"
                        {...field}
                        // Xử lý format khi gõ
                        onChange={(e) => {
                          field.onChange(
                            formatCurrencyForInput(e.target.value)
                          );
                        }}
                        // Xử lý giá trị khi load
                        value={formatCurrencyForInput(field.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tình trạng */}
              <FormField
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tình trạng *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn tình trạng..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="new">Mới (New)</SelectItem>
                        <SelectItem value="like_new">
                          Như mới (Like New)
                        </SelectItem>
                        <SelectItem value="used">Đã sử dụng (Used)</SelectItem>
                        <SelectItem value="custom">Hàng độ (Custom)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hãng xe (Combobox) */}
              <FormField
                control={form.control}
                name="brand_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Hãng xe *</FormLabel>
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
                              ? brands.find((brand) => brand.id === field.value)
                                  ?.name
                              : "Chọn hãng xe..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Tìm hãng xe..." />
                          <CommandList>
                            <CommandEmpty>
                              {loadingBrands
                                ? "Đang tải..."
                                : "Không tìm thấy."}
                            </CommandEmpty>
                            <CommandGroup>
                              {brands.map((brand) => (
                                <CommandItem
                                  value={brand.name}
                                  key={brand.id}
                                  onSelect={() => {
                                    form.setValue("brand_id", brand.id);
                                    setPopoverOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      brand.id === field.value
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {brand.name}
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

              {/* Mô tả */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mô tả</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Mô tả chi tiết, tình trạng xước, full box..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Upload Ảnh */}
              <FormField
                control={form.control}
                name="images"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hình ảnh *</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        multiple
                        {...fileRef}
                      />
                    </FormControl>
                    <FormDescription>
                      Bạn có thể chọn nhiều ảnh. Ảnh đầu tiên sẽ là ảnh bìa.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Lỗi Server */}
              {serverError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <p>{serverError}</p>
                </div>
              )}

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                ) : null}
                {isSubmitting ? "Đang xử lý..." : "Đăng bán ngay"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
