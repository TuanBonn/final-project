import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ProductCard } from "@/components/ProductCard";
import { ChatButton } from "@/components/ChatButton";
import { BackButton } from "@/components/BackButton";
import {
  ShieldCheck,
  Calendar,
  Package,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

const getInitials = (name: string | null) =>
  name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const decodedUsername = decodeURIComponent(username);
  return {
    title: `${decodedUsername}'s Shop | Model Marketplace`,
    description: `Products currently listed by ${decodedUsername}.`,
  };
}

function ServerPagination({
  currentPage,
  totalPages,
  baseUrl,
}: {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-4 py-8">
      <Button variant="outline" size="sm" disabled={currentPage <= 1} asChild>
        {currentPage > 1 ? (
          <Link href={`${baseUrl}&page=${currentPage - 1}`}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Link>
        ) : (
          <span>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </span>
        )}
      </Button>
      <span className="text-sm font-medium">
        Page {currentPage} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage >= totalPages}
        asChild
      >
        {currentPage < totalPages ? (
          <Link href={`${baseUrl}&page=${currentPage + 1}`}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        ) : (
          <span>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </span>
        )}
      </Button>
    </div>
  );
}

export default async function PublicProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { username } = await params;
  const { page, search } = await searchParams;
  const searchQuery = typeof search === "string" ? search : "";

  const decodedUsername = decodeURIComponent(username);
  const supabase = getSupabaseAdmin();

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select(
      "id, username, full_name, avatar_url, role, is_verified, reputation_score, created_at"
    )
    .eq("username", decodedUsername)
    .single();

  if (profileError || !profile) {
    return notFound();
  }

  const currentPage = Number(page) || 1;
  const limit = 12;
  const from = (currentPage - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("products")
    .select(
      `
      id, name, description, price, condition, status, image_urls, quantity, created_at,
      seller:users!seller_id ( username, avatar_url, is_verified ),
      brand:brands ( id, name )
    `,
      { count: "exact" }
    )
    .eq("seller_id", profile.id)
    .eq("status", "available");

  if (searchQuery) {
    query = query.ilike("name", `%${searchQuery}%`);
  }

  const {
    data: products,
    error: productsError,
    count,
  } = await query.order("created_at", { ascending: false }).range(from, to);

  if (productsError) {
    console.error("Error fetching products:", productsError);
  }

  const totalPages = count ? Math.ceil(count / limit) : 1;
  const paginationBaseUrl = `/user/${username}?search=${searchQuery}`;

  return (
    <div className="container mx-auto py-6 max-w-6xl px-4">
      <BackButton />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* === LEFT COLUMN: USER INFO === */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border shadow-sm overflow-hidden text-center sticky top-24">
            <div className="relative px-6 pt-8 mb-4 flex justify-center">
              <Avatar className="h-28 w-28 border shadow-sm bg-background">
                <AvatarImage
                  src={profile.avatar_url || ""}
                  className="object-cover"
                />
                <AvatarFallback className="text-3xl font-bold bg-muted text-muted-foreground">
                  {getInitials(profile.full_name || profile.username)}
                </AvatarFallback>
              </Avatar>
            </div>

            <CardContent className="pb-6 px-6">
              <div className="mb-3">
                <h1 className="text-xl font-bold text-foreground">
                  {profile.full_name || profile.username}
                </h1>
                <p className="text-sm text-muted-foreground">
                  @{profile.username}
                </p>
              </div>

              <div className="flex justify-center items-center gap-2 mb-6 flex-wrap">
                {profile.is_verified && (
                  <Badge
                    variant="default"
                    className="bg-green-600 hover:bg-green-700 py-0.5 px-2 text-[10px] font-bold uppercase tracking-wider gap-1"
                  >
                    <ShieldCheck className="h-3 w-3" /> Verified
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="border-yellow-500 text-yellow-700 bg-yellow-50 py-0.5 px-2 text-[11px]"
                >
                  {profile.reputation_score} Reputation
                </Badge>
                {profile.role === "dealer" && (
                  <Badge className="bg-purple-600 hover:bg-purple-700 py-0.5 px-2 text-[10px]">
                    Dealer
                  </Badge>
                )}
              </div>

              <div className="w-full mb-6">
                <ChatButton sellerId={profile.id} />
              </div>

              <Separator className="mb-4" />

              <div className="text-sm text-left space-y-3 text-muted-foreground">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>
                    Joined:{" "}
                    {new Date(profile.created_at).toLocaleDateString("en-GB")}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 shrink-0" />
                  <span>Total listings: {count || 0} products</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* === RIGHT COLUMN: PRODUCT LIST === */}
        <div className="lg:col-span-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Package className="h-6 w-6 text-primary" />
                Products for sale
              </h2>
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {count || 0}
              </Badge>
            </div>

            {/* SEARCH FORM (GET) */}
            <form className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                name="search"
                placeholder="Search in this shop..."
                defaultValue={searchQuery}
                className="pl-9"
              />
            </form>
          </div>

          {products && products.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              <div className="mt-8">
                <ServerPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  baseUrl={paginationBaseUrl}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-xl border border-dashed">
              <Package className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-lg text-muted-foreground font-medium">
                {searchQuery
                  ? "No products found matching your search."
                  : "This user has no active products for sale."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
