// src/app/wallet/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCcw,
  QrCode,
  ShoppingBag,
} from "lucide-react";
import { PaymentStatus, PaymentForType } from "@prisma/client";

interface SystemBankInfo {
  bankId: string;
  accountNo: string;
  accountName: string;
  template: string;
}

interface PaymentHistory {
  id: string;
  amount: number;
  payment_for_type: PaymentForType;
  status: PaymentStatus;
  created_at: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount
  );

// Helper to determine if transaction is a deduction
const isNegativeTransaction = (type: string) => {
  return (
    type === "withdrawal" ||
    type === "group_buy_order" ||
    type.includes("fee") ||
    type === "auction_bid_fee" ||
    type === "transaction_commission" ||
    type === "dealer_subscription" || // Dealer subscription is a deduction
    type === "verification_fee" // Account verification fee is a deduction
  );
};

// Helper to get transaction label
const getPaymentLabel = (type: string) => {
  switch (type) {
    case "deposit":
      return "Deposit";
    case "withdrawal":
      return "Withdrawal";
    case "group_buy_order":
      return "Group Buy Deposit";
    case "group_buy_refund":
      return "Group Buy Refund";
    case "group_buy_payout":
      return "Group Buy Revenue";
    case "auction_creation_fee":
      return "Auction Creation Fee";
    case "auction_bid_fee":
      return "Auction Participation Fee";
    case "transaction_commission":
      return "Platform Commission Fee";
    case "dealer_subscription":
      return "Dealer Subscription";
    case "verification_fee":
      return "Account Verification Fee";
    default:
      return type.replace(/_/g, " ");
  }
};

export default function WalletPage() {
  const [balance, setBalance] = useState<number>(0);
  const [history, setHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemBankInfo, setSystemBankInfo] = useState<SystemBankInfo | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"deposit" | "withdrawal">(
    "deposit"
  );
  const [amountInput, setAmountInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [bankName, setBankName] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [accountName, setAccountName] = useState("");
  const [savedBankInfo, setSavedBankInfo] = useState<any>(null);

  const fetchWalletData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/wallet");
      if (!res.ok) throw new Error("Failed to fetch wallet");
      const data = await res.json();
      setBalance(data.balance);
      setHistory(data.history);
      setSavedBankInfo(data.bankInfo);
      if (data.systemBankInfo) {
        setSystemBankInfo(data.systemBankInfo);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const generateQR = () => {
    const amount = parseInt(amountInput.replace(/\D/g, ""), 10);
    if (!amount || amount < 10000) {
      alert("Minimum amount is 10,000₫");
      setQrCodeUrl(null);
      return;
    }
    if (!systemBankInfo) {
      alert("System bank account is not configured yet.");
      return;
    }
    const { bankId, accountNo, accountName, template } = systemBankInfo;
    const addInfo = `NAPTIEN W${Math.floor(Math.random() * 10000)}`;
    const url = `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${amount}&addInfo=${addInfo}&accountName=${encodeURIComponent(
      accountName
    )}`;
    setQrCodeUrl(url);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    const numVal = parseInt(val || "0");
    setAmountInput(new Intl.NumberFormat("vi-VN").format(numVal));
    if (qrCodeUrl) setQrCodeUrl(null);
  };

  const handleTransaction = async () => {
    const amount = parseInt(amountInput.replace(/\D/g, ""), 10);
    if (!amount || amount < 10000) {
      alert("Minimum amount is 10,000₫");
      return;
    }
    if (actionType === "withdrawal") {
      if (!bankName || !accountNo || !accountName) {
        alert("Please fill in all bank information.");
        return;
      }
    } else if (actionType === "deposit") {
      if (!qrCodeUrl) {
        alert('Please click "Generate QR Code" first.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: actionType,
          amount,
          bankInfo:
            actionType === "withdrawal"
              ? { bankName, accountNo, accountName }
              : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transaction failed.");

      alert(
        actionType === "deposit"
          ? "Top-up request created!"
          : "Withdrawal request submitted."
      );
      setDialogOpen(false);
      setAmountInput("");
      setQrCodeUrl(null);
      fetchWalletData();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDialog = (type: "deposit" | "withdrawal") => {
    setActionType(type);
    setAmountInput("");
    setQrCodeUrl(null);
    if (type === "withdrawal" && savedBankInfo) {
      setBankName(savedBankInfo.bankName || "");
      setAccountNo(savedBankInfo.accountNo || "");
      setAccountName(savedBankInfo.accountName || "");
    } else {
      setBankName("");
      setAccountNo("");
      setAccountName("");
    }
    setDialogOpen(true);
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-8">
      <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-none shadow-xl">
        <CardContent className="p-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <p className="text-slate-300 font-medium mb-1 flex items-center gap-2">
              <Wallet className="h-5 w-5" /> Available balance
            </p>
            {loading ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <h1 className="text-4xl font-bold tracking-tight">
                {formatCurrency(balance)}
              </h1>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => openDialog("deposit")}
              className="bg-green-600 hover:bg-green-700 text-white border-none font-semibold shadow-md"
              size="lg"
            >
              <ArrowDownCircle className="mr-2 h-5 w-5" /> Top up
            </Button>
            <Button
              onClick={() => openDialog("withdrawal")}
              variant="secondary"
              size="lg"
              className="font-semibold shadow-md"
            >
              <ArrowUpCircle className="mr-2 h-5 w-5" /> Withdraw
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Transaction history</CardTitle>
            <CardDescription>
              Track all changes to your wallet balance.
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchWalletData}>
            <RefreshCcw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 && !loading ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-12 text-muted-foreground"
                  >
                    No transactions yet.
                  </TableCell>
                </TableRow>
              ) : (
                history.map((item) => {
                  const isNegative = isNegativeTransaction(
                    item.payment_for_type
                  );
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {item.payment_for_type.includes("group_buy") ? (
                            <ShoppingBag className="h-4 w-4 text-orange-600" />
                          ) : null}
                          {getPaymentLabel(item.payment_for_type)}
                        </div>
                      </TableCell>
                      <TableCell
                        className={`font-mono font-bold ${
                          isNegative ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {isNegative ? "-" : "+"}
                        {formatCurrency(item.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status === "succeeded"
                              ? "default"
                              : item.status === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                          className={
                            item.status === "succeeded"
                              ? "bg-green-100 text-green-700 hover:bg-green-200 border-green-200"
                              : ""
                          }
                        >
                          {item.status === "succeeded"
                            ? "Succeeded"
                            : item.status === "pending"
                            ? "Pending"
                            : "Failed"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top-up / Withdraw Dialog (logic unchanged, text translated) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className={
            actionType === "deposit" && qrCodeUrl
              ? "sm:max-w-lg"
              : "sm:max-w-md"
          }
        >
          <DialogHeader>
            <DialogTitle>
              {actionType === "deposit"
                ? "Top up wallet"
                : "Withdraw to bank account"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "deposit"
                ? "Enter the amount, then click Generate QR Code."
                : "Enter the amount and your bank account information."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex gap-2 items-end">
              <div className="space-y-2 flex-1">
                <Label>Amount (VND)</Label>
                <Input
                  placeholder="e.g. 500.000"
                  value={amountInput}
                  onChange={handleAmountChange}
                  className="font-bold text-lg"
                  autoFocus
                />
              </div>
              {actionType === "deposit" && (
                <Button
                  onClick={generateQR}
                  type="button"
                  variant={qrCodeUrl ? "outline" : "default"}
                  className="mb-[2px]"
                >
                  <QrCode className="mr-2 h-4 w-4" />{" "}
                  {qrCodeUrl ? "Regenerate QR" : "Generate QR Code"}
                </Button>
              )}
            </div>
            {actionType === "deposit" && qrCodeUrl && systemBankInfo && (
              <div className="mt-4 border rounded-lg p-4 bg-muted/20 flex flex-col items-center animate-in fade-in zoom-in duration-300">
                <p className="text-sm font-medium mb-3 flex items-center gap-2 text-blue-600">
                  Scan the code to transfer
                </p>
                <div className="relative w-full aspect-square max-w-[280px] bg-white p-2 rounded-md shadow-sm">
                  <Image
                    src={qrCodeUrl}
                    alt="VietQR"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
                <div className="mt-4 w-full space-y-2 bg-white p-3 rounded border text-sm">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Bank:</span>
                    <span className="font-semibold">
                      {systemBankInfo.bankId}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">
                      Account number:
                    </span>
                    <span className="font-semibold">
                      {systemBankInfo.accountNo}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Account holder:
                    </span>
                    <span className="font-semibold">
                      {systemBankInfo.accountName}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 text-center bg-yellow-50 p-2 rounded border border-yellow-100 text-yellow-800">
                  ⚠️ Note: Please{" "}
                  <strong>keep the transfer description unchanged</strong> for
                  the fastest approval.
                </p>
              </div>
            )}
            {actionType === "withdrawal" && (
              <div className="space-y-4 border-t pt-4 mt-2">
                <div className="space-y-2">
                  <Label>Receiving bank</Label>
                  <Input
                    placeholder="e.g. MB Bank, Vietcombank..."
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account number</Label>
                  <Input
                    placeholder="Enter account number..."
                    value={accountNo}
                    onChange={(e) => setAccountNo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account holder name (UPPERCASE)</Label>
                  <Input
                    placeholder="NGUYEN VAN A"
                    value={accountName}
                    onChange={(e) =>
                      setAccountName(e.target.value.toUpperCase())
                    }
                  />
                </div>
                <div className="bg-yellow-50 p-3 rounded-md text-sm text-yellow-800 border border-yellow-200 flex items-start gap-2">
                  <span className="text-lg">ℹ️</span>
                  <span>
                    Note: Withdrawal fee is 0%. Processing time is 2–24 working
                    hours.
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleTransaction}
              disabled={
                isSubmitting || (actionType === "deposit" && !qrCodeUrl)
              }
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}{" "}
              {actionType === "deposit"
                ? "I have transferred"
                : "Submit request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
