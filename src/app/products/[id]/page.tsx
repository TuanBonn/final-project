import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, ArrowLeft, ShieldCheck } from "lucide-react";
import { BuyProductDialog } from "@/components/BuyProductDialog";
import { ProductImageGallery } from "@/components/ProductImageGallery";
import { ChatButton } from "@/components/ChatButton";
import { AddToCartButton } from "@/components/AddToCartButton";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

const getInitials = (name: string | null) =>
  name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: productId } = await params;

  const supabase = getSupabaseAdmin();

  // Lấy thêm trường 'quantity'
  const { data: product, error } = await supabase
    .from("products")
    .select(
      `
      id, name, description, price, condition, status, image_urls, created_at, quantity,
      seller:users!seller_id (
        id, username, full_name, avatar_url, is_verified, reputation_score, created_at
      ),
      brand:brands ( name )
    `
    )
    .eq("id", productId)
    .single();

  if (error || !product) {
    console.error("Error fetching product:", error);
    notFound();
  }

  const isAvailable = product.status === "available" && product.quantity > 0;

  return (
    <div className="container mx-auto py-6 max-w-6xl px-4">
      <Button variant="ghost" asChild className="mb-6">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại trang chủ
        </Link>
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* === CỘT TRÁI: GALLERY ẢNH === */}
        <div>
          <ProductImageGallery
            images={product.image_urls as string[]}
            productName={product.name}
          />
        </div>

        {/* === CỘT PHẢI: THÔNG TIN === */}
        <div className="flex flex-col space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {product.name}
              </h1>
              {!isAvailable && (
                <Badge variant="destructive" className="text-sm px-3 py-1">
                  Hết hàng / Ngừng bán
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 mb-4">
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(product.price)}
              </p>
              {product.condition && (
                <Badge variant="outline" className="capitalize">
                  {product.condition.replace("_", " ")}
                </Badge>
              )}
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                Hãng xe:{" "}
                <span className="font-medium text-foreground">
                  {product.brand?.name || "Khác"}
                </span>
              </p>
              <p>
                Đăng ngày:{" "}
                {new Date(product.created_at).toLocaleDateString("vi-VN")}
              </p>
              {/* Hiển thị tồn kho */}
              <p className="text-orange-600 font-medium">
                Kho: Còn {product.quantity} sản phẩm
              </p>
            </div>
          </div>

          <Separator />

          {/* Thông tin người bán */}
          <div className="bg-muted/30 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12 border-2 border-background">
                <AvatarImage src={product.seller.avatar_url || ""} />
                <AvatarFallback>
                  {getInitials(
                    product.seller.full_name || product.seller.username
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-lg">
                    {product.seller.username}
                  </p>
                  {product.seller.is_verified && (
                    <CheckCircle
                      className="h-4 w-4 text-green-600"
                      aria-label="Verified"
                    />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Tham gia:{" "}
                  {new Date(product.seller.created_at).toLocaleDateString(
                    "vi-VN"
                  )}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-sm font-medium justify-end">
                  <ShieldCheck className="h-4 w-4 text-blue-600" /> Uy tín:{" "}
                  {product.seller.reputation_score}
                </div>
                <Button variant="link" size="sm" className="px-0 h-auto mt-1">
                  Xem trang cá nhân
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Mô tả sản phẩm</h3>
            <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
              {product.description ||
                "Người bán không cung cấp mô tả chi tiết."}
            </p>
          </div>

          <Separator />

          {/* === KHU VỰC HÀNH ĐỘNG === */}
          <div className="pt-2 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Truyền quantity vào BuyProductDialog */}
              <BuyProductDialog
                product={{
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  status: product.status,
                  quantity: product.quantity, // <-- Quan trọng
                }}
              />

              {/* Nút Thêm Giỏ Hàng (Logic giỏ hàng cần cập nhật thêm để hỗ trợ số lượng nếu muốn) */}
              <AddToCartButton
                product={{
                  id: product.id,
                  name: product.name,
                  price: Number(product.price),
                  image_urls: product.image_urls as string[],
                  seller: { username: product.seller.username },
                }}
                disabled={!isAvailable}
              />
            </div>

            {/* Nút Chat */}
            <ChatButton sellerId={product.seller.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
