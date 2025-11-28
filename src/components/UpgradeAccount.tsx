"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, Zap } from "lucide-react";
import { useUser } from "@/contexts/UserContext";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount
  );

export function UpgradeAccount() {
  const { user, fetchUserData } = useUser();
  const [loading, setLoading] = useState(false);
  const [fees, setFees] = useState({ verify: 0, dealer: 0 });

  // Fetch fees from settings API
  useEffect(() => {
    const getFees = async () => {
      try {
        const res = await fetch("/api/admin/settings");
        const data = await res.json();
        const settings = data.settings || [];

        const vFee =
          settings.find((s: any) => s.key === "verification_fee")?.value ||
          "50000";
        const dFee =
          settings.find((s: any) => s.key === "dealer_subscription")?.value ||
          "200000";

        setFees({
          verify: parseInt(vFee.toString().replace(/\D/g, "")),
          dealer: parseInt(dFee.toString().replace(/\D/g, "")),
        });
      } catch (e) {
        console.error(e);
      }
    };
    getFees();
  }, []);

  const handleUpgrade = async (type: "verify" | "dealer") => {
    const fee = type === "verify" ? fees.verify : fees.dealer;
    const label = type === "verify" ? "account verification" : "Dealer upgrade";

    if (!confirm(`Do you want to pay ${formatCurrency(fee)} for ${label}?`))
      return;

    setLoading(true);
    try {
      const res = await fetch("/api/profile/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      alert("Success! " + data.message);
      await fetchUserData();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* VERIFY CARD */}
      <Card
        className={`border-2 ${
          user.is_verified ? "border-green-200 bg-green-50" : "border-muted"
        }`}
      >
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck
                className={
                  user.is_verified ? "text-green-600" : "text-gray-500"
                }
              />
              Account Verification
            </CardTitle>
            {user.is_verified && (
              <Badge className="bg-green-600">Activated</Badge>
            )}
          </div>
          <CardDescription>
            Get a Verified badge (blue check) to increase trust in transactions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!user.is_verified && (
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(fees.verify)}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                / one-time
              </span>
            </div>
          )}
        </CardContent>
        <CardFooter>
          {user.is_verified ? (
            <Button
              disabled
              className="w-full bg-green-600 text-white opacity-90"
            >
              Verified
            </Button>
          ) : (
            <Button
              onClick={() => handleUpgrade("verify")}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="animate-spin mr-2" />
              ) : (
                "Apply Now"
              )}
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* DEALER CARD */}
      <Card
        className={`border-2 ${
          user.role === "dealer"
            ? "border-purple-200 bg-purple-50"
            : "border-muted"
        }`}
      >
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap
                className={
                  user.role === "dealer" ? "text-purple-600" : "text-gray-500"
                }
              />
              Dealer Upgrade
            </CardTitle>
            {user.role === "dealer" && (
              <Badge className="bg-purple-600">Active</Badge>
            )}
          </div>
          <CardDescription>
            Unlock advanced selling features and enjoy lower platform fees.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user.role !== "dealer" && user.role !== "admin" && (
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(fees.dealer)}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                / joining fee
              </span>
            </div>
          )}
          {user.role === "admin" && (
            <p className="text-sm text-red-500">You are an Admin.</p>
          )}
        </CardContent>
        <CardFooter>
          {user.role === "dealer" || user.role === "admin" ? (
            <Button
              disabled
              className="w-full bg-purple-600 text-white opacity-90"
            >
              Dealer Enabled
            </Button>
          ) : (
            <Button
              variant="default"
              onClick={() => handleUpgrade("dealer")}
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {loading ? (
                <Loader2 className="animate-spin mr-2" />
              ) : (
                "Upgrade to Dealer"
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
