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
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Gavel,
  Clock,
  ShieldAlert,
  Search,
  RefreshCw,
} from "lucide-react";
import { AuctionActions } from "@/components/admin/AuctionActions";
import { AuctionStatus } from "@prisma/client";
import { Pagination } from "@/components/Pagination";

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
  const [scanningExpired, setScanningExpired] = useState(false);

  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = useCallback(
    async (searchTerm = "", currentPage = 1, isInitial = false) => {
      if (isInitial) setLoading(true);
      else setIsSearching(true);

      try {
        const params = new URLSearchParams();
        if (currentTab !== "all") params.append("status", currentTab);
        if (searchTerm) params.append("search", searchTerm);

        params.append("page", currentPage.toString());
        params.append("limit", "10");

        const res = await fetch(`/api/admin/auctions?${params.toString()}`);
        const data = await res.json();

        setAuctions(data.auctions || []);
        setTotalPages(data.totalPages || 1);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
        setIsSearching(false);
      }
    },
    [currentTab]
  );

  useEffect(() => {
    setPage(1);
    fetchData(search, 1, true);
  }, [currentTab]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      fetchData(search, 1, false);
    }, 500);
    return () => clearTimeout(timeout);
  }, [search]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchData(search, newPage, false);
  };

  const handleScanOverdue = async () => {
    if (!confirm("Scan 'Waiting' auctions overdue (24h) to cancel & penalize?"))
      return;
    setScanning(true);
    try {
      const res = await fetch("/api/admin/auctions/check-overdue", {
        method: "POST",
      });
      const data = await res.json();
      alert(data.message || "Scan completed.");
      fetchData(search, page, false);
    } catch (error) {
      alert("Scan error.");
    } finally {
      setScanning(false);
    }
  };

  const handleScanExpired = async () => {
    setScanningExpired(true);
    try {
      const res = await fetch("/api/admin/auctions/scan-expired", {
        method: "POST",
      });
      const data = await res.json();
      alert(data.message || "Expired auctions processed.");
      fetchData(search, page, false);
    } catch (error) {
      console.error(error);
      alert("Failed to scan expired auctions.");
    } finally {
      setScanningExpired(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>
        );
      case "waiting":
        return (
          <Badge className="bg-orange-500 hover:bg-orange-600">
            Waiting Payment
          </Badge>
        );
      case "ended":
        return <Badge variant="secondary">Ended</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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

        <div className="mt-4 flex flex-wrap gap-2">
          {/* Button 1: Scan Expired */}
          <Button
            variant="default"
            size="sm"
            onClick={handleScanExpired}
            disabled={scanningExpired}
            className="gap-2"
          >
            {scanningExpired ? (
              <Loader2 className="animate-spin h-4 w-4" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Scan Expired (Active → Waiting)
          </Button>

          {/* Button 2: Scan Overdue */}
          <Button
            variant="destructive"
            size="sm"
            onClick={handleScanOverdue}
            disabled={scanning}
            className="gap-2"
          >
            {scanning ? (
              <Loader2 className="animate-spin h-4 w-4" />
            ) : (
              <ShieldAlert className="h-4 w-4" />
            )}
            Scan Overdue (Waiting → Cancel)
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
            <TabsTrigger value="waiting" className="text-orange-600">
              Waiting Payment
            </TabsTrigger>
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
          <>
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
                        title={au.product?.name || ""}
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
                          <Clock className="h-3 w-3" />{" "}
                          {new Date(au.end_time).toLocaleString("en-GB")}
                        </div>
                      </TableCell>
                      <TableCell>{renderStatusBadge(au.status)}</TableCell>
                      <TableCell className="text-right">
                        <AuctionActions
                          auctionId={au.id}
                          currentStatus={au.status}
                          onUpdate={() => fetchData(search, page, false)}
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

            <div className="mt-4">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                loading={loading || isSearching}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
