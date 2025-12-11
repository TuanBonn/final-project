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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  ArrowDownCircle,
  ArrowUpCircle,
  ShoppingBag,
  CreditCard,
  Search,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { PaymentStatus, PaymentForType } from "@prisma/client";
import { Pagination } from "@/components/Pagination";

interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  payment_for_type: PaymentForType;
  status: PaymentStatus;
  created_at: string;
  user: {
    username: string | null;
    email: string;
  } | null;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val
  );

const isNegativeTransaction = (type: string) => {
  return (
    type === "withdrawal" ||
    type === "group_buy_order" ||
    type.includes("fee") ||
    type === "auction_bid_fee" ||
    type === "dealer_subscription" ||
    type === "verification_fee" ||
    type === "auction_fee_refund"
  );
};

const getTypeInfo = (type: string) => {
  if (
    type === "deposit" ||
    type === "group_buy_refund" ||
    type === "group_buy_payout"
  ) {
    return {
      icon: ArrowDownCircle,
      color: "text-green-600",
      label: "Inflow",
    };
  }
  if (type === "withdrawal" || type === "auction_fee_refund") {
    return {
      icon: ArrowUpCircle,
      color: "text-red-600",
      label: "Withdrawal/Refund",
    };
  }
  if (type === "group_buy_order") {
    return {
      icon: ShoppingBag,
      color: "text-orange-600",
      label: "Group Buy Order",
    };
  }
  if (
    type.includes("fee") ||
    type === "transaction_commission" ||
    type === "dealer_subscription" ||
    type === "verification_fee"
  ) {
    return { icon: CreditCard, color: "text-blue-600", label: "Revenue/Fee" };
  }

  return {
    icon: ArrowUpCircle,
    color: "text-gray-600",
    label: type.replace(/_/g, " "),
  };
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState("all");

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

        const res = await fetch(`/api/admin/payments?${params.toString()}`);
        const data = await res.json();

        setPayments(data.payments || []);
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

  const handleUpdateStatus = async (
    id: string,
    newStatus: "succeeded" | "failed"
  ) => {
    if (
      !confirm(
        `Are you sure you want to mark this as ${newStatus.toUpperCase()}?`
      )
    )
      return;

    try {
      const res = await fetch(`/api/admin/payments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update status");
      }

      alert("Updated successfully!");
      fetchData(search, page, false);
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>
              Track all deposits, withdrawals, and fees.
            </CardDescription>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search user, email..."
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
        <Tabs defaultValue="all" onValueChange={setCurrentTab} className="mb-4">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending" className="text-yellow-600">
              Pending
            </TabsTrigger>
            <TabsTrigger value="succeeded" className="text-green-600">
              Succeeded
            </TabsTrigger>
            <TabsTrigger value="failed" className="text-red-600">
              Failed
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
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-10 text-muted-foreground"
                      >
                        No transactions found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((pay) => {
                      const isNegative = isNegativeTransaction(
                        pay.payment_for_type
                      );
                      const typeInfo = getTypeInfo(pay.payment_for_type);
                      const TypeIcon = typeInfo.icon;

                      return (
                        <TableRow key={pay.id}>
                          <TableCell>
                            <div className="font-medium">
                              {pay.user?.username || "Unknown"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {pay.user?.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="capitalize flex w-fit gap-1"
                            >
                              <TypeIcon
                                className={`h-3 w-3 ${typeInfo.color}`}
                              />
                              {typeInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell
                            className={`font-mono font-bold ${
                              isNegative ? "text-red-600" : "text-green-600"
                            }`}
                          >
                            {isNegative ? "-" : "+"}
                            {formatCurrency(pay.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                pay.status === "succeeded"
                                  ? "default"
                                  : pay.status === "failed"
                                  ? "destructive"
                                  : "outline"
                              }
                              className={`capitalize ${
                                pay.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200"
                                  : ""
                              }`}
                            >
                              {pay.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {new Date(pay.created_at).toLocaleString("en-GB")}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() =>
                                    navigator.clipboard.writeText(pay.id)
                                  }
                                >
                                  Copy ID
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />

                                {pay.status === "pending" ? (
                                  <>
                                    <DropdownMenuItem
                                      className="text-green-600 focus:text-green-700 cursor-pointer"
                                      onClick={() =>
                                        handleUpdateStatus(pay.id, "succeeded")
                                      }
                                    >
                                      <CheckCircle2 className="mr-2 h-4 w-4" />
                                      Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-red-600 focus:text-red-700 cursor-pointer"
                                      onClick={() =>
                                        handleUpdateStatus(pay.id, "failed")
                                      }
                                    >
                                      <XCircle className="mr-2 h-4 w-4" />
                                      Reject
                                    </DropdownMenuItem>
                                  </>
                                ) : (
                                  <DropdownMenuItem disabled>
                                    No actions available
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Component */}
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
