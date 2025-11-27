// src/app/admin/payments/page.tsx
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
import { Input } from "@/components/ui/input"; // Import Input
import {
  Loader2,
  ArrowDownCircle,
  ArrowUpCircle,
  ShoppingBag,
  CreditCard,
  Search, // Import Search Icon
} from "lucide-react";
import { PaymentStatus, PaymentForType } from "@prisma/client";

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
  withdrawal_info?: {
    bankName: string;
    accountNo: string;
    accountName: string;
  };
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
    type === "verification_fee"
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
      label: "Inflow", // Tiếng Anh
    };
  }
  if (type === "withdrawal") {
    return { icon: ArrowUpCircle, color: "text-red-600", label: "Withdrawal" };
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

  // State cho Search
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

        const res = await fetch(`/api/admin/payments?${params.toString()}`);
        const data = await res.json();
        setPayments(data.payments || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
        setIsSearching(false);
      }
    },
    [currentTab]
  );

  // 1. Initial Load & Tab Change
  useEffect(() => {
    fetchData(search, true);
  }, [currentTab]); // Khi đổi tab thì fetch lại

  // 2. Debounced Search
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchData(search, false);
    }, 500);
    return () => clearTimeout(timeout);
  }, [search]); // Khi search đổi thì fetch lại (giữ nguyên tab)

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

          {/* Search Bar */}
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
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
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
                            <TypeIcon className={`h-3 w-3 ${typeInfo.color}`} />
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
                                : "secondary"
                            }
                            className="capitalize"
                          >
                            {pay.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {new Date(pay.created_at).toLocaleString("en-GB")}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
