// src/app/admin/auctions/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Import Input
import {
  Loader2,
  AlertCircle,
  Gavel,
  Clock,
  ShieldAlert,
  Search,
} from "lucide-react";
import { AuctionActions } from "@/components/admin/AuctionActions";
import { AuctionStatus } from "@prisma/client";

interface AuctionRow {
  id: string;
  status: AuctionStatus;
  starting_bid: number;
  start_time: string;
  end_time: string;
  bid_count: number;
  created_at: string;
  product: { name: string } | null;
  seller: { username: string | null } | null;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val
  );

export default function AdminAuctionsPage() {
  const [auctions, setAuctions] = useState<AuctionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState("all");
  const [scanning, setScanning] = useState(false);

  // Search State
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const fetchData = useCallback(
    async (searchTerm = "", isInitial = false) => {
      if (isInitial) setLoading(true);
      else setIsSearching(true);

      try {
        const params = new URLSearchParams();
        if (currentTab !== "all") params.append("status", currentTab);
        if (searchTerm) params.append("search", searchTerm);

        const res = await fetch(`/api/admin/auctions?${params.toString()}`);
        const data = await res.json();
        setAuctions(data.auctions || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
        setIsSearching(false);
      }
    },
    [currentTab]
  );

  // Initial Load & Tab Change
  useEffect(() => {
    fetchData(search, true);
  }, [currentTab]);

  // Debounce Search
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchData(search, false);
    }, 500);
    return () => clearTimeout(timeout);
  }, [search]);

  const handleScanOverdue = async () => {
    if (
      !confirm(
        "System will scan auctions ended > 24h unpaid and penalize reputation. Continue?"
      )
    )
      return;

    setScanning(true);
    try {
      const res = await fetch("/api/admin/auctions/check-overdue", {
        method: "POST",
      });
      const data = await res.json();
      alert(data.message || "Scan completed.");
      fetchData(search, false);
    } catch (error) {
      alert("Scan error.");
    } finally {
      setScanning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <CardTitle>Auction Management</CardTitle>
            <CardDescription>
              Monitor and moderate auction sessions.
            </CardDescription>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search product or seller..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            {isSearching && (
              <div className="absolute right-3 top-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        <div className="mt-4">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleScanOverdue}
            disabled={scanning}
            className="gap-2 w-full md:w-auto"
          >
            {scanning ? (
              <Loader2 className="animate-spin h-4 w-4" />
            ) : (
              <ShieldAlert className="h-4 w-4" />
            )}
            Scan Overdue (24h)
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="all" onValueChange={setCurrentTab} className="mb-4">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active" className="text-green-600">
              Active
            </TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="ended">Ended</TabsTrigger>
            <TabsTrigger value="cancelled" className="text-red-600">
              Cancelled
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Start Price</TableHead>
                  <TableHead>Bids</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auctions.map((au) => (
                  <TableRow key={au.id}>
                    <TableCell
                      className="font-medium max-w-[200px] truncate"
                      title={au.product?.name}
                    >
                      {au.product?.name || "---"}
                    </TableCell>
                    <TableCell>@{au.seller?.username}</TableCell>
                    <TableCell className="font-mono text-primary font-bold">
                      {formatCurrency(au.starting_bid)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Gavel className="h-3 w-3" /> {au.bid_count}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(au.end_time).toLocaleString("en-GB")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={au.status === "active" ? "default" : "outline"}
                        className={
                          au.status === "cancelled"
                            ? "text-red-600 border-red-200"
                            : ""
                        }
                      >
                        {au.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <AuctionActions
                        auction={au}
                        onActionSuccess={() => fetchData(search, false)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {auctions.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-10 text-muted-foreground"
                    >
                      No auctions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
