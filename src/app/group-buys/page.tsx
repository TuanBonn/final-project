"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation"; // Import useRouter
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Plus, Users, ShieldCheck, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface GroupBuy {
  id: string;
  name: string;
  image: string | null;
  price: number;
  target: number;
  current: number;
  status: string;
  host: {
    username: string;
    avatar_url: string | null;
  };
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "VND",
  }).format(val);

export default function GroupBuysPage() {
  const [groupBuys, setGroupBuys] = useState<GroupBuy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const router = useRouter(); // Hook

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/group-buys");
        const data = await res.json();
        setGroupBuys(data.groupBuys || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredList = groupBuys.filter((gb) =>
    gb.name.toLowerCase().includes(search.toLowerCase())
  );

  // Helper
  const handleHostClick = (e: React.MouseEvent, username: string) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/user/${username}`);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* HEADER & SEARCH (Giữ nguyên) */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Group Buy Marketplace</h1>
          <p className="text-muted-foreground">
            Join together to get better prices. Secure with escrow protection.
          </p>
        </div>
        <Button asChild className="bg-orange-600 hover:bg-orange-700">
          <Link href="/group-buys/create">
            <Plus className="mr-2 h-4 w-4" /> Create New Group Buy
          </Link>
        </Button>
      </div>

      <div className="relative mb-8 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search group buys..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : filteredList.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-xl border border-dashed">
          <p className="text-muted-foreground">
            No group buy campaigns available.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredList.map((gb) => (
            <Link href={`/group-buys/${gb.id}`} key={gb.id} className="group">
              <Card className="h-full overflow-hidden hover:shadow-md transition-shadow border-muted">
                {/* IMAGE */}
                <div className="relative h-48 w-full bg-muted">
                  {gb.image ? (
                    <Image
                      src={gb.image}
                      alt={gb.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No Image
                    </div>
                  )}

                  {/* STATUS BADGE */}
                  <div className="absolute top-2 right-2">
                    {gb.status === "open" ? (
                      <Badge className="bg-blue-600 hover:bg-blue-700">
                        Collecting
                      </Badge>
                    ) : gb.status === "successful" ? (
                      <Badge className="bg-green-600 hover:bg-green-700">
                        Successful
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <CardContent className="p-4">
                  <h3 className="font-bold text-lg line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                    {gb.name}
                  </h3>

                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xl font-bold text-orange-600">
                      {formatCurrency(gb.price)}
                    </p>

                    <div className="flex items-center text-xs font-medium bg-muted px-2 py-1 rounded text-muted-foreground">
                      <Users className="h-3 w-3 mr-1" />
                      {gb.current}/{gb.target}
                    </div>
                  </div>

                  {/* [CẬP NHẬT] Host Info */}
                  <div className="flex items-center gap-2 pt-3 border-t mt-2">
                    <div
                      onClick={(e) => handleHostClick(e, gb.host.username)}
                      className="cursor-pointer hover:opacity-80"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={gb.host.avatar_url || ""} />
                        <AvatarFallback>H</AvatarFallback>
                      </Avatar>
                    </div>

                    <span
                      className="text-xs text-muted-foreground truncate flex-1 cursor-pointer group/host"
                      onClick={(e) => handleHostClick(e, gb.host.username)}
                    >
                      Host:{" "}
                      <span className="font-medium text-foreground group-hover/host:text-primary group-hover/host:underline">
                        {gb.host.username}
                      </span>
                    </span>
                    <ShieldCheck className="h-3 w-3 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
