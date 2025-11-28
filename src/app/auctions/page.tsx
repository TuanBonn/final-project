// src/app/auctions/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Gavel,
  Clock,
  User as UserIcon,
  PlusCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@/contexts/UserContext";

interface AuctionItem {
  id: string;
  productName: string;
  productImage: string | null;
  condition: string;
  sellerName: string;
  sellerAvatar: string | null;
  currentPrice: number;
  endTime: string;
  startTime: string;
  status: string;
  bidCount: number;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount
  );

const getTimeLeft = (endTime: string) => {
  const now = new Date();
  const end = new Date(endTime);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return "Ended";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} days left`;
  }
  return `${hours}h ${minutes}m`;
};

export default function AuctionsPage() {
  const { user } = useUser();
  const [auctions, setAuctions] = useState<AuctionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        const res = await fetch("/api/auctions");
        const data = await res.json();
        setAuctions(data.auctions || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchAuctions();
  }, []);

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Gavel className="h-8 w-8 text-primary" /> Auction Marketplace
          </h1>
          <p className="text-muted-foreground mt-1">
            Hunt rare pieces and great deals with the community.
          </p>
        </div>

        {user && (
          <Button asChild className="hidden sm:flex">
            <Link href="/auctions/create">
              <PlusCircle className="mr-2 h-4 w-4" /> Create auction
            </Link>
          </Button>
        )}
      </div>

      {/* Mobile button */}
      {user && (
        <div className="sm:hidden mb-6">
          <Button asChild className="w-full">
            <Link href="/auctions/create">
              <PlusCircle className="mr-2 h-4 w-4" /> Create auction
            </Link>
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : auctions.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 rounded-lg border border-dashed">
          <p className="text-lg text-muted-foreground mb-4">
            There are no live auctions at the moment.
          </p>
          {user && (
            <Button variant="outline" asChild>
              <Link href="/auctions/create">Be the first to create one!</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {auctions.map((auction) => (
            <Card
              key={auction.id}
              className="overflow-hidden flex flex-col hover:shadow-lg transition-shadow"
            >
              {/* Image */}
              <div className="relative aspect-[4/3] bg-muted">
                {auction.productImage ? (
                  <Image
                    src={auction.productImage}
                    alt={auction.productName}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No Image
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <Badge
                    variant={
                      auction.status === "active" ? "default" : "secondary"
                    }
                    className="bg-black/70 hover:bg-black/80 backdrop-blur-sm"
                  >
                    {auction.status === "active" ? "Live" : "Upcoming"}
                  </Badge>
                </div>
              </div>

              <CardHeader className="p-4 pb-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={auction.sellerAvatar || ""} />
                    <AvatarFallback>
                      <UserIcon className="h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>
                  <span>{auction.sellerName}</span>
                </div>
                <CardTitle className="text-base line-clamp-2 h-12 leading-snug">
                  <Link
                    href={`/auctions/${auction.id}`}
                    className="hover:underline"
                  >
                    {auction.productName}
                  </Link>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-4 flex-1">
                <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                  <p className="text-xs text-muted-foreground mb-1">
                    Current price
                  </p>
                  <p className="text-xl font-bold text-primary">
                    {formatCurrency(auction.currentPrice)}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-3 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Gavel className="h-3 w-3" /> {auction.bidCount} bids
                  </div>
                  <div className="flex items-center gap-1 font-medium text-orange-600">
                    <Clock className="h-3 w-3" /> {getTimeLeft(auction.endTime)}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-4 pt-0">
                <Button className="w-full font-semibold" asChild>
                  <Link href={`/auctions/${auction.id}`}>Join now</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
