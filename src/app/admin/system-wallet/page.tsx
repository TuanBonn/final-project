"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import {
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  DollarSign,
  Search,
} from "lucide-react";

interface SystemLog {
  id: string;
  amount: number;
  payment_for_type: string;
  status: string;
  created_at: string;
  user: { username: string; email: string } | null;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val
  );

const getLogTypeStyle = (type: string) => {
  if (
    [
      "transaction_commission",
      "auction_bid_fee",
      "auction_creation_fee",
      "dealer_subscription",
      "verification_fee",
    ].includes(type)
  ) {
    return {
      label: "Revenue (Fee)",
      color: "text-green-600 bg-green-50",
      icon: DollarSign,
    };
  }

  if (type === "deposit" || type === "group_buy_order") {
    return {
      label: "Inflow (Deposit/Hold)",
      color: "text-blue-600 bg-blue-50",
      icon: ArrowDownLeft,
    };
  }

  if (
    type === "withdrawal" ||
    type === "group_buy_refund" ||
    type === "auction_fee_refund"
  ) {
    return {
      label: "Outflow (Withdraw/Refund)",
      color: "text-red-600 bg-red-50",
      icon: ArrowUpRight,
    };
  }
  return { label: "Other", color: "text-gray-600", icon: Wallet };
};

export default function AdminSystemWalletPage() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [summary, setSummary] = useState({
    totalDeposits: 0,
    totalWithdrawals: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const fetchWallet = useCallback(
    async (searchTerm = "", isInitial = false) => {
      if (isInitial) setLoading(true);
      else setIsSearching(true);

      try {
        const params = new URLSearchParams();
        if (searchTerm) params.append("search", searchTerm);

        const res = await fetch(
          `/api/admin/system-wallet?${params.toString()}`
        );
        const data = await res.json();
        setLogs(data.logs || []);
        setSummary(data.summary || { totalDeposits: 0, totalWithdrawals: 0 });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
        setIsSearching(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchWallet("", true);
  }, [fetchWallet]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchWallet(search, false);
    }, 500);
    return () => clearTimeout(timeout);
  }, [search, fetchWallet]);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold">System Wallet & Cash Flow</h1>
          <p className="text-muted-foreground">
            Monitor system balance and transactions.
          </p>
        </div>
      </div>

      {/* Cards Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Inflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(summary.totalDeposits)}
            </div>
            <p className="text-xs text-muted-foreground">
              Deposits + Group Buy Holdings
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Outflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.totalWithdrawals)}
            </div>
            <p className="text-xs text-muted-foreground">
              Withdrawals + Refunds
            </p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800">
              Net Cash Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {formatCurrency(summary.totalDeposits - summary.totalWithdrawals)}
            </div>
            <p className="text-xs text-green-600">
              Current System Liability (In - Out)
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <CardTitle>Transaction Logs (Recent 50)</CardTitle>
              <CardDescription>
                Includes deposits, withdrawals, fees, and refunds.
              </CardDescription>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search user or email..."
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
                  <TableHead>Type</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description (System Code)</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-10 text-muted-foreground"
                    >
                      No transactions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => {
                    const style = getLogTypeStyle(log.payment_for_type);
                    const Icon = style.icon;
                    return (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div
                            className={`flex items-center gap-2 px-2 py-1 rounded-md w-fit text-xs font-medium ${style.color}`}
                          >
                            <Icon className="h-3 w-3" /> {style.label}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {log.user?.username || "Unknown"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {log.user?.email}
                          </div>
                        </TableCell>
                        <TableCell className="font-bold font-mono">
                          {formatCurrency(log.amount)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground uppercase">
                          {log.payment_for_type}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground text-right">
                          {new Date(log.created_at).toLocaleString("en-GB")}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
