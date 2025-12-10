// src/app/admin/group-buys/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; // [NEW]
import {
  Loader2,
  Search,
  AlertCircle,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"; // [NEW Icons]
import { GroupBuyActions } from "@/components/admin/GroupBuyActions";

interface GroupBuy {
  id: string;
  product_name: string;
  price_per_unit: number;
  target_quantity: number;
  participant_count: number;
  status: any;
  join_deadline: string;
  created_at: string;
  host: {
    username: string;
    full_name: string;
    email: string;
  } | null;
}

const formatCurrency = (val: number | string) => {
  const amount = Number(val);
  if (isNaN(amount)) return "0 ₫";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

export default function AdminGroupBuysPage() {
  const [groupBuys, setGroupBuys] = useState<GroupBuy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // [NEW] Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchGroupBuys = useCallback(async (searchTerm = "", page = 1) => {
    // Logic loading: Load cứng lần đầu, load nhẹ khi search/chuyển trang
    if (page === 1 && !searchTerm) setLoading(true);
    else setIsSearching(true);

    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      params.append("page", page.toString());
      params.append("limit", "10"); // Giới hạn 10 item/trang

      const res = await fetch(`/api/admin/group-buys?${params.toString()}`);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load group buys");
      }

      const data = await res.json();
      setGroupBuys(data.groupBuys || []);
      setTotalPages(data.totalPages || 1);
      setCurrentPage(data.currentPage || 1);
    } catch (err: any) {
      console.error("Admin Group Buys Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  }, []);

  // 1. Initial Load
  useEffect(() => {
    fetchGroupBuys("", 1);
  }, [fetchGroupBuys]);

  // 2. Debounce Search
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchGroupBuys(search, 1); // Reset về trang 1 khi search
    }, 500);
    return () => clearTimeout(timeout);
  }, [search, fetchGroupBuys]);

  // [NEW] Handle Page Change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      fetchGroupBuys(search, newPage);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
      case "active":
        return <Badge className="bg-blue-600 hover:bg-blue-700">Active</Badge>;
      case "successful":
      case "completed":
        return (
          <Badge className="bg-green-600 hover:bg-green-700">Success</Badge>
        );
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "cancelled":
        return (
          <Badge variant="outline" className="text-red-500 border-red-200">
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center py-20 bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive">
        <AlertCircle className="h-6 w-6 mr-2" />
        <span>Error: {error}</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <CardTitle>Group Buy Management</CardTitle>
            <CardDescription>
              Monitor and manage group buy campaigns.
            </CardDescription>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search product, host..."
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
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Campaign Info</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupBuys.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-10 text-muted-foreground"
                  >
                    No group buys found.
                  </TableCell>
                </TableRow>
              ) : (
                groupBuys.map((gb) => (
                  <TableRow key={gb.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-base flex items-center gap-2">
                          <ShoppingBag className="h-4 w-4 text-orange-500" />
                          {gb.product_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Deadline:{" "}
                          {gb.join_deadline
                            ? new Date(gb.join_deadline).toLocaleDateString(
                                "en-GB"
                              )
                            : "N/A"}
                        </span>
                        <span className="text-sm font-semibold text-primary">
                          {formatCurrency(gb.price_per_unit)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">
                          @{gb.host?.username || "Unknown"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {gb.host?.email}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>{getStatusBadge(gb.status)}</TableCell>
                    <TableCell className="text-right">
                      <GroupBuyActions
                        groupBuy={{
                          id: gb.id,
                          status: gb.status,
                          productName: gb.product_name,
                        }}
                        onActionSuccess={() =>
                          fetchGroupBuys(search, currentPage)
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* [NEW] Pagination Footer */}
      <CardFooter className="flex items-center justify-between py-4">
        <div className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isSearching}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || isSearching}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
