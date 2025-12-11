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
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle, Search } from "lucide-react";
import { BrandActions } from "@/components/admin/BrandActions";

type BrandRow = {
  id: string;
  name: string;
  created_at: string;
};

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const fetchBrands = useCallback(
    async (searchTerm = "", isInitial = false) => {
      if (isInitial) setLoading(true);
      else setIsSearching(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (searchTerm) params.append("search", searchTerm);

        const response = await fetch(`/api/admin/brands?${params.toString()}`);
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `HTTP Error: ${response.status}`);
        }
        const data = await response.json();
        setBrands(data.brands || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unknown error.");
      } finally {
        setLoading(false);
        setIsSearching(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchBrands("", true);
  }, [fetchBrands]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchBrands(search, false);
    }, 500);
    return () => clearTimeout(timeout);
  }, [search, fetchBrands]);

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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle>Brand Management ({brands.length})</CardTitle>
            <CardDescription>
              Create, edit, and delete car brands.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Search Bar */}
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search brands..."
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

            {/* Nút Create nằm trong BrandActions */}
            <BrandActions onActionSuccess={() => fetchBrands(search, false)} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand Name</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center h-24 text-muted-foreground"
                  >
                    No brands found.
                  </TableCell>
                </TableRow>
              ) : (
                brands.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell className="font-medium">{brand.name}</TableCell>
                    <TableCell>
                      {new Date(brand.created_at).toLocaleDateString("en-GB")}
                    </TableCell>
                    <TableCell className="text-right">
                      <BrandActions
                        brand={brand}
                        onActionSuccess={() => fetchBrands(search, false)}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
