// src/app/products/[id]/page.tsx
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, ShieldCheck } from "lucide-react";
import { BuyProductDialog } from "@/components/BuyProductDialog";
import { ProductImageGallery } from "@/components/ProductImageGallery";
import { ChatButton } from "@/components/ChatButton";
import { AddToCartButton } from "@/components/AddToCartButton";
import { BackButton } from "@/components/BackButton";

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
    notFound();
  }

  const isAvailable = product.status === "available" && product.quantity > 0;

  return (
    <div className="container mx-auto py-6 max-w-6xl px-4">
      <BackButton />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* GALLERY */}
        <div>
          <ProductImageGallery
            images={product.image_urls as string[]}
            productName={product.name}
          />
        </div>

        {/* INFO */}
        <div className="flex flex-col space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {product.name}
              </h1>
              {!isAvailable && (
                <Badge variant="destructive" className="text-sm px-3 py-1">
                  Out of Stock / Unavailable
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
                Brand:{" "}
                <span className="font-medium text-foreground">
                  {product.brand?.name || "Other"}
                </span>
              </p>
              <p>
                Posted on:{" "}
                {new Date(product.created_at).toLocaleDateString("en-GB")}
              </p>
              <p className="text-orange-600 font-medium">
                Stock: {product.quantity} items left
              </p>
            </div>
          </div>

          <Separator />

          {/* Seller Info */}
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
                  Joined:{" "}
                  {new Date(product.seller.created_at).toLocaleDateString(
                    "en-GB"
                  )}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-sm font-medium justify-end">
                  <ShieldCheck className="h-4 w-4 text-blue-600" /> Reputation:{" "}
                  {product.seller.reputation_score}
                </div>
                <Button variant="link" size="sm" className="px-0 h-auto mt-1">
                  View Profile
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Product Description</h3>
            <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
              {product.description || "No description provided."}
            </p>
          </div>

          <Separator />

          {/* Actions */}
          <div className="pt-2 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <BuyProductDialog
                product={{
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  status: product.status,
                  quantity: product.quantity,
                }}
              />

              <AddToCartButton
                product={{
                  id: product.id,
                  name: product.name,
                  price: Number(product.price),
                  image_urls: product.image_urls as string[],
                  seller: { username: product.seller.username },
                  quantity: product.quantity,
                }}
                disabled={!isAvailable}
              />
            </div>

            <ChatButton sellerId={product.seller.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
